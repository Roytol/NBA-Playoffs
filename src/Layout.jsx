import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Menu, X, Home, Star, Table2, LogIn, LogOut, BookOpen, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User, Settings } from "@/lib/db";
import AddToHomeScreenBanner from "@/components/AddToHomeScreenBanner";
import { useAuth } from "@/lib/AuthContext";

const NBA_GRADIENT = "bg-gradient-to-r from-blue-600 via-red-500 to-blue-600";

export default function Layout() {
    const location = useLocation();
    const currentPageName = location.pathname.substring(1) || "Dashboard";
    const { user, logout } = useAuth();

    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [activeSeason, setActiveSeason] = React.useState("");

    // Load active season label once (lightweight, Settings table)
    React.useEffect(() => {
        Settings.filter({ setting_name: "active_season" })
            .then(s => { if (s.length > 0) setActiveSeason(s[0].setting_value); })
            .catch(() => {});
    }, []);

    // Prevent body scroll when sidebar is open on mobile
    React.useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    const handleLogout = async () => {
        try { await logout(); } catch (e) { console.error(e); }
    };

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-gray-50 overflow-hidden">
            {/* iOS Add to Home Screen nudge */}
            <AddToHomeScreenBanner />

            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-full flex-col overflow-y-auto">
                    <div className="flex items-center justify-between p-4">
                        <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
                            <img
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/972189_nba-playoffs-seeklogo.png"
                                alt="NBA Playoffs Logo"
                                className="h-10"
                            />
                            <div className="text-xs text-gray-500">{activeSeason ? `${activeSeason} Prediction Game` : "Prediction Game"}</div>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* User Profile Section */}
                    {user ? (
                        <div className="px-4 py-3 border-b bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <span className="text-indigo-700 font-medium">
                                        {user.full_name?.charAt(0) || 'U'}
                                    </span>
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 truncate max-w-[180px]">
                                        {user.full_name}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                        <Trophy className="w-4 h-4 text-yellow-500" />
                                        {userScore} points
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="px-4 py-3 border-b">
                            <Button
                                className="w-full justify-center"
                                onClick={() => User.login()}
                            >
                                <LogIn className="w-4 h-4 mr-2" />
                                Sign In
                            </Button>
                        </div>
                    )}

                    <nav className="flex-1 px-4 py-2 overflow-y-auto">
                        <Link
                            to={createPageUrl("Dashboard")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentPageName === "Dashboard"
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Home className="w-5 h-5" />
                            Dashboard
                        </Link>
                        <Link
                            to={createPageUrl("Predictions")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentPageName === "Predictions"
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Star className="w-5 h-5" />
                            My Predictions
                        </Link>
                        <Link
                            to={createPageUrl("AllPredictions")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentPageName === "AllPredictions"
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Users className="w-5 h-5" />
                            All Predictions
                        </Link>
                        <Link
                            to={createPageUrl("Leaderboard")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentPageName === "Leaderboard"
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Table2 className="w-5 h-5" />
                            Leaderboard
                        </Link>
                        <Link
                            to={createPageUrl("Rules")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentPageName === "Rules"
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <BookOpen className="w-5 h-5" />
                            Rules
                        </Link>
                        {user?.is_admin && (
                            <Link
                                to={createPageUrl("Admin")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentPageName === "Admin"
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-100"
                                    }`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <Shield className="w-5 h-5" />
                                Admin
                            </Link>
                        )}
                    </nav>

                    {user && (
                        <div className="mt-auto p-4 border-t">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-5 h-5 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Mobile header */}
                <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-6 w-6" />
                        </Button>

                        <Link to={createPageUrl("Dashboard")} className="flex items-center">
                            <img
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/972189_nba-playoffs-seeklogo.png"
                                alt="NBA Playoffs Logo"
                                className="h-8"
                            />
                        </Link>
                    </div>

                    {/* Show user info in mobile header */}
                    {user && (
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                {userScore} points
                            </div>
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-indigo-700 font-medium text-sm">
                                    {user.full_name?.charAt(0) || 'U'}
                                </span>
                            </div>
                        </div>
                    )}
                </header>

                {/* Main content area */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}