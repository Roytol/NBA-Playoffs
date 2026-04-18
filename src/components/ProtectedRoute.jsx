import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ROUTES } from '@/routes/paths';

const DefaultFallback = () => (
    <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, requireAdmin = false }) {
    const { isAuthenticated, isLoadingAuth, user } = useAuth();

    // Show spinner only while the initial session check is in flight.
    // For logged-in users this resolves in <50ms from localStorage.
    if (isLoadingAuth) {
        return fallback;
    }

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.login} replace />;
    }

    if (requireAdmin && !user?.is_admin) {
        return <Navigate to={ROUTES.dashboard} replace />;
    }

    return <Outlet />;
}
