"""
Rate limiting configuration and middleware.
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from app.core.config import settings

# Create limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"]
)

# Custom rate limit configurations for different endpoints
rate_limit_configs = {
    # Authentication endpoints - more restrictive
    "auth_login": "5/minute",
    "auth_register": "3/minute",
    "password_reset": "3/hour",
    
    # Tax calculations - moderate limits
    "tax_calculate": "30/minute",
    "tax_optimize": "10/minute",
    
    # Document operations - based on file operations
    "document_upload": "20/minute",
    "document_process": "10/minute",
    
    # General API calls
    "default": f"{settings.RATE_LIMIT_PER_MINUTE}/minute",
}


def get_rate_limit_key(request: Request) -> str:
    """
    Get rate limit key based on user authentication.
    """
    # Try to get user from request state (set by auth middleware)
    if hasattr(request.state, 'user_id'):
        return f"user_{request.state.user_id}"
    
    # Fall back to IP address
    return get_remote_address(request)


# Create custom limiter for authenticated users
auth_limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["200/minute"]  # Higher limit for authenticated users
)