import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button"
import { useNavigate } from 'react-router-dom';
import { Home } from "lucide-react";
import { ROUTES } from '@/routes/paths';
import { getCurrentUser, redirectToLogin } from '@/services';

export default function PageNotFound() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = await getCurrentUser();
                setIsLoggedIn(!!user);
            } catch (error) {
                console.error("Auth check failed:", error);
                setIsLoggedIn(false);
            }
        };
        checkAuth();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
            <p className="text-gray-500 mb-8 max-w-md">
                Oops! The page you are looking for doesn't exist or has been moved.
            </p>
            <div className="flex gap-4">
                <Button 
                    onClick={() => navigate(ROUTES.dashboard)}
                    className="flex items-center gap-2"
                >
                    <Home className="w-4 h-4" />
                    Go Home
                </Button>
                {!isLoggedIn && (
                    <Button 
                        variant="outline"
                        onClick={() => redirectToLogin()}
                    >
                        Login
                    </Button>
                )}
            </div>
        </div>
    );
}
