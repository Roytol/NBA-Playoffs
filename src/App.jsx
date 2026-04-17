import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Dashboard from './pages/Dashboard';
import Predictions from './pages/Predictions';
import Leaderboard from './pages/Leaderboard';
import Rules from './pages/Rules';
import Admin from './pages/Admin';
import AllPredictions from './pages/AllPredictions';
import UserPredictions from './pages/UserPredictions';
import Layout from './Layout';
import Login from './pages/Login';

const PageWrapper = ({ component: Component, pageName }) => (
    <Layout currentPageName={pageName}>
        <Component />
    </Layout>
);

const AuthenticatedApp = () => {
    const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

    // Show loading spinner while checking app public settings or auth
    if (isLoadingPublicSettings || isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Handle authentication errors
    if (authError && window.location.pathname !== '/login') {
        if (authError.type === 'user_not_registered') {
            return <UserNotRegisteredError />;
        } else if (authError.type === 'auth_required') {
            // Redirect to login automatically
            navigateToLogin();
            return null;
        }
    }

    // Render the main app
    return (
        <Routes>
            <Route path="/" element={<PageWrapper component={Dashboard} pageName="Dashboard" />} />
            <Route path="/Dashboard" element={<PageWrapper component={Dashboard} pageName="Dashboard" />} />
            <Route path="/Predictions" element={<PageWrapper component={Predictions} pageName="Predictions" />} />
            <Route path="/Leaderboard" element={<PageWrapper component={Leaderboard} pageName="Leaderboard" />} />
            <Route path="/Rules" element={<PageWrapper component={Rules} pageName="Rules" />} />
            <Route path="/Admin" element={<PageWrapper component={Admin} pageName="Admin" />} />
            <Route path="/AllPredictions" element={<PageWrapper component={AllPredictions} pageName="AllPredictions" />} />
            <Route path="/UserPredictions" element={<PageWrapper component={UserPredictions} pageName="UserPredictions" />} />
            {/* The login page does not get the nav bar layout */}
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<PageWrapper component={PageNotFound} pageName="404" />} />
        </Routes>
    );
};


function App() {

    return (
        <AuthProvider>
            <QueryClientProvider client={queryClientInstance}>
                <Router>
                    <AuthenticatedApp />
                </Router>
                <Toaster />
            </QueryClientProvider>
        </AuthProvider>
    )
}

export default App
