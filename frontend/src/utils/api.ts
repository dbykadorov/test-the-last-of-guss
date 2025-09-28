import axios, { AxiosError, AxiosResponse } from 'axios';
import { ApiError, ApiResponse } from '@/types/api';
import { useAuthStore } from '@/store/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      try {
        useAuthStore.getState().logout();
      } catch (_) {
        localStorage.removeItem('auth_token');
      }
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    
    return Promise.reject({
      message: error.response?.data?.message || 'Network error',
      statusCode: error.response?.status || 500,
      error: error.response?.data?.error,
    } as ApiError);
  }
);

export { api as default };
