"""首次运行：python -m app.bootstrap；重复运行不会修改已有账号和配置。"""
import secrets

from .config import settings
from .database import create_database
from .models import AdminUser
from .security import hash_password


def main():
    engine, sessions = create_database(settings.data_dir)
    with sessions.begin() as session:
        if session.get(AdminUser, "admin"):
            print("Admin already exists; no changes made.")
            return
        password = secrets.token_urlsafe(24)
        session.add(AdminUser(username="admin", password_hash=hash_password(password)))
        credentials = settings.data_dir / "admin-credentials.txt"
        with credentials.open("x", encoding="utf-8") as output:
            output.write(f"username: admin\npassword: {password}\n")
    engine.dispose()
    print(f"Admin initialized. Credentials: {credentials}")


if __name__ == "__main__":
    main()
