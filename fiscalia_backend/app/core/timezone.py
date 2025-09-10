"""
Timezone utilities for FiscalIA Pro.
Ensures all dates are consistently handled in Paris timezone.
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional

# Paris timezone constant
PARIS_TZ = ZoneInfo("Europe/Paris")

def now_paris() -> datetime:
    """
    Get current datetime in Paris timezone.
    
    Returns:
        Current datetime in Europe/Paris timezone
    """
    return datetime.now(PARIS_TZ)

def utc_to_paris(dt: datetime) -> datetime:
    """
    Convert UTC datetime to Paris timezone.
    
    Args:
        dt: UTC datetime (timezone-aware or naive)
        
    Returns:
        Datetime in Paris timezone
    """
    if dt.tzinfo is None:
        # Assume naive datetime is UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(PARIS_TZ)

def paris_to_utc(dt: datetime) -> datetime:
    """
    Convert Paris datetime to UTC.
    
    Args:
        dt: Paris datetime (timezone-aware or naive)
        
    Returns:
        Datetime in UTC
    """
    if dt.tzinfo is None:
        # Assume naive datetime is in Paris timezone
        dt = dt.replace(tzinfo=PARIS_TZ)
    return dt.astimezone(timezone.utc)

def format_paris_datetime(dt: Optional[datetime], format_str: str = "%d/%m/%Y %H:%M") -> str:
    """
    Format datetime in Paris timezone for display.
    
    Args:
        dt: Datetime to format
        format_str: Format string (default: French format)
        
    Returns:
        Formatted datetime string or empty string if None
    """
    if dt is None:
        return ""
    
    if dt.tzinfo is None:
        # Assume naive datetime is UTC and convert to Paris
        dt = dt.replace(tzinfo=timezone.utc).astimezone(PARIS_TZ)
    elif dt.tzinfo != PARIS_TZ:
        # Convert to Paris timezone
        dt = dt.astimezone(PARIS_TZ)
    
    return dt.strftime(format_str)

def get_current_fiscal_year() -> int:
    """
    Get current fiscal year based on Paris timezone.
    In France, fiscal year follows calendar year.
    
    Returns:
        Current fiscal year (YYYY)
    """
    return now_paris().year

def get_current_quarter() -> int:
    """
    Get current quarter based on Paris timezone.
    
    Returns:
        Current quarter (1-4)
    """
    month = now_paris().month
    return (month - 1) // 3 + 1

def is_business_hours() -> bool:
    """
    Check if current time is within business hours in Paris.
    Business hours: Monday-Friday, 9:00-18:00 Paris time
    
    Returns:
        True if within business hours
    """
    paris_now = now_paris()
    
    # Check if it's a weekday (Monday=0, Sunday=6)
    if paris_now.weekday() > 4:  # Saturday or Sunday
        return False
    
    # Check if within business hours (9:00-18:00)
    hour = paris_now.hour
    return 9 <= hour < 18

# Current date constants for the application
CURRENT_DATE = datetime(2025, 9, 10, tzinfo=PARIS_TZ)  # 10 septembre 2025
CURRENT_DATE_STR = "2025-09-10"
CURRENT_DATETIME_STR = "2025-09-10 12:00:00"  # Noon Paris time

def get_application_current_date() -> datetime:
    """
    Get the application's current date (10 septembre 2025).
    This ensures consistency across the application.
    
    Returns:
        Fixed current date for the application
    """
    return CURRENT_DATE

def get_application_current_date_str() -> str:
    """
    Get the application's current date as string.
    
    Returns:
        Current date string in YYYY-MM-DD format
    """
    return CURRENT_DATE_STR
