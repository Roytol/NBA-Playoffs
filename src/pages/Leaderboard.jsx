import React from "react";
import { User, Leaderboard, Settings, Prediction, Series } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/db";

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [currentUser, setCurrentUser] = React.useState(null);
    const [lastUpdated, setLastUpdated] = React.useState(null);

    // Past seasons
    const [activeSeason, setActiveSeason] = React.useState(null);
    const [pastSeasons, setPastSeasons] = React.useState([]); // e.g. ["2024", "2023"]
    const [selectedSeason, setSelectedSeason] = React.useState("current");
    const [pastLeaderboard, setPastLeaderboard] = React.useState([]);
    const [pastLoading, setPastLoading] = React.useState(false);

    React.useEffect(() => {
        loadLeaderboard();
        loadSeasonMeta();
    }, []);

    React.useEffect(() => {
        if (selectedSeason && selectedSeason !== "current") {
            loadPastSeasonLeaderboard(selectedSeason);
        }
    }, [selectedSeason]);

    const loadSeasonMeta = async () => {
        try {
            const settings = await Settings.list();
            const seasonSetting = settings.find(s => s.setting_name === "active_season");
            if (seasonSetting) setActiveSeason(seasonSetting.setting_value);

            // Find distinct past seasons from archived predictions/series
            const { data } = await supabase
                .from("Prediction")
                .select("season")
                .not("season", "is", null);

            if (data) {
                const uniqueSeasons = [...new Set(data.map(d => d.season))].sort((a, b) => b - a);
                setPastSeasons(uniqueSeasons);
            }
        } catch (err) {
            console.error("Failed to load season meta:", err);
        }
    };

    const loadPastSeasonLeaderboard = async (season) => {
        setPastLoading(true);
        try {
            // Aggregate points from archived predictions for the given season
            const { data, error } = await supabase
                .from("Prediction")
                .select("user_email, points_earned")
                .eq("season", season);

            if (error) throw error;

            // Group by user and sum points
            const userTotals = {};
            for (const pred of (data || [])) {
                if (!pred.user_email) continue;
                userTotals[pred.user_email] = (userTotals[pred.user_email] || 0) + (pred.points_earned || 0);
            }

            // Fetch user names
            const users = await User.list();
            const userMap = Object.fromEntries(users.map(u => [u.email, u.full_name]));

            const sorted = Object.entries(userTotals)
                .map(([email, points]) => ({ email, name: userMap[email] || email, points }))
                .sort((a, b) => b.points - a.points);

            setPastLeaderboard(sorted);
        } catch (err) {
            console.error("Failed to load past season:", err);
            setPastLeaderboard([]);
        } finally {
            setPastLoading(false);
        }
    };

    const loadLeaderboard = async () => {
        setLoading(true);
        setError(null);
        try {
            try {
                const userData = await User.me();
                setCurrentUser(userData);
            } catch (err) { /* not logged in */ }

            const [leaderboardData, allPredictions, allSeries] = await Promise.all([
                Leaderboard.list(),
                Prediction.list(),
                Series.list()
            ]);

            if (!leaderboardData) throw new Error("Failed to load leaderboard data");

            // Evaluate hot streaks
            const completedSeriesIds = new Set((allSeries || []).filter(s => s.status === 'completed').map(s => s.series_id || s.id));
            const userStreaks = {};

            const settledPredictions = (allPredictions || []).filter(p => {
                if (p.prediction_type === 'champion' || p.prediction_type === 'finals_mvp') {
                    return p.points_earned > 0; 
                }
                return completedSeriesIds.has(p.series_id);
            });

            const groupedByEmail = {};
            for (let p of settledPredictions) {
                if (!groupedByEmail[p.user_email]) groupedByEmail[p.user_email] = [];
                groupedByEmail[p.user_email].push(p);
            }

            for (let [email, preds] of Object.entries(groupedByEmail)) {
                // sort by updated_at descending (most recently resolved first)
                preds.sort((a,b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
                
                let streak = 0;
                for (let p of preds) {
                    if (p.points_earned > 0) streak++;
                    else break; // A loss snaps the streak
                }
                if (streak >= 3) {
                    userStreaks[email] = streak;
                }
            }

            const sorted = [...leaderboardData].map(entry => ({
                ...entry,
                hotStreak: userStreaks[entry.player_id] || 0
            })).sort((a, b) => b.total_points - a.total_points);

            const latest = sorted.reduce((latest, e) => {
                if (e.last_updated && (!latest || new Date(e.last_updated) > new Date(latest))) return e.last_updated;
                return latest;
            }, null);

            setLastUpdated(latest);
            setLeaderboard(sorted);
        } catch (err) {
            console.error("Error loading leaderboard:", err);
            setError("Unable to load leaderboard data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const RankIcon = ({ index }) => {
        if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
        if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
        if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="text-sm text-gray-500">{index + 1}</span>;
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Leaderboard</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">See how players stack up</p>
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Leaderboard</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">See how players stack up</p>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={loadLeaderboard} className="mt-4">Try Again</Button>
            </div>
        );
    }

    const allTabs = ["current", ...pastSeasons];

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Leaderboard</h1>
            <p className="text-gray-500 mb-4 sm:mb-6 text-sm">See how players stack up</p>

            <Tabs value={selectedSeason} onValueChange={setSelectedSeason}>
                {allTabs.length > 1 && (
                    <TabsList className="mb-4">
                        <TabsTrigger value="current">
                            {activeSeason ? `${activeSeason} Season` : "Current Season"}
                        </TabsTrigger>
                        {pastSeasons.map(season => (
                            <TabsTrigger key={season} value={season}>{season}</TabsTrigger>
                        ))}
                    </TabsList>
                )}

                {/* Current Season */}
                <TabsContent value="current">
                    <Card>
                        <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                                Current Standings
                            </CardTitle>
                            {lastUpdated && (
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Live — updates automatically
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="w-12 sm:w-14 py-2 px-3 sm:px-4 text-xs sm:text-sm">Rank</TableHead>
                                            <TableHead className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Player</TableHead>
                                            <TableHead className="text-center py-2 px-3 sm:px-4 text-xs sm:text-sm">Points</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaderboard.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                                    No predictions made yet
                                                </TableCell>
                                            </TableRow>
                                        ) : leaderboard.map((entry, index) => (
                                            <TableRow key={entry.player_id}
                                                className={entry.player_id === currentUser?.email ? "bg-blue-50" : ""}>
                                                <TableCell className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                                                    <RankIcon index={index} />
                                                </TableCell>
                                                <TableCell className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                                                    <div className="font-medium truncate max-w-[120px] sm:max-w-none flex items-center gap-1.5">
                                                        <Link to={createPageUrl("UserPredictions") + "?id=" + entry.player_id}
                                                            className={`transition-colors ${entry.hotStreak >= 3 ? 'text-orange-600 hover:text-orange-700 font-bold drop-shadow-sm' : 'hover:text-blue-600'}`}>
                                                            {entry.player_name}
                                                        </Link>
                                                        {entry.hotStreak >= 3 && (
                                                            <span title={`${entry.hotStreak} Playoff Prediction Validations in a row!`} className="cursor-help animate-bounce drop-shadow-md pb-1 text-sm">
                                                                🔥
                                                            </span>
                                                        )}
                                                        {entry.player_id === currentUser?.email && (
                                                            <Badge className="ml-1 bg-blue-100 text-blue-800 text-[10px] uppercase font-bold p-1 h-4 flex items-center">You</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center py-2 px-3 sm:px-4 text-xs sm:text-sm">
                                                    <span className="font-semibold">{entry.total_points}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Past Season Tabs */}
                {pastSeasons.map(season => (
                    <TabsContent key={season} value={season}>
                        <Card>
                            <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                                    {season} Final Standings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {pastLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-gray-50">
                                                <TableRow>
                                                    <TableHead className="w-12 py-2 px-3 text-xs">Rank</TableHead>
                                                    <TableHead className="py-2 px-3 text-xs">Player</TableHead>
                                                    <TableHead className="text-center py-2 px-3 text-xs">Points</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pastLeaderboard.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center py-8 text-gray-500 text-sm">
                                                            No archived data for {season}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : pastLeaderboard.map((entry, index) => (
                                                    <TableRow key={entry.email}>
                                                        <TableCell className="py-2 px-3 text-xs">
                                                            <RankIcon index={index} />
                                                        </TableCell>
                                                        <TableCell className="py-2 px-3 text-xs font-medium">
                                                            {entry.name}
                                                        </TableCell>
                                                        <TableCell className="text-center py-2 px-3 text-xs font-semibold">
                                                            {entry.points}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}