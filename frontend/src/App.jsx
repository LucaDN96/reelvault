import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import { UserPrefsProvider } from './contexts/UserPrefsContext.jsx';
import AuthScreen            from './screens/AuthScreen.jsx';
import LibraryScreen         from './screens/LibraryScreen.jsx';
import DetailScreen          from './screens/DetailScreen.jsx';
import SettingsScreen        from './screens/SettingsScreen.jsx';
import CategoriesScreen      from './screens/CategoriesScreen.jsx';
import CollectionsScreen     from './screens/CollectionsScreen.jsx';
import CollectionDetailScreen from './screens/CollectionDetailScreen.jsx';
import AcceptInviteScreen    from './screens/AcceptInviteScreen.jsx';
import ConnectTelegramScreen from './screens/ConnectTelegramScreen.jsx';

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    // Navigate to ?next= destination, falling back to /app
    const next = searchParams.get('next') || '/app';
    navigate(next, { replace: true });
  }, []);
  return null;
}

function ProtectedRoute({ children }) {
  const { session } = useAuth();
  const location = useLocation();
  if (session === undefined) return <div className="full-center">Loading…</div>;
  // Preserve the current URL so auth can redirect back after login
  if (!session) return <Navigate to={`/app/auth?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
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
      <Route path="/app/categories" element={
        <ProtectedRoute><CategoriesScreen /></ProtectedRoute>
      } />
      <Route path="/app/collections" element={
        <ProtectedRoute><CollectionsScreen /></ProtectedRoute>
      } />
      <Route path="/app/collections/accept" element={
        <ProtectedRoute><AcceptInviteScreen /></ProtectedRoute>
      } />
      <Route path="/app/collections/:id" element={
        <ProtectedRoute><CollectionDetailScreen /></ProtectedRoute>
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
