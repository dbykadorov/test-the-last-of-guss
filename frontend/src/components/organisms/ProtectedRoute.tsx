import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@store/auth';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, token, logout } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    token: state.token,
    logout: state.logout,
  }));

  // If persisted token is missing (expired/cleared), enforce consistent logout state
  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (!stored && (isAuthenticated || token)) {
      logout();
    }
  }, [isAuthenticated, token, logout]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
