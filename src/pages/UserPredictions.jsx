
import React from "react";
import { Prediction, Series, Settings, Leaderboard } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Check, X, AlertTriangle, ArrowLeft, Users } from "lucide-react";
import TeamLogo from "../components/common/TeamLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserPredictionsPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const userId = searchParams.get("id");
    const [predictions, setPredictions] = React.useState([]);
    const [series, setSeries] = React.useState([]);
    const [userData, setUserData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState("all");
    const [allUsers, setAllUsers] = React.useState([]);

    React.useEffect(() => {
        loadData();
        loadAllUsers();
    }, [userId]);

    const loadAllUsers = async () => {
        try {
            const leaderboardData = await Leaderboard.list();
            setAllUsers(leaderboardData);
        } catch (err) {
            console.error("Error loading users:", err);
            // Don't set an error state - this is non-critical
        }
    };

    const handleUserChange = (newUserId) => {
        navigate(createPageUrl("UserPredictions") + "?id=" + newUserId);
    };

    const loadData = async () => {
        if (!userId) {
            setError("No user specified");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const now = new Date();

            // Load all necessary data
            const [
                predictionsData,
                seriesData,
                settings,
                leaderboardData
            ] = await Promise.all([
                Prediction.filter({ user_email: userId }),
                Series.list(),
                Settings.list(),
                Settings.list(),
                Leaderboard.filter({ player_id: userId })
            ]);

            // Get deadlines from settings
            const championDeadline = settings.find(s => s.setting_name === "champion_prediction_deadline")?.setting_value;
            const mvpDeadline = settings.find(s => s.setting_name === "mvp_prediction_deadline")?.setting_value;

            // Filter predictions based on deadlines
            const validPredictions = predictionsData.filter(p => {
                if (p.series_id) {
                    const relatedSeries = seriesData.find(s => s.series_id === p.series_id);
                    return relatedSeries && new Date(relatedSeries.prediction_deadline) < now;
                }

                if (p.prediction_type === "champion") {
                    return championDeadline && new Date(championDeadline) < now;
                }

                if (p.prediction_type === "finals_mvp") {
                    return mvpDeadline && new Date(mvpDeadline) < now;
                }

                return false;
            });

            setPredictions(validPredictions);
            setSeries(seriesData);

            // Try to get user's name from leaderboard or prediction data
            if (leaderboardData.length > 0) {
                setUserData({
                    email: userId,
                    name: leaderboardData[0].player_name,
                    points: validPredictions.reduce((sum, p) => sum + (p.points_earned || 0), 0)
                });
            } else if (predictionsData.length > 0) {
                setUserData({
                    email: userId,
                    name: "User",
                    points: validPredictions.reduce((sum, p) => sum + (p.points_earned || 0), 0)
                });
            }
        } catch (err) {
            console.error("Error loading user predictions:", err);
            setError("Failed to load predictions. Please try refreshing the page.");
        } finally {
            setLoading(false);
        }
    };

    const getSeriesById = (seriesId) => {
        return series.find(s => s.series_id === seriesId);
    };

    const filteredPredictions = activeTab === "all"
        ? predictions
        : predictions.filter(p => p.prediction_type === activeTab);

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-6xl mx-auto p-4 sm:p-6"
            >
                <div className="flex items-center gap-2 mb-6">
                    <Link to={createPageUrl("Leaderboard")} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold">User Predictions</h1>
                </div>
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
                <div className="flex items-center gap-2 mb-6">
                    <Link to={createPageUrl("Leaderboard")} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold">User Predictions</h1>
                </div>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {error}
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
            <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Link to={createPageUrl("Leaderboard")} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl sm:text-3xl font-bold">User Predictions</h1>
                </div>

                {userData && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 ml-7">
                        <div className="text-base sm:text-lg font-semibold">{userData.name}</div>
                        <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                            <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                            Total points: {userData.points}
                        </div>
                    </div>
                )}

                {/* User selection dropdown - more compact on mobile */}
                {allUsers.length > 0 && (
                    <div className="mt-3 sm:mt-4 ml-7 max-w-xs">
                        <div className="flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            <span className="text-xs sm:text-sm text-gray-500">View another user</span>
                        </div>
                        <Select
                            value={userId}
                            onValueChange={handleUserChange}
                        >
                            <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                                <SelectValue placeholder="Select user..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allUsers.map(user => (
                                    <SelectItem key={user.player_id} value={user.player_id} className="text-xs sm:text-sm">
                                        {user.player_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab}>
                <TabsList className="mb-3 sm:mb-4 w-full overflow-x-auto flex-nowrap">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="play_in" className="text-xs">Play-In</TabsTrigger>
                    <TabsTrigger value="first_round" className="text-xs">First</TabsTrigger>
                    <TabsTrigger value="second_round" className="text-xs">Second</TabsTrigger>
                    <TabsTrigger value="conference_finals" className="text-xs">Conf</TabsTrigger>
                    <TabsTrigger value="finals" className="text-xs">Finals</TabsTrigger>
                    <TabsTrigger value="champion" className="text-xs">Champ</TabsTrigger>
                    <TabsTrigger value="finals_mvp" className="text-xs">MVP</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                    <Card>
                        <CardHeader className="py-2 px-3 sm:py-4 sm:px-6">
                            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                                {activeTab === "all" ? "All Predictions" :
                                    activeTab.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Predictions"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="py-2 px-2 sm:px-4 text-xs">Series</TableHead>
                                        <TableHead className="py-2 px-2 sm:px-4 text-xs">Pick</TableHead>
                                        <TableHead className="py-2 px-2 sm:px-4 text-xs text-center">Pts</TableHead>
                                        <TableHead className="py-2 px-2 sm:px-4 text-xs text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPredictions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-xs sm:text-sm text-gray-500">
                                                No predictions available
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPredictions.map((prediction) => {
                                            const seriesInfo = prediction.series_id ? getSeriesById(prediction.series_id) : null;
                                            const isPlayIn = seriesInfo?.round === 'play_in';

                                            return (
                                                <TableRow key={prediction.id}>
                                                    <TableCell className="py-2 px-2 sm:px-4">
                                                        {prediction.prediction_type === "champion" ? (
                                                            <div className="flex items-center gap-1 text-xs sm:text-sm">
                                                                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                                                                <span>Champion</span>
                                                            </div>
                                                        ) : prediction.prediction_type === "finals_mvp" ? (
                                                            <div className="flex items-center gap-1 text-xs sm:text-sm">
                                                                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                                                                <span>Finals MVP</span>
                                                            </div>
                                                        ) : seriesInfo ? (
                                                            <div className="text-xs sm:text-sm">
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <TeamLogo team={seriesInfo.team1} className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                    <span>{seriesInfo.team1} ({seriesInfo.team1_seed})</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <TeamLogo team={seriesInfo.team2} className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                    <span>{seriesInfo.team2} ({seriesInfo.team2_seed})</span>
                                                                </div>
                                                                <div className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                                                    {seriesInfo.conference} · {
                                                                        seriesInfo.round.split("_").map(w =>
                                                                            w.charAt(0).toUpperCase() + w.slice(1)
                                                                        ).join(" ")
                                                                    }
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs">Unknown Series</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-2 sm:px-4">
                                                        {prediction.prediction_type === "champion" || prediction.prediction_type === "finals_mvp" ? (
                                                            <div className="text-xs sm:text-sm">{prediction.winner}</div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-xs sm:text-sm">
                                                                <TeamLogo team={prediction.winner} className="w-4 h-4 sm:w-5 sm:h-5" />
                                                                <span>{isPlayIn ? prediction.winner : `${prediction.winner} in ${prediction.games}`}</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-2 sm:px-4 text-center text-xs sm:text-sm">
                                                        {prediction.points_earned || 0}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-2 sm:px-4 text-right">
                                                        {prediction.is_correct ? (
                                                            <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs h-5 sm:h-6">
                                                                <Check className="w-3 h-3 mr-1" />
                                                                {prediction.points_earned}
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-red-100 text-red-800 text-[10px] sm:text-xs h-5 sm:h-6">
                                                                <X className="w-3 h-3" />
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </motion.div>
    );
}
