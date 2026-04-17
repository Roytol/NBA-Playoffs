
import React, { useState } from "react";
import { Series, Prediction, User, Settings, Leaderboard } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Trophy, Plus, Trash2, Shield, CalendarIcon, Clock, Edit } from "lucide-react";
import TeamLogo from "../components/common/TeamLogo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const NBA_TEAMS = [
    "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets",
    "Chicago Bulls", "Cleveland Cavaliers", "Dallas Mavericks", "Denver Nuggets",
    "Detroit Pistons", "Golden State Warriors", "Houston Rockets", "Indiana Pacers",
    "LA Clippers", "Los Angeles Lakers", "Memphis Grizzlies", "Miami Heat",
    "Milwaukee Bucks", "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks",
    "Oklahoma City Thunder", "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns",
    "Portland Trail Blazers", "Sacramento Kings", "San Antonio Spurs", "Toronto Raptors",
    "Utah Jazz", "Washington Wizards"
];

export default function AdminPage() {
    const [series, setSeries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [user, setUser] = React.useState(null);

    // New series form state
    const [newSeries, setNewSeries] = React.useState({
        round: "first_round",
        conference: "East",
        team1: "",
        team2: "",
        team1_seed: 1,
        team2_seed: 8,
        prediction_deadline: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: "upcoming"
    });

    const [championSettings, setChampionSettings] = React.useState({
        champion: "",
        mvp: ""
    });

    const [championMVPDeadline, setChampionMVPDeadline] = React.useState("");
    const [championMVPDeadlineLoading, setChampionMVPDeadlineLoading] = React.useState(false);

    const [championDeadline, setChampionDeadline] = React.useState("");
    const [mvpDeadline, setMvpDeadline] = React.useState("");
    const [deadlinesLoading, setDeadlinesLoading] = React.useState(false);
    const [mvpStatus, setMvpStatus] = React.useState("closed");

    // Update the processing state to include the operation type
    const [processingState, setProcessingState] = useState({
        isProcessing: false,
        operation: "",
        message: ""
    });

    // Modify the editingDeadline state structure
    const [editingDeadline, setEditingDeadline] = useState({
        seriesId: null,
        deadline: null,  // Changed from "" to null for better date handling
        time: "23:59"
    });

    // Function to handle time change
    const handleTimeChange = (time) => {
        setEditingDeadline(prev => ({
            ...prev,
            time
        }));
    };

    // Function to handle date change
    const handleDateChange = (date) => {
        if (date) {
            setEditingDeadline(prev => ({
                ...prev,
                deadline: date
            }));
        }
    };

    // Function to combine date and time for updating
    const getCombinedDateTime = () => {
        if (!editingDeadline.deadline) return null;
        const [hours, minutes] = editingDeadline.time.split(':');
        const date = new Date(editingDeadline.deadline);
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        return date.toISOString();
    };

    React.useEffect(() => {
        checkAdmin();
        loadDeadlines();
        loadMVPStatus();
    }, []);

    const checkAdmin = async () => {
        try {
            const userData = await User.me();
            if (!userData?.is_admin) {
                setError("Access denied. Admin privileges required.");
                setLoading(false);
                return;
            }
            setUser(userData);
            await loadData();
        } catch (err) {
            setError("Please log in with admin privileges.");
            setLoading(false);
        }
    };

    const loadData = async () => {
        try {
            const seriesData = await Series.list();
            setSeries(seriesData);
        } catch (err) {
            setError("Failed to load series data.");
        } finally {
            setLoading(false);
        }
    };

    // Start processing state helper
    const startProcessing = (operation, message) => {
        setProcessingState({
            isProcessing: true,
            operation,
            message: message || `Processing ${operation}...`
        });
    };

    // End processing state helper
    const endProcessing = (successMessage = null) => {
        if (successMessage) {
            setProcessingState(prev => ({
                ...prev,
                message: successMessage,
            }));

            // Clear processing state after showing success message
            setTimeout(() => {
                setProcessingState({
                    isProcessing: false,
                    operation: "",
                    message: ""
                });
            }, 1500);
        } else {
            setProcessingState({
                isProcessing: false,
                operation: "",
                message: ""
            });
        }
    };

    const updateDeadline = async (type, newValue) => {
        try {
            startProcessing("deadline", `Updating ${type} deadline...`);
            const settingName = type === "champion"
                ? "champion_prediction_deadline"
                : "mvp_prediction_deadline";

            const settings = await Settings.filter({ setting_name: settingName });

            if (settings.length > 0) {
                await Settings.update(settings[0].id, { setting_value: newValue });
            } else {
                await Settings.create({
                    setting_name: settingName,
                    setting_value: newValue,
                    description: `Deadline for ${type === "champion" ? "Champion" : "Finals MVP"} predictions`
                });
            }

            // Update local state
            if (type === "champion") {
                setChampionDeadline(newValue);
            } else {
                setMvpDeadline(newValue);
            }

            endProcessing(`${type === "champion" ? "Champion" : "Finals MVP"} deadline updated successfully`);
        } catch (err) {
            console.error(`Error updating ${type} deadline:`, err);
            setProcessingState(prev => ({
                ...prev,
                message: `Failed to update ${type} deadline: ${err.message}`
            }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const updateMVPStatus = async (status) => {
        try {
            startProcessing("mvpStatus", `Setting Finals MVP predictions to ${status}...`);
            const settings = await Settings.filter({ setting_name: "mvp_prediction_status" });

            if (settings.length > 0) {
                await Settings.update(settings[0].id, { setting_value: status });
            } else {
                await Settings.create({
                    setting_name: "mvp_prediction_status",
                    setting_value: status,
                    description: "Status of Finals MVP predictions (open/closed)"
                });
            }

            setMvpStatus(status);
            endProcessing(`Finals MVP predictions are now ${status}`);
        } catch (err) {
            console.error("Error updating MVP status:", err);
            setProcessingState(prev => ({
                ...prev,
                message: `Failed to update MVP status: ${err.message}`
            }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const handleAddSeries = async () => {
        try {
            // Validate form fields
            if (!newSeries.team1 || !newSeries.team2 || !newSeries.prediction_deadline) {
                setError("Please fill in all required fields");
                return;
            }

            startProcessing("addSeries", "Adding new series...");

            // Create unique series ID
            const seriesId = `${newSeries.conference.charAt(0)}${newSeries.round}_${Date.now()}`;

            // Set series as active by default to make it visible in dashboard
            const newSeriesData = {
                ...newSeries,
                series_id: seriesId,
                status: "active"
            };

            await Series.create(newSeriesData);

            // Reset form
            setNewSeries({
                round: "first_round",
                conference: "East",
                team1: "",
                team2: "",
                team1_seed: 1,
                team2_seed: 8,
                prediction_deadline: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                status: "active"
            });

            await loadData();
            endProcessing("Series added successfully");
        } catch (err) {
            console.error("Failed to add series:", err);
            setProcessingState(prev => ({
                ...prev,
                message: `Failed to add series: ${err.message}`
            }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const updateSeriesWinner = async (seriesId, winner, games = null) => {
        if (processingState.isProcessing) {
            setError("Another operation is in progress. Please wait.");
            return;
        }

        try {
            startProcessing("updateWinner", "Updating series winner... please wait.");

            const targetSeries = await Series.get(seriesId);

            // For Play-In, we don't need to collect games
            const isPlayIn = targetSeries.round === 'play_in';
            const gamesValue = isPlayIn ? 1 : parseInt(games);

            // First update the series with winner information
            await Series.update(seriesId, {
                winner,
                games: gamesValue,
                status: 'completed'
            });

            // Make sure we have a valid series_id for filtering predictions
            const seriesIdForFilter = targetSeries.series_id;
            if (!seriesIdForFilter) {
                throw new Error("Missing series_id in the series data");
            }

            setProcessingState(prev => ({
                ...prev,
                message: "Updating predictions... please wait."
            }));

            // Fetch all predictions for this series at once
            const predictions = await Prediction.filter({ series_id: seriesIdForFilter });
            console.log(`Found ${predictions.length} predictions for series ${seriesIdForFilter}`);

            // Prepare updates but don't send them yet
            const predictionUpdates = [];

            // Process each prediction
            for (const pred of predictions) {
                let points = 0;
                let isCorrect = pred.winner === winner;

                if (isCorrect) {
                    // For Play-In, simply give 1 point for correct prediction
                    if (isPlayIn) {
                        points = 1;
                    } else {
                        // Base points for correct winner
                        switch (targetSeries.round) {
                            case 'first_round': points = 1; break;
                            case 'second_round': points = 2; break;
                            case 'conference_finals': points = 3; break;
                            case 'finals': points = 4; break;
                            default: points = 1; break;
                        }

                        // Additional points for correct games (only if not play-in)
                        if (parseInt(pred.games) === gamesValue) {
                            let bonusPoints = 0;
                            switch (targetSeries.round) {
                                case 'first_round': bonusPoints = 2; break;
                                case 'second_round': bonusPoints = 2; break;
                                case 'conference_finals': bonusPoints = 3; break;
                                case 'finals': bonusPoints = 4; break;
                            }
                            points += bonusPoints;
                        }
                    }
                }

                // Add to our update queue instead of updating immediately
                predictionUpdates.push({
                    id: pred.id,
                    update: {
                        points_earned: points,
                        is_correct: isCorrect
                    }
                });
            }

            // Now perform updates in batches to avoid rate limits
            setProcessingState(prev => ({
                ...prev,
                message: "Updating predictions in batches... please wait."
            }));
            const BATCH_SIZE = 5;

            for (let i = 0; i < predictionUpdates.length; i += BATCH_SIZE) {
                const batch = predictionUpdates.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(item =>
                    Prediction.update(item.id, item.update)
                ));

                // Small delay between batches
                if (i + BATCH_SIZE < predictionUpdates.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Now update user points in a more controlled way
            setProcessingState(prev => ({
                ...prev,
                message: "Updating user points... please wait."
            }));
            await updateUserPointsInBatches();

            // Finally update the leaderboard
            setProcessingState(prev => ({
                ...prev,
                message: "Updating leaderboard... please wait."
            }));
            await updateLeaderboardInBatches();

            // Reload data
            setProcessingState(prev => ({
                ...prev,
                message: "Reloading data... please wait."
            }));
            await loadData();

            endProcessing("Series winner updated successfully!");
        } catch (err) {
            console.error("Error updating series winner:", err);
            setProcessingState(prev => ({
                ...prev,
                message: `Failed to update series winner: ${err.message}`
            }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const updateUserPointsInBatches = async () => {
        try {
            const users = await User.list();
            const BATCH_SIZE = 5;

            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const userBatch = users.slice(i, i + BATCH_SIZE);

                await Promise.all(userBatch.map(async (user) => {
                    if (!user.email) return;

                    console.log(`Updating points for user: ${user.email}`);
                    const userPreds = await Prediction.filter({ user_email: user.email });

                    const total = userPreds.reduce((sum, p) => {
                        return sum + (p.points_earned || 0);
                    }, 0);

                    console.log(`Total points for ${user.email}: ${total}`);
                    await User.update(user.email, { total_points: total });
                }));

                // Small delay between batches
                if (i + BATCH_SIZE < users.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } catch (error) {
            console.error("Error updating user points:", error);
            throw error;
        }
    };

    const updateLeaderboardInBatches = async () => {
        try {
            const users = await User.list();
            const BATCH_SIZE = 5;

            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const userBatch = users.slice(i, i + BATCH_SIZE);

                await Promise.all(userBatch.map(async (user) => {
                    if (!user.email) return;

                    // Get user predictions
                    const userPreds = await Prediction.filter({ user_email: user.email });
                    const totalPoints = userPreds.reduce((sum, p) => sum + (p.points_earned || 0), 0);

                    // Update or create leaderboard entry
                    const existingEntries = await Leaderboard.filter({ player_id: user.email });

                    if (existingEntries.length > 0) {
                        await Leaderboard.update(existingEntries[0].id, {
                            total_points: totalPoints,
                            player_name: user.full_name || "Anonymous Player",
                            last_updated: new Date().toISOString()
                        });
                    } else {
                        await Leaderboard.create({
                            player_id: user.email,
                            player_name: user.full_name || "Anonymous Player",
                            total_points: totalPoints,
                            last_updated: new Date().toISOString()
                        });
                    }
                }));

                // Small delay between batches
                if (i + BATCH_SIZE < users.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } catch (err) {
            console.error("Error updating leaderboard:", err);
            throw err;
        }
    };

    const handleDeleteSeries = async (id) => {
        if (processingState.isProcessing) {
            setError("Another operation is in progress. Please wait.");
            return;
        }

        try {
            startProcessing("deleteSeries", "Deleting series... please wait.");

            // First, get all predictions for this series
            const seriesData = await Series.get(id);

            if (!seriesData) {
                setError("Series not found");
                endProcessing();
                return;
            }

            // Find all predictions associated with this series
            const predictions = await Prediction.filter({ series_id: seriesData.series_id });

            // Delete predictions in batches
            const BATCH_SIZE = 5;

            for (let i = 0; i < predictions.length; i += BATCH_SIZE) {
                const batch = predictions.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(prediction => Prediction.delete(prediction.id)));

                // Small delay between batches
                if (i + BATCH_SIZE < predictions.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Then delete the series
            await Series.delete(id);

            // Update user points in batches
            setProcessingState(prev => ({
                ...prev,
                message: "Updating user points... please wait."
            }));
            await updateUserPointsInBatches();

            // Update the leaderboard in batches
            setProcessingState(prev => ({
                ...prev,
                message: "Updating leaderboard... please wait."
            }));
            await updateLeaderboardInBatches();

            // Reload data
            setProcessingState(prev => ({
                ...prev,
                message: "Reloading data... please wait."
            }));
            await loadData();

            endProcessing("Series and associated predictions deleted successfully");
        } catch (err) {
            console.error("Failed to delete series:", err);
            setProcessingState(prev => ({
                ...prev,
                message: `Failed to delete series: ${err.message}`
            }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const loadChampionMVPDeadline = async () => {
        try {
            const settings = await Settings.filter({ setting_name: "champion_mvp_deadline" });
            if (settings.length > 0) {
                setChampionMVPDeadline(settings[0].setting_value);
            }
        } catch (err) {
            console.error("Error loading champion MVP deadline:", err);
        }
    };

    const updateChampionMVPDeadline = async (newValue) => {
        try {
            setChampionMVPDeadlineLoading(true);
            const settings = await Settings.filter({ setting_name: "champion_mvp_deadline" });

            if (settings.length > 0) {
                await Settings.update(settings[0].id, { setting_value: newValue });
            } else {
                await Settings.create({
                    setting_name: "champion_mvp_deadline",
                    setting_value: newValue,
                    description: "Deadline for Champion and MVP predictions"
                });
            }
            setChampionMVPDeadline(newValue);
        } catch (err) {
            console.error("Error updating champion MVP deadline:", err);
            setError("Failed to update deadline");
        } finally {
            setChampionMVPDeadlineLoading(false);
        }
    };

    const updateAllUserPoints = async () => {
        try {
            const users = await User.list();
            for (const user of users) {
                if (!user.email) continue;

                console.log(`Updating points for user: ${user.email}`);
                const userPreds = await Prediction.filter({ user_email: user.email });

                const total = userPreds.reduce((sum, p) => {
                    console.log(`Prediction ${p.id} worth ${p.points_earned || 0} points`);
                    return sum + (p.points_earned || 0);
                }, 0);

                console.log(`Total points for ${user.email}: ${total}`);
                await User.update(user.email, { total_points: total });
            }
        } catch (error) {
            console.error("Error updating user points:", error);
        }
    };

    const updateLeaderboard = async () => {
        try {
            // Get all users
            const users = await User.list();

            // For each user, calculate their total points
            for (const user of users) {
                if (!user.email) continue;

                // First update user total points
                const userPreds = await Prediction.filter({ user_email: user.email });
                const totalPoints = userPreds.reduce((sum, p) => sum + (p.points_earned || 0), 0);

                // Then update or create leaderboard entry
                // First check if entry exists
                const existingEntries = await Leaderboard.filter({ player_id: user.email });

                if (existingEntries.length > 0) {
                    // Update existing entry
                    await Leaderboard.update(existingEntries[0].id, {
                        total_points: totalPoints,
                        player_name: user.full_name || "Anonymous Player",
                        last_updated: new Date().toISOString()
                    });
                } else {
                    // Create new entry
                    await Leaderboard.create({
                        player_id: user.email,
                        player_name: user.full_name || "Anonymous Player",
                        total_points: totalPoints,
                        last_updated: new Date().toISOString()
                    });
                }
            }
        } catch (err) {
            console.error("Error updating leaderboard:", err);
            throw err;
        }
    };

    const handleChampionMVPUpdate = async () => {
        try {
            startProcessing("championMVP", "Updating champion and MVP winners...");

            const { champion, mvp } = championSettings;

            // Update champion predictions
            const championPreds = await Prediction.filter({ prediction_type: "champion" });
            for (const pred of championPreds) {
                const isCorrect = pred.winner === champion;
                await Prediction.update(pred.id, {
                    is_correct: isCorrect,
                    points_earned: isCorrect ? 5 : 0
                });
            }

            // Update MVP predictions
            const mvpPreds = await Prediction.filter({ prediction_type: "finals_mvp" });
            for (const pred of mvpPreds) {
                const isCorrect = pred.winner.toLowerCase() === mvp.toLowerCase();
                await Prediction.update(pred.id, {
                    is_correct: isCorrect,
                    points_earned: isCorrect ? 3 : 0
                });
            }

            // Update user total points
            setProcessingState(prev => ({
                ...prev,
                message: "Updating user points..."
            }));
            await updateAllUserPoints();

            // Update leaderboard
            setProcessingState(prev => ({
                ...prev,
                message: "Updating leaderboard..."
            }));
            await updateLeaderboard();

            endProcessing("Champion and MVP updated successfully");
        } catch (err) {
            console.error("Error updating champion/MVP:", err);
            setProcessingState(prev => ({
                ...prev,
                message: `Failed to update champion/MVP: ${err.message}`
            }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const updateLeaderboardButton = async () => {
        if (processingState.isProcessing) {
            setError("Another operation is in progress. Please wait.");
            return;
        }

        try {
            startProcessing("leaderboard", "Updating leaderboard... please wait.");

            await updateLeaderboardInBatches();

            endProcessing("Leaderboard updated successfully!");
        } catch (err) {
            console.error("Error updating leaderboard:", err);
            setProcessingState(prev => ({
                ...prev,
                message: `Failed to update leaderboard: ${err.message}`
            }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const loadDeadlines = async () => {
        try {
            const settings = await Settings.list();
            const championSetting = settings.find(s => s.setting_name === "champion_prediction_deadline");
            const mvpSetting = settings.find(s => s.setting_name === "mvp_prediction_deadline");

            if (championSetting) {
                setChampionDeadline(championSetting.setting_value);
            }

            if (mvpSetting) {
                setMvpDeadline(mvpSetting.setting_value);
            }
        } catch (err) {
            console.error("Error loading deadlines:", err);
        }
    };

    const loadMVPStatus = async () => {
        try {
            const settings = await Settings.list();
            const mvpStatusSetting = settings.find(s => s.setting_name === "mvp_prediction_status");
            if (mvpStatusSetting) {
                setMvpStatus(mvpStatusSetting.setting_value);
            }
        } catch (err) {
            console.error("Error loading MVP status:", err);
        }
    };

    // Function to update a series deadline
    const updateSeriesDeadline = async (seriesId, newDeadline) => {
        if (processingState.isProcessing) {
            setError("Another operation is in progress. Please wait.");
            return;
        }

        try {
            startProcessing("updateDeadline", "Updating series deadline...");

            await Series.update(seriesId, {
                prediction_deadline: newDeadline
            });

            // Clear editing state
            setEditingDeadline({
                seriesId: null,
                deadline: null,
                time: "23:59"
            });

            // Reload series data
            await loadData();

            endProcessing("Series deadline updated successfully");
        } catch (err) {
            console.error("Failed to update series deadline:", err);
            setProcessingState(prev => ({
                ...prev,
                message: `Failed to update deadline: ${err.message}`
            }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    // Update how we set the initial state when editing
    const handleEditDeadline = (series) => {
        const currentDate = new Date(series.prediction_deadline);
        setEditingDeadline({
            seriesId: series.id,
            deadline: currentDate,
            time: currentDate.toTimeString().slice(0, 5) // Get current time in HH:mm format
        });
    };

    if (!user?.is_admin) {
        return (
            <div className="max-w-6xl mx-auto p-3 sm:p-6">
                <Alert variant="destructive">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>Access restricted to administrators.</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-3 sm:p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-3 sm:p-6">
            <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Admin</h1>
            <p className="text-gray-500 mb-4 sm:mb-6 text-sm">Manage playoff predictions</p>

            {error && (
                <Alert variant="destructive" className="mb-4 sm:mb-6">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>Access restricted to administrators.</AlertDescription>
                </Alert>
            )}

            {/* Prediction Deadlines Card */}
            <Card className="mb-4 sm:mb-8">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Prediction Deadlines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 py-3 px-4 sm:py-4 sm:px-6">
                    {/* Champion Deadline */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Champion Prediction Deadline</label>
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                            <div className="grid w-full gap-1.5">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal text-sm"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {championDeadline ?
                                                format(new Date(championDeadline), "PPP 'at' p") :
                                                "Set deadline"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={championDeadline ? new Date(championDeadline) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    const endOfDay = new Date(date);
                                                    endOfDay.setHours(23, 59, 59, 999);
                                                    updateDeadline("champion", endOfDay.toISOString());
                                                }
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button
                                className="w-full sm:w-32"
                                disabled={processingState.isProcessing}
                                onClick={() => updateDeadline("champion", new Date().toISOString())}
                            >
                                Set to Now
                            </Button>
                        </div>
                    </div>

                    {/* MVP Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <label className="text-sm font-medium">Finals MVP Predictions</label>
                            <Select
                                value={mvpStatus}
                                onValueChange={updateMVPStatus}
                                disabled={processingState.isProcessing}
                            >
                                <SelectTrigger className="w-full sm:w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="closed">Closed</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-600">Prediction Deadline</label>
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                <div className="grid w-full gap-1.5">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start text-left font-normal text-sm"
                                                disabled={mvpStatus === "closed" || processingState.isProcessing}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {mvpDeadline ?
                                                    format(new Date(mvpDeadline), "PPP 'at' p") :
                                                    "Set deadline"}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={mvpDeadline ? new Date(mvpDeadline) : undefined}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        const endOfDay = new Date(date);
                                                        endOfDay.setHours(23, 59, 59, 999);
                                                        updateDeadline("mvp", endOfDay.toISOString());
                                                    }
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <Button
                                    className="w-full sm:w-32"
                                    disabled={processingState.isProcessing || mvpStatus === "closed"}
                                    onClick={() => updateDeadline("mvp", new Date().toISOString())}
                                >
                                    Set to Now
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Champion & MVP Section */}
            <Card className="mb-4 sm:mb-8">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                        Finals Results
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 py-3 px-4 sm:py-4 sm:px-6">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">NBA Champion</label>
                            <Select
                                value={championSettings.champion}
                                onValueChange={(value) => setChampionSettings(prev => ({ ...prev, champion: value }))}
                                disabled={processingState.isProcessing}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Champion" />
                                </SelectTrigger>
                                <SelectContent>
                                    {NBA_TEAMS.map(team => (
                                        <SelectItem key={team} value={team}>{team}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Finals MVP</label>
                            <Input
                                placeholder="Enter Finals MVP name"
                                value={championSettings.mvp}
                                onChange={(e) => setChampionSettings(prev => ({ ...prev, mvp: e.target.value }))}
                                disabled={processingState.isProcessing}
                            />
                        </div>
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleChampionMVPUpdate}
                        disabled={!championSettings.champion || !championSettings.mvp || processingState.isProcessing}
                    >
                        Update Finals Results
                    </Button>
                </CardContent>
            </Card>

            {/* Add New Series */}
            <Card className="mb-4 sm:mb-8">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        Add New Series
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-3 px-4 sm:py-4 sm:px-6">
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Round</label>
                                <Select
                                    value={newSeries.round}
                                    onValueChange={(value) => setNewSeries(prev => ({ ...prev, round: value }))}
                                    disabled={processingState.isProcessing}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Select round" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="play_in">Play-In</SelectItem>
                                        <SelectItem value="first_round">First Round</SelectItem>
                                        <SelectItem value="second_round">Second Round</SelectItem>
                                        <SelectItem value="conference_finals">Conference Finals</SelectItem>
                                        <SelectItem value="finals">NBA Finals</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Conference</label>
                                <Select
                                    value={newSeries.conference}
                                    onValueChange={(value) => setNewSeries(prev => ({ ...prev, conference: value }))}
                                    disabled={processingState.isProcessing}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Select conference" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="East">Eastern</SelectItem>
                                        <SelectItem value="West">Western</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Team 1</label>
                                <div className="flex gap-2">
                                    <Select
                                        value={newSeries.team1}
                                        onValueChange={(value) => setNewSeries(prev => ({ ...prev, team1: value }))}
                                        disabled={processingState.isProcessing}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue placeholder="Select team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {NBA_TEAMS.map(team => (
                                                <SelectItem key={team} value={team}>{team}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        placeholder="Seed"
                                        className="w-20 text-sm"
                                        value={newSeries.team1_seed}
                                        onChange={(e) => setNewSeries(prev => ({ ...prev, team1_seed: parseInt(e.target.value) }))}
                                        disabled={processingState.isProcessing}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Team 2</label>
                                <div className="flex gap-2">
                                    <Select
                                        value={newSeries.team2}
                                        onValueChange={(value) => setNewSeries(prev => ({ ...prev, team2: value }))}
                                        disabled={processingState.isProcessing}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue placeholder="Select team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {NBA_TEAMS.map(team => (
                                                <SelectItem key={team} value={team}>{team}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        placeholder="Seed"
                                        className="w-20 text-sm"
                                        value={newSeries.team2_seed}
                                        onChange={(e) => setNewSeries(prev => ({ ...prev, team2_seed: parseInt(e.target.value) }))}
                                        disabled={processingState.isProcessing}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Prediction Deadline</label>
                            <Input
                                type="datetime-local"
                                className="text-sm"
                                value={newSeries.prediction_deadline}
                                onChange={(e) => setNewSeries(prev => ({ ...prev, prediction_deadline: e.target.value }))}
                                disabled={processingState.isProcessing}
                            />
                        </div>

                        <Button onClick={handleAddSeries} disabled={processingState.isProcessing}>Add Series</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Existing Series */}
            <Card>
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Manage Series</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Series</TableHead>
                                    <TableHead className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Teams</TableHead>
                                    <TableHead className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Status</TableHead>
                                    <TableHead className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {series.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                                            {s.conference} {s.round.split('_').map(w =>
                                                w.charAt(0).toUpperCase() + w.slice(1)
                                            ).join(' ')}

                                            {/* Add deadline info and edit button */}
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(s.prediction_deadline), "MMM d, h:mm a")}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 ml-1"
                                                    disabled={processingState.isProcessing || s.status === 'completed'}
                                                    onClick={() => handleEditDeadline(s)}
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-2 px-3 sm:px-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <TeamLogo team={s.team1} className="w-5 h-5 sm:w-6 sm:h-6" />
                                                    <span className="text-xs sm:text-sm">{s.team1} ({s.team1_seed})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <TeamLogo team={s.team2} className="w-5 h-5 sm:w-6 sm:h-6" />
                                                    <span className="text-xs sm:text-sm">{s.team2} ({s.team2_seed})</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                            {s.status === 'completed' && (
                                                <div className="text-xs text-gray-500">
                                                    {s.winner} in {s.games}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 px-3 sm:px-4">
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                {s.round === 'play_in' ? (
                                                    <Select
                                                        value={s.winner || ""}
                                                        onValueChange={(winner) => updateSeriesWinner(s.id, winner)}
                                                        disabled={processingState.isProcessing}
                                                    >
                                                        <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
                                                            <SelectValue placeholder="Set Winner" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value={s.team1}>{s.team1}</SelectItem>
                                                            <SelectItem value={s.team2}>{s.team2}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Select
                                                        value={s.winner || ""}
                                                        onValueChange={(winner) => {
                                                            const games = prompt(
                                                                `Enter number of games (4-7)${s.games ? `\nCurrent: ${s.games}` : ''}:`
                                                            );
                                                            if (games && !isNaN(games) && games >= 4 && games <= 7) {
                                                                updateSeriesWinner(s.id, winner, games);
                                                            }
                                                        }}
                                                        disabled={processingState.isProcessing}
                                                    >
                                                        <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
                                                            <SelectValue placeholder="Set Winner" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value={s.team1}>{s.team1}</SelectItem>
                                                            <SelectItem value={s.team2}>{s.team2}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => handleDeleteSeries(s.id)}
                                                    disabled={processingState.isProcessing}
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Button
                onClick={updateLeaderboardButton}
                className="mt-4 w-full sm:w-auto"
                disabled={processingState.isProcessing}
            >
                Update Public Leaderboard
            </Button>

            {/* Improve the deadline editing dialog */}
            <Dialog open={editingDeadline.seriesId !== null} onOpenChange={(open) => {
                if (!open) setEditingDeadline({ seriesId: null, deadline: null, time: "23:59" });
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Prediction Deadline</DialogTitle>
                        <DialogDescription>
                            Change the prediction deadline for this series
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                        disabled={processingState.isProcessing}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {editingDeadline.deadline ?
                                            format(editingDeadline.deadline, "PPP") :
                                            "Pick a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={editingDeadline.deadline}
                                        onSelect={handleDateChange}
                                        disabled={processingState.isProcessing}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Time</label>
                            <Input
                                type="time"
                                value={editingDeadline.time}
                                onChange={(e) => handleTimeChange(e.target.value)}
                                className="w-full"
                                disabled={processingState.isProcessing}
                            />
                        </div>

                        {editingDeadline.deadline && (
                            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                New deadline will be set to:
                                <div className="font-medium text-gray-900 mt-1">
                                    {format(getCombinedDateTime(), "PPP 'at' p")}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingDeadline({ seriesId: null, deadline: null, time: "23:59" })}
                            disabled={processingState.isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => updateSeriesDeadline(editingDeadline.seriesId, getCombinedDateTime())}
                            disabled={!editingDeadline.deadline || processingState.isProcessing}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {processingState.isProcessing && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
                        <p className="text-center text-sm sm:text-base text-gray-700">{processingState.message || "Processing... Please wait."}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
