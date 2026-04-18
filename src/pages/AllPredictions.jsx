import React from "react";
import { Series, Prediction, Settings, Leaderboard } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertTriangle, Check, X } from "lucide-react";
import TeamLogo from "../components/common/TeamLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getRoundGroupLabel, PREDICTION_TABS, SETTINGS_KEYS } from "@/constants/app";
import { INTERACTIVE_INFO_LINK_CLASS } from "@/constants/theme";

export default function AllPredictionsPage() {
    const [series, setSeries] = React.useState([]);
    const [predictions, setPredictions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [activeRound, setActiveRound] = React.useState("all");
    const [expandedKey, setExpandedKey] = React.useState(null);

    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load all necessary data
            const [seriesData, predictionsData, leaderboard, settings] = await Promise.all([
                Series.list(),
                Prediction.list(),
                Leaderboard.list(),
                Settings.list()
            ]);

            const now = new Date();

            // Get deadlines from settings
            const championDeadline = settings.find(s => s.setting_name === SETTINGS_KEYS.CHAMPION_PREDICTION_DEADLINE)?.setting_value;
            const mvpDeadline = settings.find(s => s.setting_name === SETTINGS_KEYS.MVP_PREDICTION_DEADLINE)?.setting_value;
            const mvpStatus = settings.find(s => s.setting_name === SETTINGS_KEYS.MVP_PREDICTION_STATUS)?.setting_value;

            // Only keep series where prediction deadline has passed
            const closedSeries = seriesData.filter(s =>
                new Date(s.prediction_deadline) < now
            );

            // Get IDs of closed series
            const closedSeriesIds = closedSeries.map(s => s.series_id);

            // Filter predictions:
            // 1. Series predictions where deadline has passed
            // 2. Champion predictions where champion deadline has passed
            // 3. MVP predictions where MVP is open and deadline has passed
            const validPredictions = predictionsData.filter(p => {
                if (p.series_id) {
                    return closedSeriesIds.includes(p.series_id);
                }

                if (p.prediction_type === "champion") {
                    return championDeadline && new Date(championDeadline) < now;
                }

                if (p.prediction_type === "finals_mvp") {
                    return mvpStatus === "open" && mvpDeadline && new Date(mvpDeadline) < now;
                }

                return false;
            });

            // Add user names to predictions from leaderboard
            const enhancedPredictions = validPredictions.map(prediction => {
                const leaderboardEntry = leaderboard.find(l => l.player_id === prediction.user_email);
                return {
                    ...prediction,
                    user_name: leaderboardEntry?.player_name || "Anonymous"
                };
            });

            setSeries(closedSeries);
            setPredictions(enhancedPredictions);
        } catch (err) {
            console.error("Error loading predictions:", err);
            setError("Failed to load predictions. Please try refreshing the page.");
        } finally {
            setLoading(false);
        }
    };

    const getSeriesById = (seriesId) => {
        return series.find(s => s.series_id === seriesId);
    };

    const getStatusBadge = (prediction, seriesInfo) => {
        if (prediction.is_correct) {
            return (
                <Badge className="bg-green-100 text-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    Correct ({prediction.points_earned} pts)
                </Badge>
            );
        }

        if (!seriesInfo || seriesInfo.status === "active") {
            return (
                <Badge className="bg-blue-100 text-blue-800">
                    Pending
                </Badge>
            );
        }

        if (seriesInfo.status === "completed") {
            return (
                <Badge className="bg-red-100 text-red-800">
                    <X className="w-3 h-3 mr-1" />
                    Incorrect
                </Badge>
            );
        }

        return null;
    };

    const filteredPredictions = activeRound === "all"
        ? predictions
        : predictions.filter(p => p.prediction_type === activeRound);

    const groupPredictionsByType = (preds) => {
        return preds.reduce((acc, pred) => {
            const seriesInfo = pred.series_id ? getSeriesById(pred.series_id) : null;
            const key = seriesInfo
                ? `${seriesInfo.conference}_${seriesInfo.round}_${seriesInfo.series_id}`
                : pred.prediction_type;

            if (!acc[key]) {
                acc[key] = {
                    type: pred.prediction_type,
                    seriesInfo,
                    predictions: []
                };
            }

            acc[key].predictions.push(pred);
            return acc;
        }, {});
    };

    const handleExpandClick = (key) => {
        setExpandedKey(expandedKey === key ? null : key);
    };

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-6xl mx-auto p-4 sm:p-6"
            >
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">All Predictions</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">View all user predictions for completed series</p>
                <div className="flex justify-center items-center py-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">Loading predictions...</span>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto p-4 sm:p-6"
            >
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">All Predictions</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">View all user predictions for completed series</p>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>{error}</span>
                        <Button size="sm" onClick={loadData}>Try Again</Button>
                    </AlertDescription>
                </Alert>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto p-4 sm:p-6"
        >
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">All Predictions</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">View all user predictions for closed series</p>
            </motion.div>

            <AnimatePresence mode="popLayout">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Tabs defaultValue="all" onValueChange={setActiveRound}>
                        <TabsList className="mb-4 w-full overflow-x-auto flex-nowrap">
                            {PREDICTION_TABS.map((tab) => (
                                <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <TabsContent value={activeRound}>
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {Object.entries(groupPredictionsByType(filteredPredictions)).map(([key, group]) => (
                                        <motion.div
                                            key={key}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                        >
                                            <Card
                                                className={cn(
                                                    "transition-all duration-200 overflow-hidden",
                                                    expandedKey === key ? "ring-2 ring-blue-200" : ""
                                                )}
                                            >
                                                <CardHeader
                                                    className="cursor-pointer hover:bg-gray-50 py-3 px-3 sm:py-4 sm:px-6"
                                                    onClick={() => handleExpandClick(key)}
                                                >
                                                    <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <Trophy className="text-brand-gold w-4 h-4 sm:w-5 sm:h-5" />
                                                            {group.seriesInfo ? (
                                                                <div className="flex items-center gap-1 sm:gap-2 flex-wrap text-sm sm:text-base">
                                                                    <span className="hidden sm:inline">{group.seriesInfo.conference}</span>
                                                                    <span className="sm:hidden">{group.seriesInfo.conference === "East" ? "E" : "W"}</span>
                                                                    {" "}
                                                                    {getRoundGroupLabel(group.type)}
                                                                    {group.seriesInfo.status === "completed" && (
                                                                        <Badge className="bg-green-100 text-green-800 text-xs p-1 h-auto">
                                                                            {group.seriesInfo.winner} in {group.seriesInfo.games}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                getRoundGroupLabel(group.type)
                                                            )}
                                                        </div>
                                                        <Badge variant="outline" className="ml-1 text-xs h-5">
                                                            {group.predictions.length}
                                                        </Badge>
                                                    </CardTitle>
                                                    {group.seriesInfo && (
                                                        <div className="mt-1 sm:mt-2 space-y-1 text-xs sm:text-sm">
                                                            <div className="flex items-center gap-1 sm:gap-2">
                                                                <TeamLogo team={group.seriesInfo.team1} className="w-5 h-5 sm:w-6 sm:h-6" />
                                                                <span>
                                                                    {group.seriesInfo.team1} ({group.seriesInfo.team1_seed})
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 sm:gap-2">
                                                                <TeamLogo team={group.seriesInfo.team2} className="w-5 h-5 sm:w-6 sm:h-6" />
                                                                <span>
                                                                    {group.seriesInfo.team2} ({group.seriesInfo.team2_seed})
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardHeader>

                                                {expandedKey === key && (
                                                    <CardContent className="p-0">
                                                        <div className="overflow-x-auto">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="py-2 px-3 text-xs">User</TableHead>
                                                                        <TableHead className="py-2 px-3 text-xs">Prediction</TableHead>
                                                                        <TableHead className="py-2 px-3 text-xs text-center">Pts</TableHead>
                                                                        <TableHead className="py-2 px-3 text-xs text-right">Status</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {group.predictions.map((prediction) => (
                                                                        <TableRow key={prediction.id} className="text-xs sm:text-sm">
                                                                            <TableCell className="py-2 px-3">
                                                                                <Link
                                                                                    to={createPageUrl("UserPredictions") + "?id=" + prediction.user_email}
                                                                                    className={`${INTERACTIVE_INFO_LINK_CLASS} font-medium`}
                                                                                >
                                                                                    {prediction.user_name}
                                                                                </Link>
                                                                            </TableCell>
                                                                            <TableCell className="py-2 px-3">
                                                                                {group.seriesInfo ? (
                                                                                    <div className="flex items-center gap-1">
                                                                                        <TeamLogo team={prediction.winner} className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                                        <span className="whitespace-nowrap">{prediction.winner} in {prediction.games}</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    prediction.winner
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="py-2 px-3 text-center">
                                                                                {prediction.points_earned || 0}
                                                                            </TableCell>
                                                                            <TableCell className="py-2 px-3 text-right">
                                                                                {prediction.is_correct ? (
                                                                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                                                                        <Check className="w-3 h-3 mr-1" />
                                                                                        {prediction.points_earned}
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge className="bg-red-100 text-red-800 text-xs">
                                                                                        <X className="w-3 h-3" />
                                                                                    </Badge>
                                                                                )}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </CardContent>
                                                )}
                                            </Card>
                                        </motion.div>
                                    ))}

                                    {Object.entries(groupPredictionsByType(filteredPredictions)).length === 0 && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-6 text-gray-500 text-sm"
                                        >
                                            No predictions available for this category
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}
