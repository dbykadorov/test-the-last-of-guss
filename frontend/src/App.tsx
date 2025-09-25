import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@store/auth';
import LoginPage from '@pages/LoginPage';
import RoundsPage from '@pages/RoundsPage';
import RoundPage from '@pages/RoundPage';
import ProtectedRoute from '@components/organisms/ProtectedRoute';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="app">
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/rounds" replace /> : <LoginPage />
          } 
        />
        <Route 
          path="/rounds" 
          element={
            <ProtectedRoute>
              <RoundsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rounds/:id" 
          element={
            <ProtectedRoute>
              <RoundPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/rounds" replace />} />
      </Routes>
    </div>
  );
}

export default App;
