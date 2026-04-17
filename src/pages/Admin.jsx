import React, { useState, useEffect } from "react";
import { User, Settings, Series, Prediction } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Trophy, RefreshCw, Settings as SettingsIcon, Users, Trash2,
    CalendarIcon, ShieldAlert, Shield, AlertTriangle, ClipboardList,
    RotateCcw, Check, Loader2
} from "lucide-react";
import { forceRefreshAll, getTeamNames } from "@/api/nbaApi";
import { syncPlayoffSeries } from "@/api/nbaSync";
import { supabase } from "@/lib/db";

// Default scoring rules (fallback if none in DB yet)
const DEFAULT_SCORING_RULES = {
    play_in:           { winner: 1, games: 0 },
    first_round:       { winner: 1, games: 2 },
    second_round:      { winner: 2, games: 2 },
    conference_finals: { winner: 3, games: 3 },
    finals:            { winner: 4, games: 4 },
    champion:          { winner: 5, games: null },
    finals_mvp:        { winner: 3, games: null },
};

const ROUND_LABELS = {
    play_in:           "Play-In Games",
    first_round:       "First Round",
    second_round:      "Conference Semifinals",
    conference_finals: "Conference Finals",
    finals:            "NBA Finals",
    champion:          "Champion Pick (Pre-playoffs)",
    finals_mvp:        "Finals MVP Pick (Pre-finals)",
};


export default function AdminPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [allSeries, setAllSeries] = useState([]);
    const [allPredictions, setAllPredictions] = useState([]);
    const [activeSeason, setActiveSeason] = useState("2025");

    // API Sync
    const [apiSyncing, setApiSyncing] = useState(false);
    const [apiSyncMessage, setApiSyncMessage] = useState("");
    const [nbaTeams, setNbaTeams] = useState([]);

    // Settings
    const [championDeadline, setChampionDeadline] = useState("");
    const [mvpDeadline, setMvpDeadline] = useState("");
    const [championSettings, setChampionSettings] = useState({ champion: "", mvp: "" });
    const [processingState, setProcessingState] = useState({ isProcessing: false, operation: "", message: "" });

    // Scoring Rules
    const [scoringRules, setScoringRules] = useState(DEFAULT_SCORING_RULES);
    const [savingRules, setSavingRules] = useState(false);
    const [rulesSaved, setRulesSaved] = useState(false);

    // Season Transition
    const [seasonDialogOpen, setSeasonDialogOpen] = useState(false);
    const [newSeasonYear, setNewSeasonYear] = useState("");
    const [seasonResetting, setSeasonResetting] = useState(false);
    const [seasonResetLog, setSeasonResetLog] = useState([]);

    useEffect(() => {
        checkAdmin();
        loadAllData();
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
        } catch (err) {
            setError("Please log in with admin privileges.");
            setLoading(false);
        }
    };

    const loadAllData = async () => {
        try {
            const [usersData, seriesData, predictionsData, settingsData, teams] = await Promise.all([
                User.list(),
                Series.list(),
                Prediction.list(),
                Settings.list(),
                getTeamNames().catch(() => []),
            ]);

            setAllUsers(usersData || []);
            setAllSeries(seriesData || []);
            setAllPredictions(predictionsData || []);
            if (teams?.length > 0) setNbaTeams(teams);

            // Parse settings
            for (const s of (settingsData || [])) {
                if (s.setting_name === "champion_prediction_deadline") setChampionDeadline(s.setting_value);
                if (s.setting_name === "mvp_prediction_deadline") setMvpDeadline(s.setting_value);
                if (s.setting_name === "champion_mvp_winners") {
                    try { setChampionSettings(JSON.parse(s.setting_value)); } catch(e) {}
                }
                if (s.setting_name === "scoring_rules") {
                    try { setScoringRules(JSON.parse(s.setting_value)); } catch(e) {}
                }
                if (s.setting_name === "active_season") setActiveSeason(s.setting_value);
            }
        } catch (err) {
            console.error("Failed to load admin data:", err);
            setError("Failed to load some dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    // ---- Processing Helpers ----
    const startProcessing = (operation, message) => setProcessingState({ isProcessing: true, operation, message });
    const endProcessing = (successMessage = null) => {
        if (successMessage) {
            setProcessingState(prev => ({ ...prev, message: successMessage }));
            setTimeout(() => setProcessingState({ isProcessing: false, operation: "", message: "" }), 2000);
        } else {
            setProcessingState({ isProcessing: false, operation: "", message: "" });
        }
    };

    // ---- Handlers ----
    const handleApiSync = async () => {
        setApiSyncing(true);
        setApiSyncMessage("Refreshing API cache...");
        try {
            await forceRefreshAll();
            setApiSyncMessage("Syncing playoff brackets and live scores...");
            await syncPlayoffSeries();
            setApiSyncMessage("Sync complete!");
            setTimeout(() => { setApiSyncMessage(""); setApiSyncing(false); }, 3000);
        } catch (err) {
            setApiSyncMessage(`Sync failed: ${err.message}`);
            setTimeout(() => { setApiSyncMessage(""); setApiSyncing(false); }, 3000);
        }
    };

    const upsertSetting = async (name, value) => {
        const existing = await Settings.filter({ setting_name: name });
        if (existing.length > 0) {
            await Settings.update(existing[0].id, { setting_value: value });
        } else {
            await Settings.create({ setting_name: name, setting_value: value });
        }
    };

    const updateDeadline = async (type, newValue) => {
        try {
            startProcessing(`deadline-${type}`, `Updating ${type} deadline...`);
            const name = type === "champion" ? "champion_prediction_deadline" : "mvp_prediction_deadline";
            await upsertSetting(name, newValue);
            if (type === "champion") setChampionDeadline(newValue);
            else setMvpDeadline(newValue);
            endProcessing(`${type === "champion" ? "Champion" : "MVP"} deadline updated.`);
        } catch (err) {
            setProcessingState(prev => ({ ...prev, message: `Failed: ${err.message}` }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const saveChampionMVPSettings = async () => {
        try {
            startProcessing("winners", "Saving champion and MVP...");
            await upsertSetting("champion_mvp_winners", JSON.stringify(championSettings));
            endProcessing("Champion and MVP winners saved — trigger will auto-score!");
        } catch (err) {
            setProcessingState(prev => ({ ...prev, message: `Failed: ${err.message}` }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const saveScoringRules = async () => {
        setSavingRules(true);
        setRulesSaved(false);
        try {
            await upsertSetting("scoring_rules", JSON.stringify(scoringRules));
            setRulesSaved(true);
            setTimeout(() => setRulesSaved(false), 3000);
        } catch (err) {
            console.error("Failed to save scoring rules:", err);
        } finally {
            setSavingRules(false);
        }
    };

    const updateRuleField = (round, field, value) => {
        setScoringRules(prev => ({
            ...prev,
            [round]: { ...prev[round], [field]: parseInt(value) || 0 }
        }));
    };

    const handleDeleteUser = async (email) => {
        if (!confirm(`Delete ${email} and all their predictions?`)) return;
        try {
            startProcessing("delete-user", `Deleting ${email}...`);
            await User.delete(email);
            setAllUsers(allUsers.filter(u => u.email !== email));
            endProcessing(`Deleted ${email}.`);
        } catch (err) {
            setProcessingState(prev => ({ ...prev, message: `Failed: ${err.message}` }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const handleToggleAdmin = async (targetUser) => {
        const newIsAdmin = !targetUser.is_admin;
        const action = newIsAdmin ? "promote to Admin" : "demote to Player";
        if (!confirm(`${action} ${targetUser.full_name || targetUser.email}?`)) return;
        try {
            await User.update(targetUser.email, { is_admin: newIsAdmin });
            // Optimistic UI update
            setAllUsers(prev => prev.map(u =>
                u.email === targetUser.email ? { ...u, is_admin: newIsAdmin } : u
            ));
        } catch (err) {
            console.error("Failed to toggle admin:", err);
        }
    };

    // ---- Season Reset ----
    const executeSeasonReset = async () => {
        if (!newSeasonYear || newSeasonYear.trim().length !== 4) return;
        setSeasonResetting(true);
        setSeasonResetLog([]);

        const log = (msg) => setSeasonResetLog(prev => [...prev, msg]);

        try {
            // Step 1: Stamp current Predictions with current season
            log(`📦 Archiving ${allPredictions.length} predictions as season ${activeSeason}...`);
            const { error: predError } = await supabase
                .from("Prediction")
                .update({ season: activeSeason })
                .is("season", null);
            if (predError) throw predError;
            log("✅ Predictions archived.");

            // Step 2: Stamp current Series
            log(`📦 Archiving ${allSeries.length} series as season ${activeSeason}...`);
            const { error: seriesError } = await supabase
                .from("Series")
                .update({ season: activeSeason })
                .is("season", null);
            if (seriesError) throw seriesError;
            log("✅ Series archived.");

            // Step 3: Reset all user points
            log(`👥 Resetting ${allUsers.length} user point totals...`);
            const { error: userError } = await supabase
                .from("User")
                .update({ total_points: 0 })
                .not("email", "is", null);
            if (userError) throw userError;
            log("✅ User points reset.");

            // Step 4: Clear API cache
            log("🧹 Clearing API cache...");
            const { error: cacheError } = await supabase
                .from("api_cache")
                .delete()
                .not("cache_key", "is", null);
            if (cacheError) throw cacheError;
            log("✅ API cache cleared.");

            // Step 5: Update active season
            log(`🗓️ Setting active season to ${newSeasonYear}...`);
            await upsertSetting("active_season", newSeasonYear);
            setActiveSeason(newSeasonYear);
            log(`✅ Active season is now ${newSeasonYear}!`);

            log("🎉 Season transition complete! The app is ready for the new season.");
        } catch (err) {
            log(`❌ Error: ${err.message}`);
            console.error("Season reset error:", err);
        } finally {
            setSeasonResetting(false);
        }
    };

    if (loading) return <div className="flex h-[50vh] items-center justify-center p-8">Loading admin dashboard...</div>;

    if (error) {
        return (
            <div className="flex flex-col h-[50vh] items-center justify-center p-8 gap-4">
                <ShieldAlert className="h-16 w-16 text-red-500" />
                <h1 className="text-2xl font-bold">Admin Area</h1>
                <p className="text-red-600">{error}</p>
                <Button onClick={() => window.location.href = '/'}>Return Home</Button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Active season: <Badge variant="outline" className="ml-1 font-mono">{activeSeason}</Badge>
                </p>
            </div>

            <Tabs defaultValue="series">
                <TabsList className="mb-6 w-full grid grid-cols-4 sm:grid-cols-4">
                    <TabsTrigger value="series" className="text-xs sm:text-sm">
                        <ClipboardList className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Series
                    </TabsTrigger>
                    <TabsTrigger value="results" className="text-xs sm:text-sm">
                        <Trophy className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Results
                    </TabsTrigger>
                    <TabsTrigger value="scoring" className="text-xs sm:text-sm">
                        <SettingsIcon className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Rules
                    </TabsTrigger>
                    <TabsTrigger value="season" className="text-xs sm:text-sm">
                        <RotateCcw className="w-3.5 h-3.5 mr-1 sm:mr-2" /> Season
                    </TabsTrigger>
                </TabsList>

                {/* ============================================ */}
                {/* TAB 1: SERIES MANAGEMENT                    */}
                {/* ============================================ */}
                <TabsContent value="series" className="space-y-6">
                    {/* API Sync */}
                    <Card>
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 text-blue-600" />
                                API Sync
                            </CardTitle>
                            <CardDescription>Force-refresh all datasets from BallDontLie without waiting for cache expiry.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            {apiSyncMessage && (
                                <Alert className="bg-blue-50 border-blue-200">
                                    <AlertDescription className="text-blue-800 text-sm">{apiSyncMessage}</AlertDescription>
                                </Alert>
                            )}
                            <Button onClick={handleApiSync} disabled={apiSyncing} className="w-full bg-blue-600 hover:bg-blue-700">
                                <RefreshCw className={`mr-2 h-4 w-4 ${apiSyncing ? "animate-spin" : ""}`} />
                                {apiSyncing ? "Syncing..." : "Force API Sync"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Prediction Deadlines */}
                    <Card>
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-indigo-600" />
                                Pre-Playoff Deadlines
                            </CardTitle>
                            <CardDescription>Lock times for champion & MVP bonus picks.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Champion Pick Deadline</label>
                                <div className="flex gap-2">
                                    <Input type="datetime-local" value={championDeadline} onChange={(e) => setChampionDeadline(e.target.value)} className="text-sm" />
                                    <Button size="sm" onClick={() => updateDeadline("champion", championDeadline)}>Save</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Finals MVP Pick Deadline</label>
                                <div className="flex gap-2">
                                    <Input type="datetime-local" value={mvpDeadline} onChange={(e) => setMvpDeadline(e.target.value)} className="text-sm" />
                                    <Button size="sm" onClick={() => updateDeadline("mvp", mvpDeadline)}>Save</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Player Roster */}
                    <Card>
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-emerald-600" />
                                Player Roster ({allUsers.length})
                            </CardTitle>
                            <CardDescription>Manage platform users.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead>User / Email</TableHead>
                                        <TableHead className="text-right">Points</TableHead>
                                        <TableHead className="text-right">Role</TableHead>
                                        <TableHead className="w-[60px] text-center">Admin</TableHead>
                                        <TableHead className="w-[60px] text-center">Del</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allUsers.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
                                    ) : allUsers.map((u) => (
                                        <TableRow key={u.email}>
                                            <TableCell>
                                                <div className="font-medium text-slate-900 text-sm">{u.full_name}</div>
                                                <div className="text-xs text-slate-500">{u.email}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">{u.total_points || 0}</TableCell>
                                            <TableCell className="text-right">
                                                {u.is_admin ? (
                                                    <Badge className="bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10">Admin</Badge>
                                                ) : (
                                                    <Badge variant="outline">Player</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className={`h-8 w-8 p-0 ${u.is_admin ? "text-indigo-500 hover:bg-indigo-50" : "text-gray-400 hover:bg-gray-100"}`}
                                                    onClick={() => handleToggleAdmin(u)}
                                                    disabled={u.email === user?.email}
                                                    title={u.is_admin ? "Revoke admin" : "Make admin"}
                                                >
                                                    <Shield className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                                                    onClick={() => handleDeleteUser(u.email)} disabled={u.email === user?.email}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ============================================ */}
                {/* TAB 2: RESULTS (Champion & MVP)             */}
                {/* ============================================ */}
                <TabsContent value="results">
                    <Card>
                        <CardHeader className="bg-amber-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-600" />
                                Season Awards
                            </CardTitle>
                            <CardDescription>
                                Declaring winners here triggers the Postgres scoring engine automatically —
                                correct predictions get points instantly.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Actual NBA Champion</label>
                                <Select value={championSettings.champion} onValueChange={(val) => setChampionSettings(prev => ({...prev, champion: val}))}>
                                    <SelectTrigger><SelectValue placeholder="Select champion" /></SelectTrigger>
                                    <SelectContent>
                                        {nbaTeams.map(team => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Actual Finals MVP</label>
                                <Input placeholder="Enter MVP Player Name" value={championSettings.mvp}
                                    onChange={(e) => setChampionSettings(prev => ({...prev, mvp: e.target.value}))} />
                            </div>
                            <Button onClick={saveChampionMVPSettings} className="w-full bg-amber-600 hover:bg-amber-700 font-semibold">
                                <Trophy className="mr-2 h-4 w-4" />
                                Declare Winners & Auto-Score
                            </Button>
                            {processingState.operation === "winners" && (
                                <p className="text-xs text-center text-emerald-600 font-medium animate-pulse">{processingState.message}</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ============================================ */}
                {/* TAB 3: SCORING RULES                        */}
                {/* ============================================ */}
                <TabsContent value="scoring">
                    <Card>
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <SettingsIcon className="h-5 w-5 text-slate-600" />
                                Scoring Rules
                            </CardTitle>
                            <CardDescription>
                                These values are used by the Postgres trigger to automatically score predictions.
                                Changes take effect immediately for all future series completions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[180px]">Round</TableHead>
                                            <TableHead className="text-center w-32">Winner pts</TableHead>
                                            <TableHead className="text-center w-32">Exact games pts</TableHead>
                                            <TableHead className="text-center w-28">Total (max)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(scoringRules).map(([round, rules]) => (
                                            <TableRow key={round}>
                                                <TableCell className="font-medium text-sm">{ROUND_LABELS[round] || round}</TableCell>
                                                <TableCell className="text-center">
                                                    <Input
                                                        type="number" min={0} max={20}
                                                        value={rules.winner ?? 0}
                                                        onChange={(e) => updateRuleField(round, "winner", e.target.value)}
                                                        className="w-20 mx-auto text-center h-8"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {rules.games !== null ? (
                                                        <Input
                                                            type="number" min={0} max={20}
                                                            value={rules.games ?? 0}
                                                            onChange={(e) => updateRuleField(round, "games", e.target.value)}
                                                            className="w-20 mx-auto text-center h-8"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-blue-600">
                                                    {(rules.winner ?? 0) + (rules.games ?? 0)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                                <Button onClick={saveScoringRules} disabled={savingRules} className="w-full sm:w-auto">
                                    {savingRules ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Scoring Rules
                                </Button>
                                {rulesSaved && (
                                    <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                                        <Check className="h-4 w-4" /> Saved!
                                    </span>
                                )}
                            </div>
                            <Alert className="mt-4 bg-blue-50 border-blue-200">
                                <AlertTriangle className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800 text-xs">
                                    Saving updates the database immediately. The Postgres trigger reads these values on the next series completion — no SQL re-run needed.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ============================================ */}
                {/* TAB 4: SEASON TRANSITION                    */}
                {/* ============================================ */}
                <TabsContent value="season">
                    <Card className="border-orange-200">
                        <CardHeader className="bg-orange-50 border-b border-orange-200 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                                <RotateCcw className="h-5 w-5" />
                                Season Transition
                            </CardTitle>
                            <CardDescription className="text-orange-700">
                                Archive the current season and reset the app for the next year.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {/* Current season summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: "Active Season", value: activeSeason, color: "bg-blue-50 text-blue-800" },
                                    { label: "Total Players", value: allUsers.length, color: "bg-emerald-50 text-emerald-800" },
                                    { label: "Series Played", value: allSeries.filter(s => s.status === "completed").length, color: "bg-purple-50 text-purple-800" },
                                    { label: "Predictions Made", value: allPredictions.length, color: "bg-amber-50 text-amber-800" },
                                ].map(stat => (
                                    <div key={stat.label} className={`rounded-lg p-3 text-center ${stat.color}`}>
                                        <div className="text-2xl font-bold">{stat.value}</div>
                                        <div className="text-xs mt-1 font-medium">{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* What will happen checklist */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-gray-700">What "Start New Season" will do:</h3>
                                <ul className="space-y-1.5">
                                    {[
                                        `Archive all ${allPredictions.length} predictions under season "${activeSeason}"`,
                                        `Archive all ${allSeries.length} series under season "${activeSeason}"`,
                                        `Reset all ${allUsers.length} player point totals to 0`,
                                        "Clear the NBA API cache so fresh data is fetched",
                                        "Update the active season to the new year you specify",
                                    ].map((step, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                            <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    This is irreversible. Past-season data is archived (not deleted) but the active leaderboard will reset. Only proceed when the playoffs are fully over.
                                </AlertDescription>
                            </Alert>

                            <Button
                                className="w-full bg-orange-600 hover:bg-orange-700 font-semibold"
                                onClick={() => setSeasonDialogOpen(true)}
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Start New Season...
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Processing Overlay */}
            {processingState.isProcessing && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full mx-4 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
                        <p className="text-sm text-gray-700">{processingState.message || "Processing..."}</p>
                    </div>
                </div>
            )}

            {/* Season Reset Confirmation Dialog */}
            <Dialog open={seasonDialogOpen} onOpenChange={setSeasonDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-700">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Season Transition
                        </DialogTitle>
                        <DialogDescription>
                            This will archive the <strong>{activeSeason}</strong> season and reset the app.
                            Type the <strong>new season year</strong> below to confirm.
                        </DialogDescription>
                    </DialogHeader>

                    {seasonResetLog.length === 0 ? (
                        <div className="space-y-4 py-2">
                            <Input
                                placeholder={`e.g. ${parseInt(activeSeason) + 1}`}
                                value={newSeasonYear}
                                onChange={(e) => setNewSeasonYear(e.target.value)}
                                className="text-center text-xl font-mono font-bold tracking-widest"
                                maxLength={4}
                            />
                            <p className="text-xs text-center text-gray-500">
                                You typed: <strong>{newSeasonYear || "—"}</strong>
                            </p>
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                            {seasonResetLog.map((line, i) => (
                                <p key={i} className="text-xs font-mono text-slate-700">{line}</p>
                            ))}
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => { setSeasonDialogOpen(false); setNewSeasonYear(""); setSeasonResetLog([]); }}>
                            {seasonResetLog.length > 0 ? "Close" : "Cancel"}
                        </Button>
                        {seasonResetLog.length === 0 && (
                            <Button
                                className="bg-orange-600 hover:bg-orange-700"
                                disabled={newSeasonYear.trim().length !== 4 || seasonResetting}
                                onClick={executeSeasonReset}
                            >
                                {seasonResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                                {seasonResetting ? "Transitioning..." : `Start ${newSeasonYear} Season`}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
