import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import FileViewerPage from './pages/FileViewerPage';
import SettingsPage from './pages/SettingsPage';
import SharedFilePage from './pages/SharedFilePage';
import LoadingScreen from './components/shared/LoadingScreen';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
    <Route path="/dashboard/*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/files/:id" element={<ProtectedRoute><FileViewerPage /></ProtectedRoute>} />
    <Route path="/settings/*" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    <Route path="/shared/:token" element={<SharedFilePage />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(12,12,24,0.98)',
            color: '#f0f0ff',
            border: '1px solid rgba(31,31,56,0.9)',
            borderRadius: '14px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            letterSpacing: '-0.01em',
          },
          success: { iconTheme: { primary: '#00c9a7', secondary: 'rgba(12,12,24,0.98)' } },
          error: { iconTheme: { primary: '#ff3860', secondary: 'rgba(12,12,24,0.98)' } },
          duration: 4000,
        }}
      />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
