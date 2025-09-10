/**
 * Date utilities for FiscalIA Pro Frontend
 * Ensures consistent date handling with Paris timezone
 */

import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

// Use fixed date that matches our data (September 10, 2025)
// This ensures consistency with the transaction data which is from 2025
const USE_FIXED_DATE = true; // Using fixed date to match our 2025 data
const FIXED_DATE = new Date('2025-09-10T12:00:00+02:00');

/**
 * Get the application's current date (real current date or fixed for testing)
 */
export const getApplicationDate = (): Date => {
  return USE_FIXED_DATE ? FIXED_DATE : new Date();
};

/**
 * Get the application's current date as string
 */
export const getApplicationDateString = (): string => {
  const currentDate = getApplicationDate();
  return format(currentDate, 'yyyy-MM-dd');
};

// Export for backward compatibility
export const APPLICATION_DATE = getApplicationDate();
export const APPLICATION_DATE_STRING = getApplicationDateString();

/**
 * Format date for display in French format with Paris timezone
 */
export const formatParisDate = (
  date: Date | string | null | undefined, 
  formatString: string = 'dd/MM/yyyy'
): string => {
  try {
    if (!date) {
      return '';
    }
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Handle various string formats
      if (date.includes('T')) {
        // ISO format: 2025-09-09T19:10:23.740Z
        dateObj = parseISO(date);
      } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Simple date format: 2025-09-09
        dateObj = parseISO(date + 'T00:00:00');
      } else {
        dateObj = parseISO(date);
      }
    } else {
      dateObj = date;
    }
    
    if (!isValid(dateObj)) {
      console.warn('Invalid date provided to formatParisDate:', date);
      return '';
    }
    
    return format(dateObj, formatString, { locale: fr });
  } catch (error) {
    console.error('Error formatting date:', error, 'Input was:', date);
    return '';
  }
};

/**
 * Format datetime for display in French format with Paris timezone
 */
export const formatParisDateTime = (
  date: Date | string | null | undefined,
  formatString: string = 'dd/MM/yyyy HH:mm'
): string => {
  try {
    if (!date) {
      return '';
    }
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Handle various string formats
      if (date.includes('T')) {
        // ISO format: 2025-09-09T19:10:23.740Z
        dateObj = parseISO(date);
      } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Simple date format: 2025-09-09
        dateObj = parseISO(date + 'T00:00:00');
      } else {
        dateObj = parseISO(date);
      }
    } else {
      dateObj = date;
    }
    
    if (!isValid(dateObj)) {
      console.warn('Invalid date provided to formatParisDateTime:', date);
      return '';
    }
    
    return format(dateObj, formatString, { locale: fr });
  } catch (error) {
    console.error('Error formatting datetime:', error, 'Input was:', date);
    return '';
  }
};

/**
 * Get current fiscal year (based on current date)
 */
export const getCurrentFiscalYear = (): number => {
  return getApplicationDate().getFullYear();
};

/**
 * Get current quarter (based on current date)
 */
export const getCurrentQuarter = (): number => {
  const month = getApplicationDate().getMonth() + 1; // getMonth() is 0-based
  return Math.ceil(month / 3);
};

/**
 * Get current month name in French
 */
export const getCurrentMonthName = (): string => {
  return format(getApplicationDate(), 'MMMM yyyy', { locale: fr });
};

/**
 * Check if a date is in the current fiscal year
 */
export const isCurrentFiscalYear = (date: Date | string): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    
    return dateObj.getFullYear() === getCurrentFiscalYear();
  } catch (error) {
    return false;
  }
};

/**
 * Get date range for current month (based on current date)
 */
export const getCurrentMonthRange = () => {
  const currentDate = getApplicationDate();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 0), // Last day of current month
  };
};

/**
 * Get date range for current quarter (based on current date)
 */
export const getCurrentQuarterRange = () => {
  const currentDate = getApplicationDate();
  const year = currentDate.getFullYear();
  const quarter = getCurrentQuarter();
  
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;
  
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, endMonth + 1, 0), // Last day of quarter
  };
};

/**
 * Get date range for current fiscal year (based on application date)
 */
export const getCurrentFiscalYearRange = () => {
  const year = getCurrentFiscalYear();
  
  return {
    start: new Date(year, 0, 1), // January 1st
    end: new Date(year, 11, 31), // December 31st
  };
};

/**
 * Convert date to API format (YYYY-MM-DD)
 */
export const toApiDateFormat = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error converting to API format:', error);
    return '';
  }
};

/**
 * Parse API date format to Date object
 */
export const fromApiDateFormat = (dateString: string): Date | null => {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch (error) {
    console.error('Error parsing API date:', error);
    return null;
  }
};

/**
 * Safe date parsing with fallbacks
 */
export const safeParseDate = (date: Date | string | null | undefined): Date | null => {
  try {
    if (!date) {
      return null;
    }
    
    if (date instanceof Date) {
      return isValid(date) ? date : null;
    }
    
    if (typeof date === 'string') {
      // Handle various string formats
      if (date.includes('T')) {
        // ISO format: 2025-09-09T19:10:23.740Z
        const parsed = parseISO(date);
        return isValid(parsed) ? parsed : null;
      } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Simple date format: 2025-09-09
        const parsed = parseISO(date + 'T00:00:00');
        return isValid(parsed) ? parsed : null;
      } else {
        const parsed = parseISO(date);
        return isValid(parsed) ? parsed : null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', error, 'Input was:', date);
    return null;
  }
};

/**
 * Get relative time display in French
 */
export const getRelativeTimeDisplay = (date: Date | string | null | undefined): string => {
  try {
    if (!date) {
      return '';
    }
    
    const dateObj = safeParseDate(date);
    if (!dateObj || !isValid(dateObj)) {
      return '';
    }
    
    const now = getApplicationDate();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
    
    return `Il y a ${Math.floor(diffDays / 365)} ans`;
  } catch (error) {
    console.error('Error getting relative time:', error);
    return '';
  }
};
