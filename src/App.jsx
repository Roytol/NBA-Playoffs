import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Predictions from './pages/Predictions';
import Leaderboard from './pages/Leaderboard';
import Rules from './pages/Rules';
import Admin from './pages/Admin';
import AllPredictions from './pages/AllPredictions';
import UserPredictions from './pages/UserPredictions';
import Layout from './Layout';
import Login from './pages/Login';

const AppRoutes = () => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/Dashboard" element={<Dashboard />} />
                    <Route path="/Predictions" element={<Predictions />} />
                    <Route path="/AllPredictions" element={<AllPredictions />} />
                    <Route path="/Leaderboard" element={<Leaderboard />} />
                    <Route path="/Rules" element={<Rules />} />
                    <Route path="/UserPredictions" element={<UserPredictions />} />
                    <Route path="*" element={<PageNotFound />} />
                </Route>
            </Route>

            {/* Admin-Only Routes */}
            <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route element={<Layout />}>
                    <Route path="/Admin" element={<Admin />} />
                </Route>
            </Route>
        </Routes>
    );
};


import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {

    return (
        <ErrorBoundary>
            <AuthProvider>
                <QueryClientProvider client={queryClientInstance}>
                    <Router>
                        <AppRoutes />
                    </Router>
                    <Toaster />
                </QueryClientProvider>
            </AuthProvider>
        </ErrorBoundary>
    )
}

export default App
