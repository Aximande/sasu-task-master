/**
 * API configuration
 */

export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  API_VERSION: '/api/v1',
  TIMEOUT: 30000,
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  CHANGE_PASSWORD: '/auth/change-password',
  
  // Users
  USER_ME: '/users/me',
  USER_UPDATE: '/users/me',
  
  // Companies
  COMPANIES: '/companies',
  COMPANY_BY_ID: (id: number) => `/companies/${id}`,
  COMPANY_ACTIVATE: (id: number) => `/companies/${id}/activate`,
  COMPANY_DEACTIVATE: (id: number) => `/companies/${id}/deactivate`,
  
  // Tax
  TAX_CALCULATE: '/tax/calculate',
  TAX_OPTIMIZE: '/tax/optimize',
  TAX_SAVE: '/tax/save',
  TAX_HISTORY: '/tax',
  TAX_BY_ID: (id: number) => `/tax/${id}`,
  
  // Documents
  DOCUMENTS: '/documents',
  DOCUMENT_UPLOAD: '/documents/upload',
  DOCUMENT_BY_ID: (id: number) => `/documents/${id}`,
  DOCUMENT_PROCESS: (id: number) => `/documents/${id}/process`,
  DOCUMENT_VALIDATE: (id: number) => `/documents/${id}/validate`,
  DOCUMENT_SEARCH: '/documents/search',
  DOCUMENT_STATS: '/documents/statistics',
  
  // Dashboard
  DASHBOARD_OVERVIEW: '/dashboard/overview',
  DASHBOARD_TAX_TRENDS: '/dashboard/tax-trends',
  DASHBOARD_OPTIMIZATION: '/dashboard/optimization-opportunities',
  DASHBOARD_ACTIVITY: '/dashboard/activity-feed',
  DASHBOARD_QUICK_STATS: '/dashboard/quick-stats',
  
  // Qonto Integration
  QONTO_TRANSACTIONS: '/qonto/transactions',
  QONTO_CASH_FLOW: '/qonto/cash-flow',
  QONTO_EXPENSE_REPORT: '/qonto/expense-report',
  QONTO_ANOMALIES: '/qonto/anomalies',
  QONTO_PREDICTIONS: '/qonto/predictions',
  
  // Health
  HEALTH: '/health',
};