import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../components/SplashScreen';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
