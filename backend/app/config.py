from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]

# K1C 的可打印范围，单位是 mm。改这里也要同步前端。
# https://www.creality.com/products/k1c-carbon-3d-printer
PRINT_VOLUME_MM = (220.0, 220.0, 250.0)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PRINT_", env_file=BACKEND_DIR / ".env", extra="ignore"
    )

    # 数据库、模型和初始凭据都在这里，别交给 Nginx。
    data_dir: Path = BACKEND_DIR / "data"
    # 文件大小和模型尺寸是两回事。
    max_file_size: int = Field(default=100 * 1024 * 1024, gt=0)
    max_files: int = Field(default=5, ge=1, le=20)
    # 上传后留多少小时给用户提交订单。
    upload_ttl_hours: int = Field(default=24, ge=1, le=168)


settings = Settings()
