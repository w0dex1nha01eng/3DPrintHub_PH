import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import func, or_, select, text

from .models import Catalog, ModelFile, Order
from .schemas import NewOrder, StatusUpdate
from .security import require_admin, token_hash

router = APIRouter(prefix="/api")


def order_data(record, session, detail=True):
    data = {key: getattr(record, key) for key in [
        "id", "order_no", "customer_name", "campus_id", "contact", "material", "color",
        "quantity", "note", "status", "final_price", "created_at", "catalog_snapshot",
    ]}
    if detail:
        files = session.scalars(select(ModelFile).where(ModelFile.order_id == record.id)).all()
        data["files"] = [{"id": item.id, "original_name": item.original_name, "file_size": item.file_size,
                          "dimensions_mm": item.dimensions_mm, "review_required": item.dimensions_mm is None,
                          "deleted_at": item.deleted_at} for item in files]
    return data


@router.post("/orders")
def create_order(payload: NewOrder, request: Request):
    if len(payload.file_bindings) > request.app.state.settings.max_files:
        raise HTTPException(422, "订单中的模型文件数量超过上限。")
    ids = [binding.file_id for binding in payload.file_bindings]
    if len(set(ids)) != len(ids):
        raise HTTPException(422, "不能重复绑定同一个文件。")
    now = datetime.now(timezone.utc)
    with request.app.state.sessions() as session:
        # 先拿写锁，别让两个订单抢同一份上传。
        session.execute(text("BEGIN IMMEDIATE"))
        catalog = session.get(Catalog, 1)
        material = next((item for item in catalog.materials if item["id"] == payload.material and item["enabled"]), None)
        color = next((item for item in catalog.colors if item["id"] == payload.color and item["enabled"]), None)
        if material is None or color is None or color["material_id"] != material["id"]:
            raise HTTPException(409, "所选耗材或颜色已停用，请刷新配置后重新选择。")
        files = []
        for binding in payload.file_bindings:
            item = session.get(ModelFile, binding.file_id)
            if (item is None or item.deleted_at is not None or item.order_id is not None
                or datetime.fromisoformat(item.upload_expires_at) <= now
                or not secrets.compare_digest(item.upload_token_hash, token_hash(binding.upload_token))):
                raise HTTPException(403, "上传凭证无效、已过期或已用于其他订单。")
            files.append(item)
        token = secrets.token_urlsafe(32)
        record = Order(order_no=f"3DP-{now:%Y%m%d}-{secrets.token_hex(5).upper()}", query_token_hash=token_hash(token),
                       catalog_snapshot={"material": {**material, "price": color["price"]}, "color": color, "revision": catalog.revision},
                       created_at=now.isoformat(), **payload.model_dump(exclude={"file_bindings"}))
        session.add(record)
        session.flush()
        for item in files:
            item.order_id = record.id
        session.commit()
        return {"code": 0, "data": {"order_no": record.order_no, "query_token": token}}


@router.get("/orders/{order_no}")
def lookup(order_no: str, request: Request, token: str = Header(default="", alias="X-Order-Token")):
    with request.app.state.sessions() as session:
        record = session.scalar(select(Order).where(Order.order_no == order_no))
        if record is None or not secrets.compare_digest(record.query_token_hash, token_hash(token)):
            raise HTTPException(404, "订单编号或查询凭证不正确。")
        # 查询页不返回联系方式。
        data = order_data(record, session)
        for key in ["customer_name", "campus_id", "contact", "note"]:
            data.pop(key, None)
        return {"code": 0, "data": data}


@router.get("/admin/orders", dependencies=[Depends(require_admin)])
def admin_orders(request: Request, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
                 status: str = "", q: str = Query("", max_length=128)):
    filters = []
    if status:
        filters.append(Order.status == status)
    if q:
        filters.append(or_(*(column.contains(q, autoescape=True) for column in [Order.order_no, Order.customer_name, Order.contact])))
    with request.app.state.sessions() as session:
        total = session.scalar(select(func.count()).select_from(Order).where(*filters))
        rows = session.scalars(select(Order).where(*filters).order_by(Order.id.desc()).offset((page - 1) * page_size).limit(page_size))
        return {"code": 0, "data": {"items": [order_data(row, session, detail=False) for row in rows], "total": total}}


@router.get("/admin/orders/{order_id}", dependencies=[Depends(require_admin)])
def admin_order(order_id: int, request: Request):
    with request.app.state.sessions() as session:
        record = session.get(Order, order_id)
        if record is None:
            raise HTTPException(404, "未找到订单。")
        return {"code": 0, "data": order_data(record, session)}


@router.put("/admin/orders/{order_id}/status", dependencies=[Depends(require_admin)])
def update_status(order_id: int, payload: StatusUpdate, request: Request):
    with request.app.state.sessions.begin() as session:
        record = session.get(Order, order_id)
        if record is None:
            raise HTTPException(404, "未找到订单。")
        record.status = payload.status
        return {"code": 0, "data": {"status": record.status}}
