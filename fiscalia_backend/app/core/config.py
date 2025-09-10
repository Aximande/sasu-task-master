"""
Configuration settings for FiscalIA Pro Backend.
"""
import secrets
from typing import Any, Dict, List, Optional, Union
from pydantic import validator
from pydantic_settings import BaseSettings
from sqlalchemy import URL


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "FiscalIA Pro"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Assistant fiscal intelligent pour entrepreneurs SASU"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ALGORITHM: str = "HS256"
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000"

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return []

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "fiscalia"
    POSTGRES_PASSWORD: str = "fiscalia_password"
    POSTGRES_DB: str = "fiscalia_db"
    POSTGRES_PORT: str = "5432"
    
    DATABASE_URL: Optional[str] = None

    @validator("DATABASE_URL", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return URL.create(
            drivername="postgresql",
            username=values.get("POSTGRES_USER"),
            password=values.get("POSTGRES_PASSWORD"),
            host=values.get("POSTGRES_SERVER"),
            port=values.get("POSTGRES_PORT"),
            database=values.get("POSTGRES_DB"),
        ).render_as_string(hide_password=False)

    # Redis (for caching)
    REDIS_URL: str = "redis://localhost:6379"
    
    # External APIs
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    PERPLEXITY_API_KEY: Optional[str] = None
    
    # Qonto Integration
    QONTO_SHEETS_ID: Optional[str] = None
    GOOGLE_SERVICE_ACCOUNT_KEY: Optional[str] = None
    
    # URSSAF API (for real-time social charges)
    URSSAF_API_KEY: Optional[str] = None
    URSSAF_API_URL: str = "https://api.urssaf.fr"
    
    # Email settings
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None

    @validator("EMAILS_FROM_NAME")
    def get_project_name(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        if not v:
            return values["PROJECT_NAME"]
        return v

    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    
    # Tax calculation settings
    TAX_YEAR: int = 2024
    SMIC_HOURLY: float = 11.52  # SMIC horaire 2024
    PASS_ANNUAL: float = 43992.0  # Plafond annuel sécurité sociale 2024
    
    # Development settings
    DEBUG: bool = False
    TESTING: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings() 