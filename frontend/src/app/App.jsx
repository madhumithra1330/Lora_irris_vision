import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { GatewayProvider } from '../context/GatewayContext';
import { SocketProvider } from '../context/SocketContext';
import ProtectedRoute from '../routes/ProtectedRoute';
import ErrorBoundary from '../components/ErrorBoundary';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import InstallPrompt from '../components/InstallPrompt';
import LoadingState from '../components/LoadingState';
import SplashScreen from '../components/SplashScreen';
import Onboarding from '../components/Onboarding';
import OfflineBanner from '../components/OfflineBanner';

// Lazy-loaded pages
const LoginPage = lazy(() => import('../pages/LoginPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ActivityPage = lazy(() => import('../pages/ActivityPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));

// Query client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [minSplashTimePassed, setMinSplashTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashTimePassed(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const hasOnboarded = localStorage.getItem('liv_onboarding_complete');
    if (!hasOnboarded) {
      setShowOnboarding(true);
    }
  }, []);

  if (isLoading || !minSplashTimePassed) {
    return <SplashScreen />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <>
      {isAuthenticated && <Header />}
      <OfflineBanner />
      <main className={isAuthenticated ? 'pb-safe' : ''}>
        <Suspense fallback={<LoadingState count={4} />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <DashboardPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <ActivityPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AnalyticsPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <ProfilePage />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {isAuthenticated && <BottomNavigation />}
      {isAuthenticated && <InstallPrompt />}
    </>
  );
}

export default function App() {
  return (
    <Suspense fallback={<SplashScreen />}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <GatewayProvider>
              <SocketProvider>
                <AppLayout />
              </SocketProvider>
            </GatewayProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Suspense>
  );
}
