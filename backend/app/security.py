import hashlib
import secrets

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from .models import AdminUser

basic = HTTPBasic(auto_error=False)


def token_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    # 密码只存加盐后的摘要。
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    salt, expected = encoded.split(":")
    actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
    return secrets.compare_digest(actual.hex(), expected)


def require_admin(request: Request, credentials: HTTPBasicCredentials | None = Depends(basic)):
    if credentials is None or len(credentials.password) > 256:
        raise HTTPException(401, "请先登录管理员账号。")
    with request.app.state.sessions() as session:
        admin = session.get(AdminUser, credentials.username)
        if admin is None or not verify_password(credentials.password, admin.password_hash):
            raise HTTPException(401, "管理员账号或密码错误。")
    return credentials.username
