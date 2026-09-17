from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Identifier = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[A-Za-z0-9_-]{1,64}$")]
HexColor = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]


class Schema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Material(Schema):
    id: Identifier
    name: str = Field(min_length=1, max_length=32)
    label: str = Field(default="", max_length=32)
    # 后端用整数分，页面显示元。
    price: int = Field(strict=True, ge=0, le=100000)
    description: str = Field(default="", max_length=200)
    color: HexColor = "#a9caba"
    tags: str = Field(default="", max_length=64)
    enabled: bool = True

    @model_validator(mode="after")
    def reject_tpu(self):
        if "TPU" in self.id.upper() or "TPU" in self.name.upper():
            raise ValueError("本服务不提供 TPU 耗材。")
        return self


class Color(Schema):
    # colors 是旧名字，现在每条其实是一种具体耗材。
    id: Identifier
    material_id: Identifier
    name: str = Field(min_length=1, max_length=32)
    hex: HexColor
    brand: str = Field(default="", max_length=64)
    model: str = Field(default="", max_length=64)
    color_code: str = Field(default="", max_length=64)
    features: str = Field(default="", max_length=300)
    price: int = Field(strict=True, ge=0, le=100000)
    enabled: bool = True


class Contact(Schema):
    name: str = Field(default="PrintHub", min_length=1, max_length=64)
    location: str = Field(default="", max_length=200)
    hours: str = Field(default="", max_length=128)
    wechat: str = Field(default="", max_length=128)
    qq: str = Field(default="", max_length=32)
    email: str = Field(default="", max_length=128, pattern=r"^(?:[^\s@]+@[^\s@]+\.[^\s@]+)?$")
    phone: str = Field(default="", max_length=32, pattern=r"^[0-9+()\-\s]*$")


class PageCopy(Schema):
    home_title: str = Field(default="新建打印", min_length=1, max_length=40)
    home_intro: str = Field(default="STL / 3MF 模型 · 校内自取 · 人工确认报价", max_length=300)
    materials_intro: str = Field(default="从展示样件到实用零件，选择适合的材料。", max_length=300)
    pricing_note: str = Field(default="支撑、后处理与加急费用按模型情况另行确认。", max_length=500)
    pricing_details: str = Field(default="最终费用以切片后的实际耗材、支撑、打印时长与后处理需求为依据。模型审核后会联系你确认报价，确认后安排打印。", max_length=1000)
    guide_intro: str = Field(default="让模型顺利成为实物，需要确认这些细节。", max_length=300)
    contact_intro: str = Field(default="材料、模型或取件问题，都可以和我们沟通。", max_length=300)
    contact_note: str = Field(default="提交打印需求时请留下有效联系方式，我们将在模型审核后联系你。", max_length=500)


class Notice(Schema):
    title: str = Field(min_length=1, max_length=64)
    text: str = Field(min_length=1, max_length=1000)
    icon: Literal["box", "clock", "package"] = "box"


class Question(Schema):
    question: str = Field(min_length=1, max_length=128)
    answer: str = Field(min_length=1, max_length=1000)


class Content(Schema):
    contact: Contact = Field(default_factory=Contact)
    page_copy: PageCopy = Field(default_factory=PageCopy, alias="copy")
    notices: list[Notice] = Field(default_factory=lambda: [
        Notice(title="模型与尺寸", text="支持 STL / 3MF。标准模型会自动检查 X/Y/Z 是否不超过 220 × 220 × 250 mm；结构复杂的 3MF 可提交后由我们确认尺寸和可打印性。"),
        Notice(title="报价与排期", text="参考单价按克计费。实际耗材、支撑与打印时长经切片确认后，再沟通最终价格和交付时间。", icon="clock"),
        Notice(title="打印与取件", text="FDM 成品存在层纹，薄壁和悬垂结构会影响成型。打印完成后按约定地点校内自取。", icon="package"),
    ], max_length=20)
    questions: list[Question] = Field(default_factory=lambda: [
        Question(question="模型应该使用什么单位？", answer="建议使用毫米。STL 不保存单位，本服务按毫米解读；3MF 会读取文件单位并换算为毫米。若 3MF 结构过复杂无法自动读取，我们会在提交后人工确认。"),
        Question(question="上传文件后就会开始打印吗？", answer="提交订单后，我们会先检查模型并确认材料、颜色、报价和交付时间，与你达成一致后再安排打印。"),
        Question(question="哪些模型需要额外沟通？", answer="大尺寸、薄壁、精密配合、多悬垂或需要较多支撑的模型，请注明用途和公差需求。"),
        Question(question="能否加急或做后处理？", answer="请把期望取件时间、打磨或其他要求写在备注里。能否安排以及附加费用，以我们回复为准。"),
    ], max_length=30)


class CatalogUpdate(Schema):
    revision: int = Field(strict=True, ge=1)
    materials: list[Material] = Field(min_length=1, max_length=50)
    colors: list[Color] = Field(min_length=1, max_length=500)
    content: Content

    @model_validator(mode="after")
    def validate_options(self):
        for items in [self.materials, self.colors]:
            if len({item.id.casefold() for item in items}) != len(items):
                raise ValueError("配置标识不能重复。")
            if not any(item.enabled for item in items):
                raise ValueError("至少保留一种启用的耗材种类和具体耗材。")
        if len({item.name.casefold() for item in self.materials}) != len(self.materials):
            raise ValueError("耗材种类名称不能重复。")
        ids = {item.id for item in self.materials}
        for color in self.colors:
            if color.material_id not in ids:
                raise ValueError("具体耗材必须归属于存在的耗材种类。")
            if "TPU" in color.model.upper():
                raise ValueError("本服务不提供 TPU 耗材。")
        for material in self.materials:
            variants = [item for item in self.colors if item.material_id == material.id and item.enabled]
            if material.enabled and not variants:
                raise ValueError("每种启用的材料至少保留一条启用的具体耗材。")
            # 列表显示最低价，下单还是用具体耗材的价格。
            material.price = min((item.price for item in variants), default=material.price)
        return self


class FileBinding(Schema):
    file_id: int = Field(strict=True, gt=0)
    upload_token: str = Field(min_length=1, max_length=128)


class NewOrder(Schema):
    customer_name: str = Field(min_length=1, max_length=64)
    campus_id: str = Field(default="", max_length=64)
    contact: str = Field(min_length=3, max_length=128)
    material: Identifier
    color: Identifier
    quantity: int = Field(strict=True, ge=1, le=100)
    note: str = Field(default="", max_length=1000)
    file_bindings: list[FileBinding] = Field(min_length=1, max_length=20)


class StatusUpdate(Schema):
    status: Literal["submitted", "reviewing", "quoted", "printing", "finished", "picked_up", "cancelled"]
