export const ROUTES = {
    login: "/login",
    dashboard: "/",
    dashboardLegacy: "/Dashboard",
    predictions: "/Predictions",
    allPredictions: "/AllPredictions",
    leaderboard: "/Leaderboard",
    rules: "/Rules",
    userPredictions: "/UserPredictions",
    playoffTree: "/PlayoffTree",
    admin: "/Admin",
};

const PAGE_ROUTES = {
    Dashboard: ROUTES.dashboard,
    Predictions: ROUTES.predictions,
    AllPredictions: ROUTES.allPredictions,
    Leaderboard: ROUTES.leaderboard,
    Rules: ROUTES.rules,
    UserPredictions: ROUTES.userPredictions,
    PlayoffTree: ROUTES.playoffTree,
    Admin: ROUTES.admin,
};

export function getPageRoute(pageName) {
    return PAGE_ROUTES[pageName] || `/${pageName.replace(/ /g, "-")}`;
}
