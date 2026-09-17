import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select, text
from starlette.concurrency import run_in_threadpool

from .models import ModelFile, Order
from .security import require_admin, token_hash
from .stl import inspect_stl
from .three_mf import can_queue_for_manual_3mf_review, inspect_3mf

router = APIRouter(prefix="/api")


@router.post("/files/upload")
async def upload(file: UploadFile, request: Request):
    settings = request.app.state.settings
    # 原文件名只拿来显示，磁盘上用随机名。
    name = Path((file.filename or "").replace("\\", "/")).name
    extension = Path(name).suffix.lower()
    if extension not in (".stl", ".3mf") or len(name) > 255:
        raise HTTPException(422, "只接收文件名不超过 255 字符的 .stl 或 .3mf 文件。")
    storage_name = f"{uuid4().hex}{extension}"
    folder = settings.data_dir / "uploads"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / storage_name
    saved = False
    try:
        total = 0
        with path.open("xb") as destination:
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > settings.max_file_size:
                    raise HTTPException(413, "文件超过单文件大小上限。")
                await run_in_threadpool(destination.write, chunk)
        if total == 0:
            raise HTTPException(422, "模型文件为空。")
        # 浏览器算的尺寸不能直接信，后端自己再读一遍。
        review_required = False
        try:
            dimensions = await run_in_threadpool(inspect_3mf if extension == ".3mf" else inspect_stl, path)
        except HTTPException as error:
            if extension != ".3mf" or error.status_code != 422 or not await run_in_threadpool(can_queue_for_manual_3mf_review, path, error):
                raise
            dimensions = None
            review_required = True
        token = secrets.token_urlsafe(32)
        expiry = (datetime.now(timezone.utc) + timedelta(hours=settings.upload_ttl_hours)).isoformat()
        with request.app.state.sessions.begin() as session:
            record = ModelFile(original_name=name, storage_name=storage_name, file_size=total,
                               dimensions_mm=dimensions, upload_token_hash=token_hash(token), upload_expires_at=expiry)
            session.add(record)
            session.flush()
            response = {"id": record.id, "upload_token": token, "upload_expires_at": expiry,
                        "dimensions_mm": dimensions, "review_required": review_required}
        saved = True
        return {"code": 0, "data": response}
    finally:
        await file.close()
        if not saved:
            path.unlink(missing_ok=True)


@router.get("/admin/files/{file_id}/download", dependencies=[Depends(require_admin)])
def download(file_id: int, request: Request):
    with request.app.state.sessions() as session:
        record = session.get(ModelFile, file_id)
        if record is None or record.deleted_at is not None:
            raise HTTPException(404, "未找到模型，或模型已被删除。")
        path = request.app.state.settings.data_dir / "uploads" / record.storage_name
        if not path.is_file():
            raise HTTPException(404, "模型文件不存在。")
        return FileResponse(path, media_type="application/octet-stream", filename=record.original_name)


@router.get("/admin/files", dependencies=[Depends(require_admin)])
def list_files(request: Request, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
               q: str = Query("", max_length=128), status: Literal["active", "deleted", "unbound", "all"] = "active"):
    filters = []
    if status in ("active", "unbound"):
        filters.append(ModelFile.deleted_at.is_(None))
    if status == "deleted":
        filters.append(ModelFile.deleted_at.is_not(None))
    if status == "unbound":
        filters.append(ModelFile.order_id.is_(None))
    if q:
        filters.append(or_(ModelFile.original_name.contains(q, autoescape=True), Order.order_no.contains(q, autoescape=True)))
    with request.app.state.sessions() as session:
        total = session.scalar(select(func.count()).select_from(ModelFile).outerjoin(Order).where(*filters))
        rows = session.execute(select(ModelFile, Order.order_no).outerjoin(Order).where(*filters)
                               .order_by(ModelFile.id.desc()).offset((page - 1) * page_size).limit(page_size))
        items = [{"id": item.id, "original_name": item.original_name, "file_size": item.file_size,
                  "dimensions_mm": item.dimensions_mm, "order_id": item.order_id, "order_no": order_no,
                  "review_required": item.dimensions_mm is None, "deleted_at": item.deleted_at} for item, order_no in rows]
        return {"code": 0, "data": {"items": items, "total": total}}


@router.delete("/admin/files/{file_id}", dependencies=[Depends(require_admin)])
def delete_file(file_id: int, request: Request):
    with request.app.state.sessions() as session:
        # 删除和下单共用一把写锁，免得同时动同一个文件。
        session.execute(text("BEGIN IMMEDIATE"))
        record = session.get(ModelFile, file_id)
        if record is None:
            raise HTTPException(404, "未找到模型。")
        path = request.app.state.settings.data_dir / "uploads" / record.storage_name
        try:
            # 文件本来就没了也可以补上删除标记。
            path.unlink(missing_ok=True)
        except OSError:
            raise HTTPException(503, "模型文件正在使用或无法删除，请稍后重试。") from None
        record.deleted_at = record.deleted_at or datetime.now(timezone.utc).isoformat()
        session.commit()
        return {"code": 0, "data": {"id": record.id, "deleted_at": record.deleted_at}}
