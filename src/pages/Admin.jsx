import React, { useState, useEffect } from "react";
import { User, Settings, Series } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Trophy, RefreshCw, Settings as SettingsIcon, Users, Trash2, CalendarIcon, ShieldAlert } from "lucide-react";
import { forceRefreshAll, getTeamNames } from "@/api/nbaApi";
import { syncPlayoffSeries } from "@/api/nbaSync";

export default function AdminPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    
    // API Sync State
    const [apiSyncing, setApiSyncing] = useState(false);
    const [apiSyncMessage, setApiSyncMessage] = useState("");
    
    // NBA Teams for UI
    const [nbaTeams, setNbaTeams] = useState([]);

    // Settings State
    const [championDeadline, setChampionDeadline] = useState("");
    const [mvpDeadline, setMvpDeadline] = useState("");
    const [championSettings, setChampionSettings] = useState({ champion: "", mvp: "" });
    const [processingState, setProcessingState] = useState({ isProcessing: false, operation: "", message: "" });

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
            // Load users
            const usersData = await User.list();
            setAllUsers(usersData || []);

            // Load settings
            const champDeadline = await Settings.filter({ setting_name: "champion_prediction_deadline" });
            if (champDeadline.length > 0) setChampionDeadline(champDeadline[0].setting_value);

            const mvpDead = await Settings.filter({ setting_name: "mvp_prediction_deadline" });
            if (mvpDead.length > 0) setMvpDeadline(mvpDead[0].setting_value);

            const winners = await Settings.filter({ setting_name: "champion_mvp_winners" });
            if (winners.length > 0 && winners[0].setting_value) {
                try {
                    setChampionSettings(JSON.parse(winners[0].setting_value));
                } catch(e) {}
            }

            // Load Teams for the dropdowns
            const teams = await getTeamNames();
            if (teams && teams.length > 0) setNbaTeams(teams);

        } catch (err) {
            console.error("Failed to load admin data:", err);
            setError("Failed to load some dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    // Processing Helpers
    const startProcessing = (operation, message) => {
        setProcessingState({ isProcessing: true, operation, message });
    };

    const endProcessing = (successMessage = null) => {
        if (successMessage) {
            setProcessingState(prev => ({ ...prev, message: successMessage }));
            setTimeout(() => setProcessingState({ isProcessing: false, operation: "", message: "" }), 2000);
        } else {
            setProcessingState({ isProcessing: false, operation: "", message: "" });
        }
    };

    // Handlers
    const handleApiSync = async () => {
        setApiSyncing(true);
        setApiSyncMessage("Refreshing API cache...");
        try {
            await forceRefreshAll();
            setApiSyncMessage("Syncing playoff brackets and live scores...");
            const result = await syncPlayoffSeries();
            setApiSyncMessage(`Sync complete! Evaluated massive changes.`);
            setTimeout(() => {
                setApiSyncMessage("");
                setApiSyncing(false);
            }, 3000);
        } catch (err) {
            console.error("API sync failed:", err);
            setApiSyncMessage(`Sync failed: ${err.message}`);
            setTimeout(() => { setApiSyncMessage(""); setApiSyncing(false); }, 3000);
        }
    };

    const updateDeadline = async (type, newValue) => {
        try {
            startProcessing(`deadline-${type}`, `Updating ${type} deadline...`);
            const settingName = type === "champion" ? "champion_prediction_deadline" : "mvp_prediction_deadline";
            const settings = await Settings.filter({ setting_name: settingName });
            
            if (settings.length > 0) {
                await Settings.update(settings[0].id, { setting_value: newValue });
            } else {
                await Settings.create({ setting_name: settingName, setting_value: newValue });
            }

            if (type === "champion") setChampionDeadline(newValue);
            else setMvpDeadline(newValue);

            endProcessing(`${type === "champion" ? "Champion" : "MVP"} deadline updated.`);
        } catch (err) {
            setProcessingState(prev => ({ ...prev, message: `Failed to update: ${err.message}` }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const saveChampionMVPSettings = async () => {
        try {
            startProcessing("winners", "Saving actual champion and MVP...");
            const stringValue = JSON.stringify(championSettings);
            const settings = await Settings.filter({ setting_name: "champion_mvp_winners" });
            
            if (settings.length > 0) {
                await Settings.update(settings[0].id, { setting_value: stringValue });
            } else {
                await Settings.create({ setting_name: "champion_mvp_winners", setting_value: stringValue });
            }
            endProcessing("Champion and MVP winners updated successfully!");
        } catch (err) {
            setProcessingState(prev => ({ ...prev, message: `Failed to update: ${err.message}` }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    const handleDeleteUser = async (email) => {
        if (!confirm(`Are you sure you want to delete ${email} and all their predictions?`)) return;
        try {
            startProcessing("delete-user", `Deleting ${email}...`);
            await User.delete(email);
            setAllUsers(allUsers.filter(u => u.email !== email));
            endProcessing(`Deleted ${email}.`);
        } catch (err) {
            setProcessingState(prev => ({ ...prev, message: `Failed to delete user: ${err.message}` }));
            setTimeout(() => endProcessing(), 2000);
        }
    };

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center p-8">Loading admin dashboard...</div>;
    }

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
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Control system sync, verify users, and handle season resolutions.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN */}
                <div className="col-span-1 space-y-6">
                    {/* API Sync Control */}
                    <Card>
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 text-blue-600" />
                                API Matrix
                            </CardTitle>
                            <CardDescription>Force refresh all datasets manually without waiting for cache invalidation.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {apiSyncMessage && (
                                <Alert className="bg-blue-50 border-blue-200">
                                    <AlertDescription className="text-blue-800 text-sm">{apiSyncMessage}</AlertDescription>
                                </Alert>
                            )}
                            <Button 
                                onClick={handleApiSync} 
                                disabled={apiSyncing} 
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${apiSyncing ? "animate-spin" : ""}`} />
                                {apiSyncing ? "Syncing..." : "Force API Sync"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Pre-Playoff Pick Deadlines */}
                    <Card>
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-indigo-600" />
                                Prediction Deadlines
                            </CardTitle>
                            <CardDescription>Set lockout times for pre-playoff bonus picks.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Champion Pick Deadline</label>
                                <div className="flex gap-2">
                                    <Input 
                                        type="datetime-local" 
                                        value={championDeadline}
                                        onChange={(e) => setChampionDeadline(e.target.value)}
                                        className="text-sm"
                                    />
                                    <Button size="sm" onClick={() => updateDeadline("champion", championDeadline)}>Save</Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Finals MVP Pick Deadline</label>
                                <div className="flex gap-2">
                                    <Input 
                                        type="datetime-local" 
                                        value={mvpDeadline}
                                        onChange={(e) => setMvpDeadline(e.target.value)}
                                        className="text-sm"
                                    />
                                    <Button size="sm" onClick={() => updateDeadline("mvp", mvpDeadline)}>Save</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Post-Playoff Awards Resolution */}
                    <Card>
                        <CardHeader className="bg-amber-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-600" />
                                Season Awards
                            </CardTitle>
                            <CardDescription>Resolve pre-playoff predictions and award huge bonus points to users!</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                             <div className="space-y-2">
                                <label className="text-sm font-medium">Actual NBA Champion</label>
                                <Select 
                                    value={championSettings.champion} 
                                    onValueChange={(val) => setChampionSettings(prev => ({...prev, champion: val}))}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select champion" /></SelectTrigger>
                                    <SelectContent>
                                        {nbaTeams.map(team => (
                                            <SelectItem key={team} value={team}>{team}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Actual Finals MVP</label>
                                <Input 
                                    placeholder="Enter MVP Player Name" 
                                    value={championSettings.mvp}
                                    onChange={(e) => setChampionSettings(prev => ({...prev, mvp: e.target.value}))}
                                />
                            </div>

                            <Button 
                                onClick={saveChampionMVPSettings}
                                className="w-full bg-amber-600 hover:bg-amber-700 font-semibold"
                            >
                                <Trophy className="mr-2 h-4 w-4" />
                                Declare Winners & Calculate
                            </Button>
                            {processingState.operation === "winners" && (
                                <p className="text-xs text-center text-emerald-600 font-medium animate-pulse mt-2">{processingState.message}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Users Roster */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <Card className="h-full">
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-emerald-600" />
                                Player Roster ({allUsers.length})
                            </CardTitle>
                            <CardDescription>Manage authenticated platform users and leaderboard integrity.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead>User / Email</TableHead>
                                        <TableHead className="text-right">Total Points</TableHead>
                                        <TableHead className="text-right">Role</TableHead>
                                        <TableHead className="w-[100px] text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        allUsers.map((u) => (
                                            <TableRow key={u.email}>
                                                <TableCell>
                                                    <div className="font-medium text-slate-900">{u.full_name}</div>
                                                    <div className="text-xs text-slate-500">{u.email}</div>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-lg">{u.total_points || 0}</TableCell>
                                                <TableCell className="text-right">
                                                    {u.is_admin ? (
                                                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">Admin</span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">Player</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-red-500 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0 ml-auto"
                                                        onClick={() => handleDeleteUser(u.email)}
                                                        disabled={u.email === user?.email}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
