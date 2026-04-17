import React from "react";
import { User, Leaderboard } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [currentUser, setCurrentUser] = React.useState(null);
    const [lastUpdated, setLastUpdated] = React.useState(null);

    React.useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        setLoading(true);
        setError(null);

        try {
            // Get current user if logged in (but don't fail if not)
            try {
                const userData = await User.me();
                setCurrentUser(userData);
            } catch (err) {
                // User not logged in - that's okay
                console.log("No user logged in");
            }

            // Load leaderboard data from dedicated entity
            const leaderboardData = await Leaderboard.list();

            if (!leaderboardData) {
                throw new Error("Failed to load leaderboard data");
            }

            // Sort by points (highest first)
            const sortedLeaderboard = [...leaderboardData].sort(
                (a, b) => b.total_points - a.total_points
            );

            // Find latest update time
            const latestUpdate = sortedLeaderboard.reduce((latest, entry) => {
                if (entry.last_updated && (!latest || new Date(entry.last_updated) > new Date(latest))) {
                    return entry.last_updated;
                }
                return latest;
            }, null);

            setLastUpdated(latestUpdate);
            setLeaderboard(sortedLeaderboard);
        } catch (err) {
            console.error("Error loading leaderboard:", err);
            setError("Unable to load leaderboard data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Leaderboard</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">See how players stack up</p>
                <div className="flex justify-center items-center py-8 sm:py-12">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
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
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
                <Button onClick={loadLeaderboard} className="mt-4">Try Again</Button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Leaderboard</h1>
            <p className="text-gray-500 mb-4 sm:mb-6 text-sm">See how players stack up</p>

            <Card>
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                        Current Standings
                    </CardTitle>
                    {lastUpdated && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1 sm:mt-0">
                            <Clock className="w-3 h-3" />
                            Last updated: {format(new Date(lastUpdated), "MMM d, h:mm a")}
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
                                ) : (
                                    leaderboard.map((entry, index) => (
                                        <TableRow
                                            key={entry.id}
                                            className={entry.player_id === currentUser?.email ? "bg-blue-50" : ""}
                                        >
                                            <TableCell className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                                                {index === 0 ? (
                                                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                                                ) : index === 1 ? (
                                                    <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                                                ) : index === 2 ? (
                                                    <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                                ) : (
                                                    `${index + 1}`
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                                                <div className="font-medium truncate max-w-[120px] sm:max-w-none">
                                                    <Link
                                                        to={createPageUrl("UserPredictions") + "?id=" + entry.player_id}
                                                        className="hover:text-blue-600 transition-colors"
                                                    >
                                                        {entry.player_name}
                                                    </Link>
                                                    {entry.player_id === currentUser?.email && (
                                                        <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs p-1 h-5">You</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-2 px-3 sm:px-4 text-xs sm:text-sm">
                                                <span className="font-semibold">{entry.total_points}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}