import os
from pathlib import Path
from pydantic import BaseModel
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseModel):
    APP_NAME: str = "National Digital Platform for Land Governance (SIH26019)"
    VERSION: str = "1.0.0"
    APP_ENV: str = os.getenv("APP_ENV", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(BASE_DIR / "data" / "land_governance.db"))
    STORAGE_DIR: str = str(BASE_DIR / "data" / "storage")
    DEMO_MODE: bool = os.getenv("DEMO_DATA_MODE", "true").lower() == "true"
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://landgov.gov.in"
    ).split(",")

settings = Settings()

if not settings.SECRET_KEY:
    if settings.APP_ENV == "production":
        raise ValueError("SECRET_KEY environment variable is mandatory in production.")
    import secrets
    settings.SECRET_KEY = secrets.token_hex(32)

Path(settings.STORAGE_DIR).mkdir(parents=True, exist_ok=True)
