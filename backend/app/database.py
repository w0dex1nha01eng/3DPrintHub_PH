from uuid import uuid4
from copy import deepcopy

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker

from .models import Base, Catalog, SiteContent
from .schemas import Content

# 只在第一次建库时用，之后去管理端改。
DEFAULT_MATERIALS = [
    {"id": "PLA", "name": "PLA", "label": "日常模型", "price": 30, "description": "适合外观模型、课程作业、展示样件。", "color": "#a9caba", "tags": "成型稳定 · 表面细腻", "enabled": True},
    {"id": "PETG", "name": "PETG", "label": "实用零件", "price": 45, "description": "适合功能零件、支架和需要一定韧性的结构。", "color": "#bad0e2", "tags": "韧性较好 · 耐用", "enabled": True},
]
DEFAULT_COLORS = [
    {"id": key, "name": name, "hex": value, "enabled": True}
    for key, name, value in [
        ("white", "白色", "#eeeeea"), ("black", "黑色", "#363b3a"),
        ("gray", "灰色", "#a6b0b1"), ("green", "苔绿色", "#72a991"),
        ("blue", "雾蓝色", "#87b1ce"), ("yellow", "暖黄色", "#eccd76"),
    ]
]


def create_database(data_dir):
    data_dir.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{(data_dir / 'campus_print.db').as_posix()}",
        connect_args={"check_same_thread": False, "timeout": 15},
    )

    @event.listens_for(engine, "connect")
    def configure_sqlite(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA journal_mode=WAL")

    Base.metadata.create_all(engine)
    # 老数据库缺字段时补一下，不动已有订单。
    with engine.begin() as connection:
        if "deleted_at" not in {item["name"] for item in inspect(connection).get_columns("model_files")}:
            connection.execute(text("ALTER TABLE model_files ADD COLUMN deleted_at VARCHAR(40)"))
    sessions = sessionmaker(engine, expire_on_commit=False)
    with sessions.begin() as session:
        record = session.get(Catalog, 1)
        fresh = record is None
        if fresh:
            record = Catalog(id=1, revision=1, materials=DEFAULT_MATERIALS, colors=DEFAULT_COLORS)
            session.add(record)
        if any("material_id" not in item for item in record.colors):
            variants = []
            for color in record.colors:
                if "material_id" in color:
                    variants.append(color)
                    continue
                for index, material in enumerate(record.materials):
                    variants.append({**color, "id": color["id"] if index == 0 else f"stock_{uuid4().hex}",
                                     "material_id": material["id"], "brand": "", "model": "", "color_code": "",
                                     "features": material.get("tags", ""), "price": material["price"]})
            record.colors = variants
            if not fresh:
                record.revision += 1
        content = session.get(SiteContent, 1)
        if content is None:
            session.add(SiteContent(id=1, data=Content().model_dump(by_alias=True)))
        else:
            updated = upgrade_format_copy(content.data)
            if updated != content.data:
                content.data = updated
                record.revision += 1
    return engine, sessions


def upgrade_format_copy(data):
    # 只换旧默认文案，管理员改过的内容不碰。
    updated = deepcopy(data)
    defaults = Content().model_dump(by_alias=True)
    if updated.get("contact", {}).get("name") == "3D打印接单平台":
        updated["contact"]["name"] = "PrintHub"
    if updated.get("copy", {}).get("home_intro") == "STL 模型 · 校内自取 · 人工确认报价":
        updated["copy"]["home_intro"] = defaults["copy"]["home_intro"]
    for item in updated.get("notices", []):
        if item.get("text") in (
            "每个 STL 模型按毫米导出，X/Y/Z 不超过 220 × 220 × 250 mm。模型应封闭、水密，无严重破面。",
            "支持 STL / 3MF。STL 按毫米解读，3MF 按文件单位换算；整个模型或装配的 X/Y/Z 不超过 220 × 220 × 250 mm。模型应封闭、水密，无严重破面。",
        ):
            item["text"] = defaults["notices"][0]["text"]
    for item in updated.get("questions", []):
        if item.get("answer") in (
            "请在建模或导出时使用毫米。STL 文件本身不保存单位，页面预览会把坐标按毫米解读。",
            "建议使用毫米。STL 不保存单位，本服务按毫米解读；3MF 会读取文件单位并换算为毫米，按装配后的整体尺寸检查。上传模型后仍由管理员确认并切片，不直接执行包内打印指令。",
        ):
            item["answer"] = defaults["questions"][0]["answer"]
    return updated
