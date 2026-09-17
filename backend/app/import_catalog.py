"""Import catalog and page content from another deployed print platform."""
from __future__ import annotations

import argparse
import base64
import json
import sqlite3
import sys
from datetime import datetime, timezone
from getpass import getpass
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from pydantic import ValidationError

from .config import PRINT_VOLUME_MM, settings
from .database import create_database
from .models import Catalog, SiteContent
from .schemas import CatalogUpdate


def catalog_endpoint(source: str, admin: bool = False) -> str:
    parsed = urlparse(source)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("来源地址必须包含 http:// 或 https://。")
    if parsed.path.rstrip("/").endswith(("/api/catalog", "/api/admin/catalog")):
        return source
    return urljoin(source.rstrip("/") + "/", "api/admin/catalog" if admin else "api/catalog")


def fetch_catalog(source: str, username: str = "", password: str = "", timeout: int = 15) -> dict:
    endpoint = catalog_endpoint(source, admin=bool(username))
    headers = {"Accept": "application/json"}
    if username:
        token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
        headers["Authorization"] = f"Basic {token}"
    request = Request(endpoint, headers=headers)
    try:
        with urlopen(request, timeout=timeout) as response:
            content_type = response.headers.get_content_type()
            body = response.read()
    except HTTPError as error:
        raise RuntimeError(f"读取 {endpoint} 失败：HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError(f"无法连接 {endpoint}：{error.reason}") from error
    if content_type != "application/json":
        preview = body[:80].decode("utf-8", errors="replace").replace("\n", " ")
        raise RuntimeError(f"读取 {endpoint} 得到的不是 JSON（{content_type}）：{preview}")
    try:
        envelope = json.loads(body)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"读取 {endpoint} 得到的 JSON 无法解析。") from error
    if not isinstance(envelope, dict) or envelope.get("code") != 0 or not isinstance(envelope.get("data"), dict):
        raise RuntimeError("来源接口返回格式不是 {code: 0, data: ...}。")
    return envelope["data"]


def validate_import(data: dict) -> CatalogUpdate:
    dimensions = data.get("limits", {}).get("dimensions_mm")
    if dimensions != list(PRINT_VOLUME_MM):
        raise ValueError(f"来源机型尺寸为 {dimensions}，当前代码要求 {list(PRINT_VOLUME_MM)}。")
    try:
        return CatalogUpdate(revision=1, materials=data["materials"], colors=data["colors"], content=data["content"])
    except KeyError as error:
        raise ValueError(f"来源目录缺少字段：{error.args[0]}") from error
    except ValidationError as error:
        raise ValueError(str(error)) from error


def backup_database(engine, data_dir: Path) -> Path | None:
    database = data_dir / "campus_print.db"
    if not database.exists():
        return None
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    backup = data_dir / f"before-catalog-import-{stamp}.db"
    raw = engine.raw_connection()
    try:
        source = raw.driver_connection if hasattr(raw, "driver_connection") else raw.connection
        with sqlite3.connect(backup) as target:
            source.backup(target)
    finally:
        raw.close()
    return backup


def import_catalog_data(data: dict, data_dir: Path) -> dict:
    payload = validate_import(data)
    engine, sessions = create_database(data_dir)
    try:
        backup = backup_database(engine, data_dir)
        with sessions.begin() as session:
            record = session.get(Catalog, 1)
            revision = (record.revision + 1) if record else 1
            values = {
                "revision": revision,
                "materials": [item.model_dump() for item in payload.materials],
                "colors": [item.model_dump() for item in payload.colors],
            }
            if record:
                record.revision = values["revision"]
                record.materials = values["materials"]
                record.colors = values["colors"]
            else:
                session.add(Catalog(id=1, **values))
            content = session.get(SiteContent, 1)
            content_data = payload.content.model_dump(by_alias=True)
            if content:
                content.data = content_data
            else:
                session.add(SiteContent(id=1, data=content_data))
        return {"backup": backup, "revision": revision, "materials": len(payload.materials), "colors": len(payload.colors),
                "notices": len(payload.content.notices), "questions": len(payload.content.questions)}
    finally:
        engine.dispose()


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import materials, contact info, notices and questions from another print platform.")
    parser.add_argument("source", help="Source site URL, for example http://127.0.0.1:18080/ or http://10.244.29.159:28080/")
    parser.add_argument("--admin-user", default="", help="Read /api/admin/catalog with HTTP Basic auth, including disabled options.")
    parser.add_argument("--password-env", default="", help="Environment variable containing the admin password.")
    parser.add_argument("--data-dir", type=Path, default=settings.data_dir, help="Target backend data directory.")
    parser.add_argument("--timeout", type=int, default=15, help="Network timeout in seconds.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    password = ""
    if args.admin_user:
        if args.password_env:
            import os
            password = os.environ.get(args.password_env, "")
        if not password:
            password = getpass(f"Password for {args.admin_user}: ")
    data = fetch_catalog(args.source, args.admin_user, password, args.timeout)
    result = import_catalog_data(data, args.data_dir)
    backup = result["backup"] or "none"
    print(f"Imported catalog revision {result['revision']}.")
    print(f"Materials: {result['materials']}; filaments: {result['colors']}; notices: {result['notices']}; questions: {result['questions']}.")
    print(f"Backup: {backup}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
