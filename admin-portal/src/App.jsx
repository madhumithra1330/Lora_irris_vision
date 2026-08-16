import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AdminLayout from './layouts/AdminLayout';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const FarmersPage = lazy(() => import('./pages/FarmersPage'));
const CentralNodesPage = lazy(() => import('./pages/CentralNodesPage'));
const FieldNodesPage = lazy(() => import('./pages/FieldNodesPage'));
const WaterAnalyticsPage = lazy(() => import('./pages/WaterAnalyticsPage'));
const FarmAnalyticsPage = lazy(() => import('./pages/FarmAnalyticsPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));

// Setup query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Guarded Admin Route
function AdminProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-field-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-field-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-field-text-secondary uppercase tracking-widest font-semibold font-display">LIV Systems Initializing...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <Suspense fallback={
              <div className="min-h-screen bg-field-bg flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-field-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <Routes>
                {/* Public Access */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Admin Access */}
                <Route path="/" element={
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                }>
                  <Route index element={<OverviewPage />} />
                  <Route path="farmers" element={<FarmersPage />} />
                  <Route path="central-nodes" element={<CentralNodesPage />} />
                  <Route path="field-nodes" element={<FieldNodesPage />} />
                  <Route path="water-analytics" element={<WaterAnalyticsPage />} />
                  <Route path="farm-analytics" element={<FarmAnalyticsPage />} />
                  <Route path="activity" element={<ActivityPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
