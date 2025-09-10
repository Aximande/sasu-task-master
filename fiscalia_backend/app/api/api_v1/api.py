"""
Main API router for v1 endpoints.
"""
from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    health,
    auth,
    users,
    companies,
    tax,
    documents,
    dashboard,
    qonto
)


api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(tax.router, prefix="/tax", tags=["tax"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(qonto.router, prefix="/qonto", tags=["qonto"]) 