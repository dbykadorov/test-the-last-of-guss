import { useMutation } from '@tanstack/react-query';
import api from '@utils/api';
import { useAuthStore } from '@store/auth';
import { LoginRequest, LoginResponse } from '@/types/api';

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (data: LoginRequest): Promise<LoginResponse> => {
      const response = await api.post<{ data: LoginResponse }>('/auth/login', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
    },
  });
};

export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout);
  
  return () => {
    logout();
  };
};
