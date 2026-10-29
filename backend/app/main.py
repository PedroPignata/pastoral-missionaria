from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.calendar import router as calendar_router
from backend.app.api.v1.labs import router as labs_router
from backend.app.api.v1.community import router as community_router
from backend.app.api.v1.orders import router as orders_router

# Initialize database schema additively (creates new community tables if missing)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend oficial da Pastoral Missionária (Ágape Apostolado de Jovens — Paróquia São Vicente de Paulo)",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(calendar_router, prefix=settings.API_V1_STR)
app.include_router(labs_router, prefix=settings.API_V1_STR)
app.include_router(community_router, prefix=settings.API_V1_STR)
app.include_router(orders_router, prefix=settings.API_V1_STR)

@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "online",
        "engine": "FastAPI",
        "version": settings.VERSION,
        "time": datetime.utcnow().isoformat(),
        "pastoral": "Pastoral Missionária — Ágape Apostolado de Jovens",
        "parish": "Paróquia São Vicente de Paulo — Planaltina/DF",
        "patron": "São Padre Pio de Pietrelcina"
    }

@app.get("/")
def root():
    return {
        "message": "Pastoral Missionária API — Ágape Apostolado de Jovens",
        "docs": f"{settings.API_V1_STR}/docs"
    }
