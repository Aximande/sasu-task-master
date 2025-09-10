/**
 * Authentication store using Zustand
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiService from '../services/api.service';

export interface User {
  id: number;
  email: string;
  full_name?: string;
  phone?: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_plan: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.login(email, password);
          
          // Fetch user data after login
          const userResponse = await apiService.getCurrentUser();
          
          set({
            user: userResponse.data,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            isAuthenticated: false,
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.register(data);
          
          // Auto-login after registration
          await get().login(data.email, data.password);
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiService.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      fetchCurrentUser: async () => {
        if (!apiService.isAuthenticated()) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await apiService.getCurrentUser();
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
        }
      },

      updateUser: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.updateCurrentUser(data);
          set({
            user: response.data,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Update failed',
          });
          throw error;
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.changePassword(currentPassword, newPassword);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Password change failed',
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);