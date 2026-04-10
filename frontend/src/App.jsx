import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import { UserPrefsProvider } from './contexts/UserPrefsContext.jsx';
import AuthScreen            from './screens/AuthScreen.jsx';
import LibraryScreen         from './screens/LibraryScreen.jsx';
import DetailScreen          from './screens/DetailScreen.jsx';
import SettingsScreen        from './screens/SettingsScreen.jsx';
import ConnectTelegramScreen from './screens/ConnectTelegramScreen.jsx';

function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/app', { replace: true }); }, []);
  return null;
}

function ProtectedRoute({ children }) {
  const { session } = useAuth();
  if (session === undefined) return <div className="full-center">Loading…</div>;
  if (!session) return <Navigate to="/app/auth" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { session } = useAuth();
  if (session === undefined) return <div className="full-center">Loading…</div>;
  if (session) return <Navigate to="/app" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/app/auth" element={
        <PublicRoute><AuthScreen /></PublicRoute>
      } />
      <Route path="/app" element={
        <ProtectedRoute><LibraryScreen /></ProtectedRoute>
      } />
      <Route path="/app/reel/:id" element={
        <ProtectedRoute><DetailScreen /></ProtectedRoute>
      } />
      <Route path="/app/settings" element={
        <ProtectedRoute><SettingsScreen /></ProtectedRoute>
      } />
      <Route path="/connect" element={
        <ProtectedRoute><ConnectTelegramScreen /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <UserPrefsProvider>
            <AppRoutes />
          </UserPrefsProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
