import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TeamsPage } from './pages/TeamsPage';
import { ScoreboardPage } from './pages/ScoreboardPage';
import { MatchesPage } from './pages/MatchesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { TwoFactorVerifyPage } from './pages/TwoFactorVerifyPage';
import { AuthConfirmPage } from './pages/AuthConfirmPage';

const ThemeProfileSync: React.FC = () => {
  const { userData } = useAuth();
  const { setDark } = useTheme();

  useEffect(() => {
    if (userData?.theme) {
      setDark(userData.theme === 'dark');
    }
  }, [userData?.theme, setDark]);

  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading, pendingTwoFactor } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }
  
  if (pendingTwoFactor) return <Navigate to="/verify-2fa" />;
  
  return currentUser ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemeProfileSync />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/confirm" element={<AuthConfirmPage />} />
            <Route path="/verify-2fa" element={<TwoFactorVerifyPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
            <Route path="/scoreboard" element={<ProtectedRoute><ScoreboardPage /></ProtectedRoute>} />
            <Route path="/matches" element={<ProtectedRoute><MatchesPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
