from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import update

from .config import PRINT_VOLUME_MM
from .models import Catalog, SiteContent
from .schemas import CatalogUpdate
from .security import require_admin

router = APIRouter(prefix="/api")


def catalog_data(record, settings, content, public=False):
    materials = [item for item in record.materials if not public or item["enabled"]]
    visible_ids = {item["id"] for item in materials}
    return {
        "revision": record.revision,
        "materials": materials,
        "colors": [item for item in record.colors if not public or (item["enabled"] and item["material_id"] in visible_ids)],
        "content": content.data,
        "limits": {"max_file_size": settings.max_file_size, "max_files": settings.max_files,
                   "printer": "Creality K1C", "dimensions_mm": list(PRINT_VOLUME_MM)},
    }


@router.get("/catalog")
def public_catalog(request: Request):
    with request.app.state.sessions() as session:
        return {"code": 0, "data": catalog_data(session.get(Catalog, 1), request.app.state.settings, session.get(SiteContent, 1), public=True)}


@router.get("/admin/catalog", dependencies=[Depends(require_admin)])
def admin_catalog(request: Request):
    with request.app.state.sessions() as session:
        return {"code": 0, "data": catalog_data(session.get(Catalog, 1), request.app.state.settings, session.get(SiteContent, 1))}


@router.put("/admin/catalog", dependencies=[Depends(require_admin)])
def save_catalog(payload: CatalogUpdate, request: Request):
    with request.app.state.sessions.begin() as session:
        result = session.execute(update(Catalog).where(Catalog.id == 1, Catalog.revision == payload.revision).values(
            revision=payload.revision + 1,
            materials=[item.model_dump() for item in payload.materials],
            colors=[item.model_dump() for item in payload.colors],
        ))
        if result.rowcount != 1:
            raise HTTPException(409, "配置已被其他页面修改，请重新加载后再保存。")
        content = session.get(SiteContent, 1)
        content.data = payload.content.model_dump(by_alias=True)
        return {"code": 0, "data": catalog_data(session.get(Catalog, 1), request.app.state.settings, content)}
