/**
 * API service for all HTTP requests
 */
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';

// Types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}`,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage
    this.token = localStorage.getItem('access_token');

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry && this.token) {
          originalRequest._retry = true;

          try {
            const response = await this.api.post(API_ENDPOINTS.REFRESH);
            const { access_token } = response.data;
            
            this.setToken(access_token);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }
            
            return this.api(originalRequest);
          } catch (refreshError) {
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error
      const data = error.response.data as any;
      return {
        message: data?.detail || data?.message || 'An error occurred',
        code: data?.code,
        status: error.response.status,
        details: data,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'No response from server',
        code: 'NETWORK_ERROR',
      };
    } else {
      // Error in request setup
      return {
        message: error.message || 'Request failed',
        code: 'REQUEST_ERROR',
      };
    }
  }

  // Token management
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await this.api.post(API_ENDPOINTS.LOGIN, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    const { access_token } = response.data;
    this.setToken(access_token);
    
    return response.data;
  }

  async register(data: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }) {
    return this.api.post(API_ENDPOINTS.REGISTER, data);
  }

  async logout() {
    try {
      await this.api.post(API_ENDPOINTS.LOGOUT);
    } finally {
      this.clearToken();
    }
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.api.post(API_ENDPOINTS.CHANGE_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // User endpoints
  async getCurrentUser() {
    return this.api.get(API_ENDPOINTS.USER_ME);
  }

  async updateCurrentUser(data: any) {
    return this.api.put(API_ENDPOINTS.USER_UPDATE, data);
  }

  // Company endpoints
  async getCompanies() {
    return this.api.get(API_ENDPOINTS.COMPANIES);
  }

  async getCompany(id: number) {
    return this.api.get(API_ENDPOINTS.COMPANY_BY_ID(id));
  }

  async createCompany(data: any) {
    return this.api.post(API_ENDPOINTS.COMPANIES, data);
  }

  async updateCompany(id: number, data: any) {
    return this.api.put(API_ENDPOINTS.COMPANY_BY_ID(id), data);
  }

  async deleteCompany(id: number) {
    return this.api.delete(API_ENDPOINTS.COMPANY_BY_ID(id));
  }

  async activateCompany(id: number) {
    return this.api.post(API_ENDPOINTS.COMPANY_ACTIVATE(id));
  }

  async deactivateCompany(id: number) {
    return this.api.post(API_ENDPOINTS.COMPANY_DEACTIVATE(id));
  }

  // Tax endpoints
  async calculateTax(data: {
    company_id?: number;
    gross_salary: number;
    dividends: number;
    revenue: number;
    expenses: number;
  }) {
    return this.api.post(API_ENDPOINTS.TAX_CALCULATE, data);
  }

  async optimizeTax(data: {
    company_id: number;
    target_net_income: number;
    revenue: number;
    expenses: number;
    min_salary?: number;
    max_salary?: number;
  }) {
    return this.api.post(API_ENDPOINTS.TAX_OPTIMIZE, data);
  }

  async saveTaxCalculation(data: any) {
    return this.api.post(API_ENDPOINTS.TAX_SAVE, data);
  }

  async getTaxHistory(companyId?: number) {
    const params = companyId ? { company_id: companyId } : {};
    return this.api.get(API_ENDPOINTS.TAX_HISTORY, { params });
  }

  async getTaxCalculation(id: number) {
    return this.api.get(API_ENDPOINTS.TAX_BY_ID(id));
  }

  // Document endpoints
  async uploadDocument(file: File, data: {
    company_id?: number;
    document_type: string;
    title: string;
    description?: string;
    auto_process?: boolean;
  }) {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach(key => {
      const value = (data as any)[key];
      if (value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    return this.api.post(API_ENDPOINTS.DOCUMENT_UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async getDocuments(params?: {
    company_id?: number;
    document_type?: string;
    status?: string;
  }) {
    return this.api.get(API_ENDPOINTS.DOCUMENTS, { params });
  }

  async getDocument(id: number) {
    return this.api.get(API_ENDPOINTS.DOCUMENT_BY_ID(id));
  }

  async processDocument(id: number) {
    return this.api.post(API_ENDPOINTS.DOCUMENT_PROCESS(id));
  }

  async validateDocument(id: number) {
    return this.api.post(API_ENDPOINTS.DOCUMENT_VALIDATE(id));
  }

  async searchDocuments(data: any) {
    return this.api.post(API_ENDPOINTS.DOCUMENT_SEARCH, data);
  }

  async getDocumentStats(companyId?: number) {
    const params = companyId ? { company_id: companyId } : {};
    return this.api.get(API_ENDPOINTS.DOCUMENT_STATS, { params });
  }

  async deleteDocument(id: number) {
    return this.api.delete(API_ENDPOINTS.DOCUMENT_BY_ID(id));
  }

  // Dashboard endpoints
  async getDashboardOverview(companyId?: number) {
    const params = companyId ? { company_id: companyId } : {};
    return this.api.get(API_ENDPOINTS.DASHBOARD_OVERVIEW, { params });
  }

  async getTaxTrends(companyId?: number, period: string = 'monthly') {
    const params = { period, ...(companyId && { company_id: companyId }) };
    return this.api.get(API_ENDPOINTS.DASHBOARD_TAX_TRENDS, { params });
  }

  async getOptimizationOpportunities(companyId: number) {
    return this.api.get(API_ENDPOINTS.DASHBOARD_OPTIMIZATION, {
      params: { company_id: companyId },
    });
  }

  async getActivityFeed(limit: number = 20) {
    return this.api.get(API_ENDPOINTS.DASHBOARD_ACTIVITY, {
      params: { limit },
    });
  }

  async getQuickStats() {
    return this.api.get(API_ENDPOINTS.DASHBOARD_QUICK_STATS);
  }

  // Qonto Integration endpoints
  async getQontoTransactions(params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }) {
    return this.api.get(API_ENDPOINTS.QONTO_TRANSACTIONS, { params });
  }

  async getQontoCashFlow(params?: {
    start_date?: string;
    end_date?: string;
  }) {
    return this.api.get(API_ENDPOINTS.QONTO_CASH_FLOW, { params });
  }

  async getQontoExpenseReport(params?: {
    company_id?: number;
    year?: number;
    quarter?: number;
  }) {
    return this.api.get(API_ENDPOINTS.QONTO_EXPENSE_REPORT, { params });
  }

  async detectQontoAnomalies() {
    return this.api.get(API_ENDPOINTS.QONTO_ANOMALIES);
  }

  async getQontoPredictions(params?: {
    months_ahead?: number;
  }) {
    return this.api.get(API_ENDPOINTS.QONTO_PREDICTIONS, { params });
  }

  // Health check
  async checkHealth() {
    return this.api.get(API_ENDPOINTS.HEALTH);
  }

  // Test Google Sheets endpoint (no auth required)
  async testQontoGoogleSheets() {
    return this.api.get('/qonto/test/google-sheets');
  }

  // Real dashboard data from Google Sheets (no auth required)
  async getRealDashboardData() {
    return this.api.get('/qonto/real-dashboard');
  }

  // Paginated transactions from Google Sheets (no auth required)
  async getPaginatedTransactions(params?: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }) {
    return this.api.get('/qonto/transactions-paginated', { params });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;