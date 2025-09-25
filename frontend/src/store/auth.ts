import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean; // derived from token
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      get isAuthenticated() {
        return !!get().token;
      },
      setAuth: (user: User, token: string) => {
        localStorage.setItem('auth_token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null });
      },
    }) as AuthState,
    {
      name: 'auth-storage',
      partialize: (state: AuthState) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
