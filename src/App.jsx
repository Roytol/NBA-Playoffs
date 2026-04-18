import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AppRoutes from '@/routes/AppRoutes';

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
