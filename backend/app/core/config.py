import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "Pastoral Missionária — API Ecossistema"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database: SQLite in local dev by default, PostgreSQL in production
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///data/pastoral_missionaria.sqlite"
    )
    
    # Security & Session
    SECRET_KEY: str = os.getenv("JWT_SECRET", "pastoral_missionaria_secure_secret_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "https://pastoral-missionaria.onrender.com",
    ]

settings = Settings()
