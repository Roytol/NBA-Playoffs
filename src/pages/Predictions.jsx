
import React, { useState, useEffect } from "react";
import { Prediction, Series, Settings } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Check, X, AlertTriangle, Edit, Clock } from "lucide-react";
import TeamLogo from "../components/common/TeamLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { getTeamNames } from "@/api/nbaApi";
import { useToast } from "@/components/ui/use-toast";
import { PREDICTION_TABS, ROUND_POINTS_DISPLAY, SETTINGS_KEYS } from "@/constants/app";
import { NBA_TEAM_NAMES } from "@/constants/nba";

export default function PredictionsPage() {
    const [predictions, setPredictions] = useState([]);
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    const [editingChampion, setEditingChampion] = useState(false);
    const [editingMVP, setEditingMVP] = useState(false);
    const [championForm, setChampionForm] = useState({
        champion: ""
    });
    const [mvpForm, setMvpForm] = useState({
        mvp: ""
    });
    const [championMVPDeadline, setChampionMVPDeadline] = useState(null);
    const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mvpStatus, setMvpStatus] = React.useState("closed");
    const [nbaTeams, setNbaTeams] = useState(NBA_TEAM_NAMES);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        loadData();
        getTeamNames().then(t => t?.length > 0 && setNbaTeams(t)).catch(() => {});
        loadDeadlines();
        loadMVPStatus();
    }, []);

    const loadMVPStatus = async () => {
        try {
            const settings = await Settings.list();
            const mvpStatusSetting = settings.find(s => s.setting_name === SETTINGS_KEYS.MVP_PREDICTION_STATUS);
            if (mvpStatusSetting) {
                setMvpStatus(mvpStatusSetting.setting_value);
            }
        } catch (error) {
            console.error("Error loading MVP status:", error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        setError(null);

        if (!user) {
            setLoading(false);
            return;
        }

        try {
            const [predictionsData, seriesData] = await Promise.all([
                Prediction.filter({ user_email: user.email }),
                Series.list()
            ]);
            setPredictions(predictionsData);
            setSeries(seriesData);

            // Set initial form values if champion/MVP predictions exist
            const championPred = predictionsData.find(p => p.prediction_type === "champion");
            const mvpPred = predictionsData.find(p => p.prediction_type === "finals_mvp");

            setChampionForm({
                champion: championPred?.winner || ""
            });
            setMvpForm({
                mvp: mvpPred?.winner || ""
            });
        } catch (err) {
            console.error("Error loading data:", err);
            setError("Failed to load predictions. Please try refreshing the page.");
        } finally {
            setLoading(false);
        }
    };

    const loadDeadlines = async () => {
        try {
            // Load both deadlines
            const settings = await Settings.list();
            const championDeadline = settings.find(s => s.setting_name === SETTINGS_KEYS.CHAMPION_PREDICTION_DEADLINE);
            const mvpDeadline = settings.find(s => s.setting_name === SETTINGS_KEYS.MVP_PREDICTION_DEADLINE);

            // Use the later of the two deadlines (if both exist)
            let finalDeadline = null;

            if (championDeadline && mvpDeadline) {
                const championDate = new Date(championDeadline.setting_value);
                const mvpDate = new Date(mvpDeadline.setting_value);
                finalDeadline = championDate > mvpDate ? championDate : mvpDate;
            } else if (championDeadline) {
                finalDeadline = new Date(championDeadline.setting_value);
            } else if (mvpDeadline) {
                finalDeadline = new Date(mvpDeadline.setting_value);
            }

            if (finalDeadline) {
                setChampionMVPDeadline(finalDeadline);
                setIsDeadlinePassed(finalDeadline < new Date());
            }
        } catch (error) {
            console.error("Error loading deadline:", error);
        }
    };

    const handleUpdateChampion = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const championPred = predictions.find(p => p.prediction_type === "champion");
            if (championPred) {
                await Prediction.update(championPred.id, { winner: championForm.champion });
            } else {
                await Prediction.create({
                    prediction_type: "champion",
                    winner: championForm.champion,
                    points_earned: 0,
                    is_correct: false,
                    user_email: user.email
                });
            }
            await loadData();
            setEditingChampion(false);
            toast({ title: "Champion pick saved! 🏆", description: championForm.champion });
        } catch (err) {
            console.error("Error updating champion:", err);
            toast({ title: "Failed to save champion pick", description: "Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateMVP = async () => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const mvpPred = predictions.find(p => p.prediction_type === "finals_mvp");
            if (mvpPred) {
                await Prediction.update(mvpPred.id, { winner: mvpForm.mvp });
            } else {
                await Prediction.create({
                    prediction_type: "finals_mvp",
                    winner: mvpForm.mvp,
                    points_earned: 0,
                    is_correct: false,
                    user_email: user.email
                });
            }
            await loadData();
            setEditingMVP(false);
            toast({ title: "MVP pick saved! ⭐", description: mvpForm.mvp });
        } catch (err) {
            console.error("Error updating MVP:", err);
            toast({ title: "Failed to save MVP pick", description: "Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Safe getter for series
    const getSeriesById = (seriesId) => {
        if (!series || !seriesId) return null;
        return series.find(s => s.series_id === seriesId);
    };

    // Skip the rest of the rendering if not logged in
    if (!user && !loading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto p-4 sm:p-6"
            >
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">My Predictions</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">Track all your NBA playoff predictions</p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="surface-status-info rounded-lg border p-4 sm:p-6 mb-8 text-center"
                >
                    <h2 className="text-lg font-semibold mb-2">Sign in to view predictions</h2>
                    <p className="text-gray-600 mb-4 text-sm">You need to be logged in to view your predictions</p>
                    <Button onClick={() => User.login()}>Sign In</Button>
                </motion.div>
            </motion.div>
        );
    }

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-6xl mx-auto p-4 sm:p-6"
            >
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">My Predictions</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">Track all your NBA playoff predictions</p>

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
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">My Predictions</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">Track all your NBA playoff predictions</p>

                <Alert variant="destructive" className="my-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>{error}</span>
                        <Button size="sm" onClick={loadData}>Try Again</Button>
                    </AlertDescription>
                </Alert>
            </motion.div>
        );
    }

    const getPointsInfo = (prediction) => {
        const pointInfo = ROUND_POINTS_DISPLAY[prediction.prediction_type];

        if (prediction.prediction_type === "champion" || prediction.prediction_type === "finals_mvp") {
            return pointInfo?.winner ?? "-";
        } else {
            return pointInfo ? `${pointInfo.winner} / ${pointInfo.max}` : "-";
        }
    };

    const getStatusBadge = (prediction) => {
        if (prediction.is_correct) {
            return (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                    <Check className="w-3 h-3 mr-1" />
                    Correct ({prediction.points_earned} pts)
                </Badge>
            );
        }

        const relatedSeries = prediction.series_id ? getSeriesById(prediction.series_id) : null;
        if (!relatedSeries || relatedSeries.status === "active") {
            return (
                <Badge className="badge-status-info">
                    Pending
                </Badge>
            );
        }

        if (relatedSeries.status === "completed") {
            return (
                <Badge className="badge-status-danger">
                    <X className="w-3 h-3 mr-1" />
                    Incorrect
                </Badge>
            );
        }

        return (
            <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                Unknown
            </Badge>
        );
    };

    const filteredPredictions = activeTab === "all"
        ? predictions
        : predictions.filter(p => p.prediction_type === activeTab);

    const hasChampionMVPPicks = predictions.some(p => p.prediction_type === "champion" || p.prediction_type === "finals_mvp");

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
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">My Predictions</h1>
                <p className="text-gray-500 mb-4 sm:mb-6 text-sm">Track all your NBA playoff predictions</p>
            </motion.div>

            <AnimatePresence mode="popLayout">
                {/* Champion & MVP Cards */}
                {hasChampionMVPPicks && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        {/* Champion Card */}
                        {predictions.some(p => p.prediction_type === "champion") && (
                            <Card className="border-yellow-200">
                                <CardHeader className="bg-yellow-50">
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Trophy className="text-brand-gold w-5 h-5" />
                                            Champion Prediction
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableBody>
                                            {predictions.filter(p => p.prediction_type === "champion").map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">NBA Champion</TableCell>
                                                    <TableCell>{p.winner}</TableCell>
                                                    <TableCell className="text-center">{getPointsInfo(p)} pts</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {!isDeadlinePassed && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setChampionForm({ champion: p.winner });
                                                                        setEditingChampion(true);
                                                                    }}
                                                                >
                                                                    <Edit className="w-4 h-4 mr-1" /> Edit
                                                                </Button>
                                                            )}
                                                            {getStatusBadge(p)}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {championMVPDeadline && (
                                        <div className="px-4 py-2 text-xs text-gray-500 flex items-center gap-1 border-t">
                                            <Clock className="w-3 h-3" />
                                            {isDeadlinePassed ? (
                                                "Prediction deadline has passed"
                                            ) : (
                                                <>
                                                    Deadline: {format(championMVPDeadline, "MMM d, yyyy 'at' h:mm a")}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* MVP Card */}
                        {predictions.some(p => p.prediction_type === "finals_mvp") && mvpStatus === "open" && (
                            <Card className="border-yellow-200">
                                <CardHeader className="bg-yellow-50">
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Star className="text-brand-gold w-5 h-5" />
                                            Finals MVP Prediction
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableBody>
                                            {predictions.filter(p => p.prediction_type === "finals_mvp").map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">Finals MVP</TableCell>
                                                    <TableCell>{p.winner}</TableCell>
                                                    <TableCell className="text-center">{getPointsInfo(p)} pts</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {!isDeadlinePassed && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setMvpForm({ mvp: p.winner });
                                                                        setEditingMVP(true);
                                                                    }}
                                                                >
                                                                    <Edit className="w-4 h-4 mr-1" /> Edit
                                                                </Button>
                                                            )}
                                                            {getStatusBadge(p)}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {championMVPDeadline && (
                                        <div className="px-4 py-2 text-xs text-gray-500 flex items-center gap-1 border-t">
                                            <Clock className="w-3 h-3" />
                                            {isDeadlinePassed ? (
                                                "Prediction deadline has passed"
                                            ) : (
                                                <>
                                                    Deadline: {format(championMVPDeadline, "MMM d, yyyy 'at' h:mm a")}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                >
                        <Tabs defaultValue="all" onValueChange={setActiveTab}>
                            <TabsList className="mb-4 w-full overflow-x-auto flex-nowrap">
                                {PREDICTION_TABS.map((tab) => (
                                    <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                        <TabsContent value={activeTab}>
                            <Card>
                                <CardHeader className="border-b">
                                    <CardTitle className="flex items-center gap-2">
                                        <Trophy className="text-brand-gold w-5 h-5" />
                                        {activeTab === "all" ? "All Predictions" :
                                            activeTab.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Predictions"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-gray-50">
                                            <TableRow>
                                                <TableHead className="w-[250px]">Series/Category</TableHead>
                                                <TableHead>Prediction</TableHead>
                                                <TableHead className="text-center">Possible Points</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8">
                                                        Loading predictions...
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredPredictions.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                                        No predictions made yet for this category
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredPredictions.map((prediction) => {
                                                    const seriesInfo = prediction.series_id ? getSeriesById(prediction.series_id) : null;
                                                    const isPlayIn = seriesInfo?.round === 'play_in';

                                                    return (
                                                        <TableRow key={prediction.id} className="hover:bg-gray-50">
                                                            <TableCell>
                                                                {prediction.prediction_type === "champion" ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Trophy className="text-brand-gold w-5 h-5" />
                                                                        <span>NBA Champion</span>
                                                                    </div>
                                                                ) : prediction.prediction_type === "finals_mvp" ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Star className="text-brand-gold w-5 h-5" />
                                                                        <span>Finals MVP</span>
                                                                    </div>
                                                                ) : seriesInfo ? (
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <TeamLogo team={seriesInfo.team1} className="w-6 h-6" />
                                                                            <span>
                                                                                {seriesInfo.team1} ({seriesInfo.team1_seed})
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <TeamLogo team={seriesInfo.team2} className="w-6 h-6" />
                                                                            <span>
                                                                                {seriesInfo.team2} ({seriesInfo.team2_seed})
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-1">
                                                                            {seriesInfo.conference} · {
                                                                                seriesInfo.round.split("_").map(w =>
                                                                                    w.charAt(0).toUpperCase() + w.slice(1)
                                                                                ).join(" ")
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span>Unknown Series</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {prediction.prediction_type === "champion" || prediction.prediction_type === "finals_mvp" ? (
                                                                    <div className="font-medium">
                                                                        {prediction.winner}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <TeamLogo team={prediction.winner} className="w-6 h-6" />
                                                                        <span className="font-medium">
                                                                            {isPlayIn ? (
                                                                                `${prediction.winner} to win`
                                                                            ) : (
                                                                                `${prediction.winner} in ${prediction.games}`
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {getPointsInfo(prediction)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {getStatusBadge(prediction)}
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
            </AnimatePresence>

            {/* Edit Champion Dialog */}
            <Dialog open={editingChampion} onOpenChange={setEditingChampion}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Champion Prediction</DialogTitle>
                        <DialogDescription>
                            Update your champion prediction
                            {championMVPDeadline && (
                                <div className="mt-2 text-xs flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Deadline: {format(championMVPDeadline, "MMM d, yyyy 'at' h:mm a")}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="font-medium flex items-center gap-2">
                                <Trophy className="text-brand-gold w-4 h-4" />
                                NBA Champion (5 points)
                            </label>
                            <Select
                                value={championForm.champion}
                                onValueChange={(v) => setChampionForm({ champion: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select NBA Champion" />
                                </SelectTrigger>
                                <SelectContent>
                                    {nbaTeams.map(team => (
                                        <SelectItem key={team} value={team}>{team}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingChampion(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleUpdateChampion()}
                            disabled={isSubmitting || !championForm.champion}
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit MVP Dialog */}
            <Dialog open={editingMVP} onOpenChange={setEditingMVP}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Finals MVP Prediction</DialogTitle>
                        <DialogDescription>
                            Update your Finals MVP prediction
                            {championMVPDeadline && (
                                <div className="mt-2 text-xs flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Deadline: {format(championMVPDeadline, "MMM d, yyyy 'at' h:mm a")}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="font-medium flex items-center gap-2">
                                <Star className="text-brand-gold w-4 h-4" />
                                Finals MVP (3 points)
                            </label>
                            <Input
                                placeholder="Enter Finals MVP prediction"
                                value={mvpForm.mvp}
                                onChange={(e) => setMvpForm({ mvp: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingMVP(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => handleUpdateMVP()}
                            disabled={isSubmitting || !mvpForm.mvp}
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isSubmitting && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
                >
                    <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full mx-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-center text-sm text-gray-700">Saving changes...</p>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
