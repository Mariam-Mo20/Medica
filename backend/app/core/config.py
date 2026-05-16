from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Medica API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    APP_TIMEZONE: str = "Africa/Cairo"

    DATABASE_URL: str = "postgresql+asyncpg://postgres.varghgyjzqmtjbruknvg:Mariam30305200102363@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?ssl=require"
    DATABASE_URL_SYNC: str = "postgresql://postgres.varghgyjzqmtjbruknvg:Mariam30305200102363@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://frontend-neon-eta-yhbfdcoe8c.vercel.app",
    ]

    RESEND_API_KEY: str = ""
    FRONTEND_URL: str = "https://frontend-neon-eta-yhbfdcoe8c.vercel.app"

    DEFAULT_ADMIN_EMAIL: str = "admin@medica.com"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"

    class Config:
        env_file = ".env"


settings = Settings()
