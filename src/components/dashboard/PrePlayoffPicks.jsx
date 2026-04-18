import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Star, AlertTriangle, Clock } from "lucide-react";
import { Prediction, Settings } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { getTeamNames } from "@/api/nbaApi";
import { SETTINGS_KEYS } from "@/constants/app";
import { NBA_TEAM_NAMES } from "@/constants/nba";

export function ChampionPick({ onSave, user }) {
    const [pick, setPick] = React.useState("");
    const [existingPick, setExistingPick] = React.useState(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [deadline, setDeadline] = React.useState(null);
    const [isDeadlinePassed, setIsDeadlinePassed] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [nbaTeams, setNbaTeams] = React.useState(NBA_TEAM_NAMES);

    React.useEffect(() => {
        loadDeadline();
        loadExistingPick();
        getTeamNames().then(t => t?.length > 0 && setNbaTeams(t)).catch(() => {});
    }, [user]);

    const loadDeadline = async () => {
        try {
            const settings = await Settings.list();
            const championDeadline = settings.find(s => s.setting_name === SETTINGS_KEYS.CHAMPION_PREDICTION_DEADLINE);

            const now = new Date();

            if (championDeadline) {
                const deadlineDate = new Date(championDeadline.setting_value);
                setDeadline(deadlineDate);
                setIsDeadlinePassed(deadlineDate < now);
            }
        } catch (error) {
            console.error("Error loading deadline:", error);
        }
    };

    const loadExistingPick = async () => {
        try {
            if (!user) return;

            const championPicks = await Prediction.filter({
                user_email: user.email,
                prediction_type: "champion"
            });

            if (championPicks.length > 0) {
                setExistingPick(championPicks[0]);
                setPick(championPicks[0].winner);
            }
        } catch (error) {
            console.error("Error loading existing pick:", error);
        } finally {
            setLoading(false);
        }
    };

    const submitPick = async () => {
        if (!user || !pick) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (existingPick) {
                await Prediction.update(existingPick.id, {
                    winner: pick
                });
            } else {
                await Prediction.create({
                    prediction_type: "champion",
                    winner: pick,
                    points_earned: 0,
                    is_correct: false,
                    user_email: user.email
                });
            }

            if (onSave) {
                onSave();
            }

            // Refresh existing pick
            await loadExistingPick();
        } catch (error) {
            console.error("Error submitting champion pick:", error);
            setError("Failed to save champion pick. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetry = () => {
        setError(null);
    };

    // Don't show anything if user is not logged in
    if (!user) return null;

    return (
        <Card className="border-yellow-200 bg-yellow-50 mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                    NBA Champion Prediction
                    {deadline && (
                        <div className="text-sm font-normal text-gray-600 ml-auto flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {isDeadlinePassed ?
                                "Deadline passed" :
                                `Deadline: ${format(deadline, "MMM d, yyyy 'at' h:mm a")}`}
                        </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="flex justify-between items-center">
                            <span>{error}</span>
                            <Button size="sm" variant="outline" onClick={handleRetry}>Retry</Button>
                        </AlertDescription>
                    </Alert>
                )}

                {existingPick && isDeadlinePassed ? (
                    // Show the existing pick if deadline has passed
                    <div className="space-y-3">
                        <div className="text-sm text-gray-600">Your Champion Prediction (5 points):</div>
                        <div className="font-medium">{existingPick.winner}</div>
                        <div className="text-sm text-gray-500">
                            This prediction is now locked.
                        </div>
                    </div>
                ) : (
                    // Show the form if deadline hasn't passed or no pick yet
                    <div className="space-y-4">
                        {existingPick && (
                            <div className="text-sm text-gray-600">
                                Current pick: <span className="font-medium">{existingPick.winner}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="font-medium">NBA Champion (5 points)</label>
                            <Select
                                value={pick}
                                onValueChange={(value) => setPick(value)}
                                disabled={isDeadlinePassed}
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

                        {!isDeadlinePassed && (
                            <Button
                                className="w-full"
                                onClick={submitPick}
                                disabled={isSubmitting || !pick}
                            >
                                {isSubmitting ? "Saving..." :
                                    existingPick ? "Update Champion Pick" : "Submit Champion Pick"}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function FinalsMVPPick({ onSave, user }) {
    const [pick, setPick] = React.useState("");
    const [existingPick, setExistingPick] = React.useState(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [deadline, setDeadline] = React.useState(null);
    const [startDate, setStartDate] = React.useState(null);
    const [isDeadlinePassed, setIsDeadlinePassed] = React.useState(false);
    const [isBeforeStart, setIsBeforeStart] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [mvpStatus, setMvpStatus] = React.useState("closed");

    React.useEffect(() => {
        loadDeadline();
        loadExistingPick();
        loadMVPStatus();
    }, [user]);

    const loadDeadline = async () => {
        try {
            const settings = await Settings.list();
            const mvpDeadline = settings.find(s => s.setting_name === SETTINGS_KEYS.MVP_PREDICTION_DEADLINE);
            const mvpStart = settings.find(s => s.setting_name === SETTINGS_KEYS.MVP_PREDICTION_START);

            const now = new Date();

            if (mvpStart) {
                const sDate = new Date(mvpStart.setting_value);
                setStartDate(sDate);
                setIsBeforeStart(sDate > now);
            }

            if (mvpDeadline) {
                const deadlineDate = new Date(mvpDeadline.setting_value);
                setDeadline(deadlineDate);
                setIsDeadlinePassed(deadlineDate < now);
            }
        } catch (error) {
            console.error("Error loading deadline:", error);
        }
    };

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

    const loadExistingPick = async () => {
        try {
            if (!user) return;

            const mvpPicks = await Prediction.filter({
                user_email: user.email,
                prediction_type: "finals_mvp"
            });

            if (mvpPicks.length > 0) {
                setExistingPick(mvpPicks[0]);
                setPick(mvpPicks[0].winner);
            }
        } catch (error) {
            console.error("Error loading existing pick:", error);
        } finally {
            setLoading(false);
        }
    };

    const submitPick = async () => {
        if (!user || !pick) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (existingPick) {
                await Prediction.update(existingPick.id, {
                    winner: pick
                });
            } else {
                await Prediction.create({
                    prediction_type: "finals_mvp",
                    winner: pick,
                    points_earned: 0,
                    is_correct: false,
                    user_email: user.email
                });
            }

            if (onSave) {
                onSave();
            }

            // Refresh existing pick
            await loadExistingPick();
        } catch (error) {
            console.error("Error submitting MVP pick:", error);
            setError("Failed to save MVP pick. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetry = () => {
        setError(null);
    };

    // Don't show if:
    // 1. User is not logged in
    // 2. User already has a pick (unless deadline has passed to view it)
    // 3. The prediction window hasn't started yet
    if (!user || (existingPick && !isDeadlinePassed) || isBeforeStart) return null;

    return (
        <Card className="surface-status-info mb-6 border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Star className="text-status-info w-6 h-6" />
                    Finals MVP Prediction
                    {deadline && (
                        <div className="text-sm font-normal text-gray-600 ml-auto flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {isDeadlinePassed ?
                                "Deadline passed" :
                                `Deadline: ${format(deadline, "MMM d, yyyy 'at' h:mm a")}`}
                        </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="flex justify-between items-center">
                            <span>{error}</span>
                            <Button size="sm" variant="outline" onClick={handleRetry}>Retry</Button>
                        </AlertDescription>
                    </Alert>
                )}

                {existingPick && isDeadlinePassed ? (
                    <div className="space-y-3">
                        <div className="text-sm text-gray-600">Your Finals MVP Prediction (3 points):</div>
                        <div className="font-medium">{existingPick.winner}</div>
                        <div className="text-sm text-gray-500">
                            This prediction is now locked.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {existingPick && (
                            <div className="text-sm text-gray-600">
                                Current pick: <span className="font-medium">{existingPick.winner}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="font-medium">Finals MVP (3 points)</label>
                            <Input
                                placeholder="Enter Finals MVP prediction"
                                value={pick}
                                onChange={(e) => setPick(e.target.value)}
                                disabled={isDeadlinePassed}
                            />
                        </div>

                        {!isDeadlinePassed && (
                            <Button
                                className="w-full"
                                onClick={submitPick}
                                disabled={isSubmitting || !pick}
                            >
                                {isSubmitting ? "Saving..." :
                                    existingPick ? "Update MVP Pick" : "Submit MVP Pick"}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Default component is now just a container for the two separate components
export default function PrePlayoffPicks({ hasChampionPick, hasFinalsMVPPick, onSave }) {
    return (
        <div>
            {!hasChampionPick && <ChampionPick onSave={onSave} />}
            <FinalsMVPPick onSave={onSave} />
        </div>
    );
}
