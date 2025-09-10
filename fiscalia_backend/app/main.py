"""
Main FastAPI application for FiscalIA Pro.
"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import time
import uuid

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.core.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler


# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests with timing and request ID."""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Log request
        logger.info(
            "Request started",
            method=request.method,
            url=str(request.url),
            request_id=request_id,
            client_ip=request.client.host if request.client else None,
        )
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                "Request completed",
                method=request.method,
                url=str(request.url),
                request_id=request_id,
                status_code=response.status_code,
                process_time=round(process_time, 4),
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                "Request failed",
                method=request.method,
                url=str(request.url),
                request_id=request_id,
                error=str(e),
                process_time=round(process_time, 4),
            )
            raise


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=settings.DESCRIPTION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
    )
    
    # Set up CORS
    if settings.BACKEND_CORS_ORIGINS:
        origins = [settings.BACKEND_CORS_ORIGINS] if isinstance(settings.BACKEND_CORS_ORIGINS, str) else settings.BACKEND_CORS_ORIGINS
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    # Add middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(RequestLoggingMiddleware)
    
    # Add rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    # Include routers
    app.include_router(api_router, prefix=settings.API_V1_STR)
    
    # Global exception handler
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        request_id = getattr(request.state, 'request_id', 'unknown')
        
        logger.error(
            "HTTP exception occurred",
            status_code=exc.status_code,
            detail=exc.detail,
            request_id=request_id,
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.status_code,
                    "message": exc.detail,
                    "request_id": request_id,
                }
            },
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, 'request_id', 'unknown')
        
        logger.error(
            "Unhandled exception occurred",
            error=str(exc),
            request_id=request_id,
        )
        
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": 500,
                    "message": "Internal server error",
                    "request_id": request_id,
                }
            },
        )
    
    return app


# Create the application instance
app = create_application()


@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    logger.info("FiscalIA Pro API starting up", version=settings.VERSION)


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    logger.info("FiscalIA Pro API shutting down") 