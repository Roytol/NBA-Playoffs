import React from "react";
import { format } from "date-fns";
import { Trophy, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getTeamNames } from "@/api/nbaApi";
import { SETTINGS_KEYS } from "@/constants/app";
import { NBA_TEAM_NAMES } from "@/constants/nba";
import {
    createPrediction,
    listPredictionsByFilters,
    listSettings,
    updatePrediction,
} from "@/services";

export default function ChampionPick({ onSave, user }) {
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
        getTeamNames().then((teams) => teams?.length > 0 && setNbaTeams(teams)).catch(() => {});
    }, [user]);

    const loadDeadline = async () => {
        try {
            const settings = await listSettings();
            const championDeadline = settings.find((s) => s.setting_name === SETTINGS_KEYS.CHAMPION_PREDICTION_DEADLINE);
            const now = new Date();

            if (championDeadline) {
                const deadlineDate = new Date(championDeadline.setting_value);
                setDeadline(deadlineDate);
                setIsDeadlinePassed(deadlineDate < now);
            }
        } catch (loadError) {
            console.error("Error loading deadline:", loadError);
        }
    };

    const loadExistingPick = async () => {
        try {
            if (!user) return;

            const championPicks = await listPredictionsByFilters({
                user_email: user.email,
                prediction_type: "champion",
            });

            if (championPicks.length > 0) {
                setExistingPick(championPicks[0]);
                setPick(championPicks[0].winner);
            }
        } catch (loadError) {
            console.error("Error loading existing pick:", loadError);
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
                await updatePrediction(existingPick.id, { winner: pick });
            } else {
                await createPrediction({
                    prediction_type: "champion",
                    winner: pick,
                    points_earned: 0,
                    is_correct: false,
                    user_email: user.email,
                });
            }

            if (onSave) onSave();
            await loadExistingPick();
        } catch (submitError) {
            console.error("Error submitting champion pick:", submitError);
            setError("Failed to save champion pick. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

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
                            {isDeadlinePassed
                                ? "Deadline passed"
                                : `Deadline: ${format(deadline, "MMM d, yyyy 'at' h:mm a")}`}
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
                            <Button size="sm" variant="outline" onClick={() => setError(null)}>Retry</Button>
                        </AlertDescription>
                    </Alert>
                )}

                {existingPick && isDeadlinePassed ? (
                    <div className="space-y-3">
                        <div className="text-sm text-gray-600">Your Champion Prediction (5 points):</div>
                        <div className="font-medium">{existingPick.winner}</div>
                        <div className="text-sm text-gray-500">This prediction is now locked.</div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {existingPick && (
                            <div className="text-sm text-gray-600">
                                Current pick: <span className="font-medium">{existingPick.winner}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="font-medium">NBA Champion (5 points)</label>
                            <Select value={pick} onValueChange={setPick} disabled={isDeadlinePassed || loading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select NBA Champion" />
                                </SelectTrigger>
                                <SelectContent>
                                    {nbaTeams.map((team) => (
                                        <SelectItem key={team} value={team}>{team}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {!isDeadlinePassed && (
                            <Button className="w-full" onClick={submitPick} disabled={isSubmitting || !pick || loading}>
                                {isSubmitting ? "Saving..." : existingPick ? "Update Champion Pick" : "Submit Champion Pick"}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
