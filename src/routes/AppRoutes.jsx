import { Route, Routes } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Predictions from "@/pages/Predictions";
import Leaderboard from "@/pages/Leaderboard";
import Rules from "@/pages/Rules";
import Admin from "@/pages/Admin";
import AllPredictions from "@/pages/AllPredictions";
import UserPredictions from "@/pages/UserPredictions";
import Login from "@/pages/Login";
import { ROUTES } from "@/routes/paths";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path={ROUTES.login} element={<Login />} />

            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path={ROUTES.dashboard} element={<Dashboard />} />
                    <Route path={ROUTES.dashboardLegacy} element={<Dashboard />} />
                    <Route path={ROUTES.predictions} element={<Predictions />} />
                    <Route path={ROUTES.allPredictions} element={<AllPredictions />} />
                    <Route path={ROUTES.leaderboard} element={<Leaderboard />} />
                    <Route path={ROUTES.rules} element={<Rules />} />
                    <Route path={ROUTES.userPredictions} element={<UserPredictions />} />
                    <Route path="*" element={<PageNotFound />} />
                </Route>
            </Route>

            <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route element={<AppLayout />}>
                    <Route path={ROUTES.admin} element={<Admin />} />
                </Route>
            </Route>
        </Routes>
    );
}
