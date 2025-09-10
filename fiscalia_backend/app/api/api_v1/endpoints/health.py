"""
Health check endpoints for FiscalIA Pro API.
"""
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
import structlog

from app.core.config import settings
from app.core.timezone import now_paris, get_application_current_date, format_paris_datetime

logger = structlog.get_logger()

router = APIRouter()


@router.get("/", summary="Basic health check")
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint.
    
    Returns basic application information and status.
    """
    current_time = now_paris()
    app_date = get_application_current_date()
    
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": current_time.isoformat(),
        "timestamp_paris": format_paris_datetime(current_time, "%d/%m/%Y %H:%M:%S"),
        "application_date": app_date.strftime("%d/%m/%Y"),
        "application_date_iso": app_date.isoformat(),
        "timezone": "Europe/Paris",
        "environment": "development" if settings.DEBUG else "production",
    }


@router.get("/detailed", summary="Detailed health check")
async def detailed_health_check() -> Dict[str, Any]:
    """
    Detailed health check with external dependencies.
    
    Checks database connection, Redis, and other services.
    """
    health_status = {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "environment": "development" if settings.DEBUG else "production",
        "checks": {
            "database": {"status": "unknown", "message": "Not implemented yet"},
            "redis": {"status": "unknown", "message": "Not implemented yet"},
            "external_apis": {"status": "unknown", "message": "Not implemented yet"},
        }
    }
    
    # For now, we'll return a basic response
    # TODO: Implement actual database and Redis health checks when DB is set up
    
    try:
        # Database check would go here
        health_status["checks"]["database"] = {
            "status": "pending", 
            "message": "Database connection not yet configured"
        }
        
        # Redis check would go here
        health_status["checks"]["redis"] = {
            "status": "pending", 
            "message": "Redis connection not yet configured"
        }
        
        # External APIs check would go here
        health_status["checks"]["external_apis"] = {
            "status": "pending", 
            "message": "External API checks not yet implemented"
        }
        
        logger.info("Health check completed successfully")
        
        return health_status
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        health_status["status"] = "unhealthy"
        raise HTTPException(status_code=503, detail="Service unhealthy")


@router.get("/ready", summary="Readiness probe")
async def readiness_probe() -> Dict[str, str]:
    """
    Kubernetes readiness probe endpoint.
    
    Returns 200 if the service is ready to accept traffic.
    """
    # For now, always ready since we don't have dependencies set up yet
    return {"status": "ready"}


@router.get("/live", summary="Liveness probe")
async def liveness_probe() -> Dict[str, str]:
    """
    Kubernetes liveness probe endpoint.
    
    Returns 200 if the service is alive and should not be restarted.
    """
    return {"status": "alive"} 