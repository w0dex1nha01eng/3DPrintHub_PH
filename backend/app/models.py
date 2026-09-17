from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Catalog(Base):
    __tablename__ = "catalog"
    id: Mapped[int] = mapped_column(primary_key=True)
    # 防止旧页面盖掉别人刚保存的配置。
    revision: Mapped[int] = mapped_column(default=1)
    materials: Mapped[list] = mapped_column(JSON)
    colors: Mapped[list] = mapped_column(JSON)


class AdminUser(Base):
    __tablename__ = "admin_users"
    username: Mapped[str] = mapped_column(String(128), primary_key=True)
    password_hash: Mapped[str] = mapped_column(Text)


class SiteContent(Base):
    __tablename__ = "site_content"
    id: Mapped[int] = mapped_column(primary_key=True)
    # 页面内容和耗材一起保存。
    data: Mapped[dict] = mapped_column(JSON)


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_no: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    query_token_hash: Mapped[str] = mapped_column(String(64))
    customer_name: Mapped[str] = mapped_column(String(64))
    campus_id: Mapped[str] = mapped_column(String(64), default="")
    contact: Mapped[str] = mapped_column(String(128))
    material: Mapped[str] = mapped_column(String(64))
    color: Mapped[str] = mapped_column(String(64))
    # 留住下单当时的名称、颜色和价格。
    catalog_snapshot: Mapped[dict] = mapped_column(JSON)
    quantity: Mapped[int] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="submitted", index=True)
    final_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[str] = mapped_column(String(40))


class ModelFile(Base):
    __tablename__ = "model_files"
    id: Mapped[int] = mapped_column(primary_key=True)
    original_name: Mapped[str] = mapped_column(String(255))
    storage_name: Mapped[str] = mapped_column(String(64), unique=True)
    file_size: Mapped[int] = mapped_column(Integer)
    dimensions_mm: Mapped[list | None] = mapped_column(JSON)
    upload_token_hash: Mapped[str] = mapped_column(String(64))
    upload_expires_at: Mapped[str] = mapped_column(String(40))
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), index=True)
    # 文件删了也留条记录，历史订单才看得懂。
    deleted_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
