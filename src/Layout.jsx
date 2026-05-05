import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Trophy,
  Menu,
  X,
  Home,
  Star,
  Table2,
  LogIn,
  LogOut,
  BookOpen,
  Shield,
  Users,
  GitBranch,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddToHomeScreenBanner from "@/components/AddToHomeScreenBanner";
import { useAuth } from "@/lib/AuthContext";
import { APP_BRAND_NAME, APP_LOGO_URL } from "@/constants/branding";
import { formatSeasonLabel, SETTINGS_KEYS } from "@/constants/app";
import { DANGER_GHOST_BUTTON_CLASS } from "@/constants/theme";
import { listSettings, redirectToLogin } from "@/services";
import { useTheme } from "@/components/theme/ThemeProvider";
import Logo from "@/components/common/Logo";

export default function Layout() {
  const location = useLocation();
  const currentPageName = location.pathname.substring(1) || "Dashboard";
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [activeSeason, setActiveSeason] = React.useState("");

  // Load active season label once (lightweight, Settings table)
  React.useEffect(() => {
    listSettings()
      .then((settings) => {
        const activeSeasonSetting = settings.find(
          (s) => s.setting_name === SETTINGS_KEYS.ACTIVE_SEASON,
        );
        if (activeSeasonSetting)
          setActiveSeason(activeSeasonSetting.setting_value);
      })
      .catch(() => {});
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  React.useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    }
  };

  const navLinkClassName = (pageName) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
      currentPageName === pageName
        ? "surface-status-info text-status-info border-status-info"
        : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background lg:flex-row">
      {/* iOS Add to Home Screen nudge */}
      <AddToHomeScreenBanner />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 border-r border-border bg-card shadow-lg transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between gap-2 border-b border-border p-4">
            <Link
              to={createPageUrl("Dashboard")}
              className="flex items-center gap-2"
            >
              <Logo className="h-10" />
              <div className="text-xs text-muted-foreground">
                {activeSeason
                  ? `${formatSeasonLabel(activeSeason)} Prediction Game`
                  : "Prediction Game"}
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={toggleTheme}
                aria-label={
                  isDarkMode ? "Switch to light mode" : "Switch to dark mode"
                }
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* User Profile Section */}
          {user ? (
            <div className="border-b border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-info-strong/15">
                  <span className="font-medium text-status-info-strong">
                    {user.full_name?.charAt(0) || "U"}
                  </span>
                </div>
                <div>
                  <div className="max-w-[180px] truncate font-medium text-foreground">
                    {user.full_name}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Trophy className="text-brand-gold w-4 h-4" />
                    {user?.total_points ?? 0} points
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-border px-4 py-3">
              <Button
                className="w-full justify-center"
                onClick={() => redirectToLogin()}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </div>
          )}

          <nav className="flex-1 px-4 py-2 overflow-y-auto">
            <Link
              to={createPageUrl("Dashboard")}
              className={navLinkClassName("Dashboard")}
              onClick={() => setSidebarOpen(false)}
            >
              <Home className="w-5 h-5" />
              Dashboard
            </Link>
            <Link
              to={createPageUrl("Predictions")}
              className={navLinkClassName("Predictions")}
              onClick={() => setSidebarOpen(false)}
            >
              <Star className="w-5 h-5" />
              My Predictions
            </Link>
            <Link
              to={createPageUrl("AllPredictions")}
              className={navLinkClassName("AllPredictions")}
              onClick={() => setSidebarOpen(false)}
            >
              <Users className="w-5 h-5" />
              All Predictions
            </Link>
            <Link
              to={createPageUrl("Leaderboard")}
              className={navLinkClassName("Leaderboard")}
              onClick={() => setSidebarOpen(false)}
            >
              <Table2 className="w-5 h-5" />
              Leaderboard
            </Link>
            <Link
              to={createPageUrl("PlayoffTree")}
              className={navLinkClassName("PlayoffTree")}
              onClick={() => setSidebarOpen(false)}
            >
              <GitBranch className="w-5 h-5" />
              Playoff tree
            </Link>
            <Link
              to={createPageUrl("Rules")}
              className={navLinkClassName("Rules")}
              onClick={() => setSidebarOpen(false)}
            >
              <BookOpen className="w-5 h-5" />
              Rules
            </Link>
            {user?.is_admin && (
              <Link
                to={createPageUrl("Admin")}
                className={navLinkClassName("Admin")}
                onClick={() => setSidebarOpen(false)}
              >
                <Shield className="w-5 h-5" />
                Admin
              </Link>
            )}
          </nav>

          {user && (
            <div className="mt-auto border-t border-border p-4">
              <Button
                variant="ghost"
                className={`w-full justify-start ${DANGER_GHOST_BUTTON_CLASS}`}
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
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground"
            >
              <Menu className="h-6 w-6" />
            </Button>

            <Link to={createPageUrl("Dashboard")} className="flex items-center">
              <Logo className="h-8" />
            </Link>
          </div>

          {/* Show user info in mobile header */}
          {user && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={toggleTheme}
                aria-label={
                  isDarkMode ? "Switch to light mode" : "Switch to dark mode"
                }
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Trophy className="text-brand-gold w-4 h-4" />
                {user?.total_points ?? 0} points
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-info-strong/15">
                <span className="text-sm font-medium text-status-info-strong">
                  {user.full_name?.charAt(0) || "U"}
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
