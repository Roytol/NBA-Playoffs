
import React from "react";
import { Series, Prediction, User, Leaderboard } from "@/lib/db";
import { Button } from "@/components/ui/button";
import SeriesCard from "../components/dashboard/SeriesCard";
import { ChampionPick, FinalsMVPPick } from "../components/dashboard/PrePlayoffPicks";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function Dashboard() {
    const [series, setSeries] = React.useState([]);
    const [predictions, setPredictions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [user, setUser] = React.useState(null);
    const [loadRetries, setLoadRetries] = React.useState(0);
    const [loadingMessage, setLoadingMessage] = React.useState("Loading playoff data...");

    React.useEffect(() => {
        loadData();
    }, [loadRetries]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load series first
            setLoadingMessage("Loading playoff series...");
            const seriesData = await Series.list()
                .catch(e => {
                    console.error("Failed to load series:", e);
                    setError("Failed to load playoff data. Please try refreshing the page.");
                    return [];
                });

            setSeries(seriesData);

            // Then try to load user
            try {
                setLoadingMessage("Loading user data...");
                const userData = await User.me();
                setUser(userData);

                // If user exists, check if they're in the leaderboard and add if not
                if (userData) {
                    setLoadingMessage("Loading your predictions...");
                    // First, load their predictions
                    const predictionsData = await Prediction.filter({ user_email: userData.email })
                        .catch(e => {
                            console.error("Failed to load predictions:", e);
                            return [];
                        });

                    setPredictions(predictionsData);

                    // Check if user is in leaderboard
                    const leaderboardEntries = await Leaderboard.filter({ player_id: userData.email });

                    // If not in leaderboard, add them
                    if (leaderboardEntries.length === 0) {
                        try {
                            setLoadingMessage("Setting up your profile...");
                            // Calculate total points
                            const totalPoints = predictionsData.reduce((sum, p) =>
                                sum + (p.points_earned || 0), 0);

                            // Add to leaderboard
                            await Leaderboard.create({
                                player_id: userData.email,
                                player_name: userData.full_name || "Anonymous Player",
                                total_points: totalPoints,
                                last_updated: new Date().toISOString()
                            });
                        } catch (error) {
                            console.error("Failed to add user to leaderboard:", error);
                        }
                    }
                }
            } catch (userError) {
                console.log("User not logged in:", userError);
                setUser(null);
            }
        } catch (err) {
            console.error("Error loading dashboard data:", err);
            setError("Failed to load playoff data. Please try refreshing the page.");
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setLoadRetries(prev => prev + 1);
    };

    const hasChampionPick = React.useMemo(() => {
        return predictions.some(p => p.prediction_type === "champion" && p.user_email === user?.email);
    }, [predictions, user]);

    const hasFinalsMVPPick = React.useMemo(() => {
        return predictions.some(p => p.prediction_type === "finals_mvp" && p.user_email === user?.email);
    }, [predictions, user]);

    // Update the categorizedSeries memo to include sorting for both active and completed series
    const categorizedSeries = React.useMemo(() => {
        if (!series.length) return { active: [], closed: [], completed: [] };

        const now = new Date();
        const categorized = series.reduce((acc, s) => {
            const deadline = new Date(s.prediction_deadline);

            if (s.status === "completed") {
                acc.completed.push(s);
            } else if (deadline > now) {
                acc.active.push(s);
            } else {
                acc.closed.push(s);
            }

            return acc;
        }, { active: [], closed: [], completed: [] });

        // Sort active series by deadline (earliest first)
        categorized.active.sort((a, b) =>
            new Date(a.prediction_deadline) - new Date(b.prediction_deadline)
        );

        // Sort completed series by date (latest first)
        // Using prediction_deadline as a proxy for completion date
        categorized.completed.sort((a, b) =>
            new Date(b.prediction_deadline) - new Date(a.prediction_deadline)
        );

        return categorized;
    }, [series]);

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto p-4 sm:p-6"
            >
                <Alert variant="destructive" className="my-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>{error}</span>
                        <Button size="sm" onClick={handleRetry}>Try Again</Button>
                    </AlertDescription>
                </Alert>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto p-3 sm:p-6"
        >
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 sm:mb-6"
            >
                <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">NBA Playoffs 2025</h1>
                <p className="text-sm text-gray-500">Make your predictions and compete with others</p>
            </motion.div>

            <AnimatePresence>
                {!user && (
                    <motion.div
                        key="login-prompt"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-8 text-center"
                    >
                        <h2 className="text-base sm:text-lg font-semibold mb-2">Sign in to make predictions</h2>
                        <p className="text-sm text-gray-600 mb-4">Join the competition and track your predictions</p>
                        <Button onClick={() => User.login()}>Sign In</Button>
                    </motion.div>
                )}

                {user && !hasChampionPick && (
                    <motion.div
                        key="champ-pick"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-4"
                    >
                        <ChampionPick onSave={loadData} />
                    </motion.div>
                )}

                {user && !hasFinalsMVPPick && (
                    <motion.div
                        key="mvp-pick"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-4"
                    >
                        <FinalsMVPPick onSave={loadData} />
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8 sm:py-12"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow-md">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">{loadingMessage}</span>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6 sm:space-y-8"
                >
                    <AnimatePresence mode="popLayout">
                        {/* Active Series */}
                        {categorizedSeries.active.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                    Open for Predictions
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                                    {categorizedSeries.active.map((seriesItem) => (
                                        <motion.div
                                            key={seriesItem.id || seriesItem.series_id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <SeriesCard
                                                series={seriesItem}
                                                predictions={predictions}
                                                onPredictionMade={loadData}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Closed Series */}
                        {categorizedSeries.closed.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                                    Predictions Closed
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                                    {categorizedSeries.closed.map((seriesItem) => (
                                        <motion.div
                                            key={seriesItem.id || seriesItem.series_id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <SeriesCard
                                                series={seriesItem}
                                                predictions={predictions}
                                                onPredictionMade={loadData}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Completed Series */}
                        {categorizedSeries.completed.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                                    Completed Series
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                                    {categorizedSeries.completed.map((seriesItem) => (
                                        <motion.div
                                            key={seriesItem.id || seriesItem.series_id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <SeriesCard
                                                series={seriesItem}
                                                predictions={predictions}
                                                onPredictionMade={loadData}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* No series message */}
                        {!categorizedSeries.active.length &&
                            !categorizedSeries.closed.length &&
                            !categorizedSeries.completed.length && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-8 sm:py-12 text-gray-500 text-sm"
                                >
                                    No series available at the moment
                                </motion.div>
                            )}
                    </AnimatePresence>
                </motion.div>
            )}
        </motion.div>
    );
}
