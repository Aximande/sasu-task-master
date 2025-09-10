/**
 * Company management store
 */
import { create } from 'zustand';
import apiService from '../services/api.service';

export interface Company {
  id: number;
  name: string;
  siren?: string;
  siret?: string;
  ape_code?: string;
  legal_form: string;
  creation_date?: string;
  fiscal_year_start: number;
  fiscal_year_end: number;
  address_street?: string;
  address_postal_code?: string;
  address_city?: string;
  address_country: string;
  vat_number?: string;
  vat_regime?: string;
  is_vat_registered: boolean;
  corporate_tax_regime: string;
  president_first_name?: string;
  president_last_name?: string;
  president_remuneration_type?: string;
  share_capital: number;
  number_of_shares: number;
  is_active: boolean;
  is_dormant: boolean;
  created_at: string;
  updated_at: string;
  
  // Stats (when fetching single company)
  total_tax_calculations?: number;
  total_documents?: number;
  last_calculation_date?: string;
}

interface CompanyState {
  companies: Company[];
  selectedCompany: Company | null;
  activeCompany: Company | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCompanies: () => Promise<void>;
  fetchCompany: (id: number) => Promise<void>;
  createCompany: (data: Partial<Company>) => Promise<Company>;
  updateCompany: (id: number, data: Partial<Company>) => Promise<void>;
  deleteCompany: (id: number) => Promise<void>;
  activateCompany: (id: number) => Promise<void>;
  deactivateCompany: (id: number) => Promise<void>;
  selectCompany: (company: Company | null) => void;
  setActiveCompany: (company: Company | null) => void;
  clearError: () => void;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  selectedCompany: null,
  activeCompany: null,
  isLoading: false,
  error: null,

  fetchCompanies: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getCompanies();
      set({
        companies: response.data,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch companies',
      });
    }
  },

  fetchCompany: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getCompany(id);
      const company = response.data;
      
      // Update in list if exists
      set((state) => ({
        companies: state.companies.map((c) =>
          c.id === id ? company : c
        ),
        selectedCompany: company,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch company',
      });
    }
  },

  createCompany: async (data: Partial<Company>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.createCompany(data);
      const newCompany = response.data;
      
      set((state) => ({
        companies: [...state.companies, newCompany],
        selectedCompany: newCompany,
        isLoading: false,
      }));
      
      return newCompany;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to create company',
      });
      throw error;
    }
  },

  updateCompany: async (id: number, data: Partial<Company>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.updateCompany(id, data);
      const updatedCompany = response.data;
      
      set((state) => ({
        companies: state.companies.map((c) =>
          c.id === id ? updatedCompany : c
        ),
        selectedCompany:
          state.selectedCompany?.id === id
            ? updatedCompany
            : state.selectedCompany,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to update company',
      });
      throw error;
    }
  },

  deleteCompany: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.deleteCompany(id);
      
      set((state) => ({
        companies: state.companies.filter((c) => c.id !== id),
        selectedCompany:
          state.selectedCompany?.id === id ? null : state.selectedCompany,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to delete company',
      });
      throw error;
    }
  },

  activateCompany: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.activateCompany(id);
      
      set((state) => ({
        companies: state.companies.map((c) =>
          c.id === id ? { ...c, is_active: true, is_dormant: false } : c
        ),
        selectedCompany:
          state.selectedCompany?.id === id
            ? { ...state.selectedCompany, is_active: true, is_dormant: false }
            : state.selectedCompany,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to activate company',
      });
      throw error;
    }
  },

  deactivateCompany: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.deactivateCompany(id);
      
      set((state) => ({
        companies: state.companies.map((c) =>
          c.id === id ? { ...c, is_active: false, is_dormant: true } : c
        ),
        selectedCompany:
          state.selectedCompany?.id === id
            ? { ...state.selectedCompany, is_active: false, is_dormant: true }
            : state.selectedCompany,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to deactivate company',
      });
      throw error;
    }
  },

  selectCompany: (company: Company | null) => {
    set({ selectedCompany: company });
  },

  setActiveCompany: (company: Company | null) => {
    set({ activeCompany: company });
  },

  clearError: () => set({ error: null }),
}));