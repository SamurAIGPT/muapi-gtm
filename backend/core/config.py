import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = ROOT_DIR / "data"
OUTPUTS_DIR = DATA_DIR / "outputs"

DATA_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    APP_NAME: str = "Muapi-GTM"
    VERSION: str = "1.0.0"
    HOST: str = "127.0.0.1"
    PORT: int = 3960
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATA_DIR / 'muapi_gtm.db'}"

    # Muapi API configuration
    MUAPI_BASE_URL: str = os.getenv("MUAPI_BASE_URL", "https://api.muapi.ai")
    MUAPI_API_KEY: str = os.getenv("MUAPI_API_KEY", "")

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
