
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Prediction, User } from "@/entities/all";
import TeamLogo from "../common/TeamLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";

const roundPoints = {
    play_in: [1, 1],
    first_round: [1, 3],
    second_round: [2, 4],
    conference_finals: [3, 6],
    finals: [4, 8]
};

export default function SeriesCard({ series, predictions, onPredictionMade }) {
    const [predictionData, setPredictionData] = React.useState({
        winner: "",
        games: ""
    });
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [submissionMessage, setSubmissionMessage] = React.useState("");
    const [user, setUser] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [retryCount, setRetryCount] = React.useState(0);

    React.useEffect(() => {
        loadUser();
    }, [retryCount]);

    const loadUser = async () => {
        try {
            const userData = await User.me();
            setUser(userData);
        } catch (error) {
            console.error("Error loading user:", error);
            setUser(null);
        }
    };

    const existingPrediction = React.useMemo(() => {
        if (!user || !predictions) return null;
        return predictions.find(p =>
            p.series_id === series.series_id &&
            p.user_email === user.email
        );
    }, [predictions, series.series_id, user]);

    React.useEffect(() => {
        if (existingPrediction) {
            setPredictionData({
                winner: existingPrediction.winner || "",
                games: existingPrediction.games ? existingPrediction.games.toString() : ""
            });
        }
    }, [existingPrediction]);

    const isDeadlinePassed = series.prediction_deadline
        ? new Date(series.prediction_deadline) < new Date()
        : false;

    const canPredict = !isDeadlinePassed && user;
    const isPlayIn = series.round === 'play_in';

    const renderDeadline = () => {
        try {
            if (!series.prediction_deadline) return "No deadline set";
            return format(new Date(series.prediction_deadline), "MMM d, h:mm a");
        } catch (error) {
            console.error("Error formatting date:", error);
            return "Invalid date";
        }
    };

    const makeNewPrediction = async () => {
        if (!predictionData.winner || (!predictionData.games && !isPlayIn) || !user) return;

        setIsSubmitting(true);
        setError(null);
        setSubmissionMessage("Saving prediction...");

        try {
            // For Play-In games, always set games to 1
            const gamesValue = isPlayIn ? 1 : parseInt(predictionData.games);

            if (existingPrediction) {
                setSubmissionMessage("Updating existing prediction...");
                await Prediction.update(existingPrediction.id, {
                    winner: predictionData.winner,
                    games: gamesValue,
                });
            } else {
                setSubmissionMessage("Creating new prediction...");
                const seriesId = series.series_id;

                if (!seriesId) {
                    throw new Error("Invalid series ID");
                }

                await Prediction.create({
                    series_id: seriesId,
                    winner: predictionData.winner,
                    games: gamesValue,
                    prediction_type: series.round,
                    points_earned: 0,
                    is_correct: false,
                    user_email: user.email
                });
            }

            setSubmissionMessage("Refreshing predictions...");
            if (onPredictionMade) {
                await onPredictionMade();
            }

            // Show success message briefly
            setSubmissionMessage("Prediction saved successfully!");
            setTimeout(() => {
                setSubmissionMessage("");
                setIsSubmitting(false);
            }, 1500);

        } catch (error) {
            console.error("Error making prediction:", error);
            setError("Failed to save prediction. Please try again.");
            setSubmissionMessage("");
            setIsSubmitting(false);
        }
    };

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        setError(null);
    };

    if (!series) {
        return <div>Series data is missing</div>;
    }

    return (
        <Card className={`${series.status === 'completed' ? 'bg-gray-50' : ''}`}>
            <CardHeader className="pb-2 py-3 px-3 sm:py-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className={`w-4 h-4 sm:w-5 sm:h-5 ${series.status === 'completed'
                                ? 'text-green-500'
                                : 'text-yellow-500'
                            }`} />
                        {series.round.split("_").map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(" ")}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        {renderDeadline()}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-3 sm:py-4 sm:px-6">
                <div className="space-y-3 sm:space-y-4">
                    {/* Teams */}
                    <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                            {series.team1 && <TeamLogo team={series.team1} className="w-8 h-8 sm:w-10 sm:h-10" />}
                            <span className={`text-sm sm:text-base font-medium ${series.winner === series.team1 ? 'text-green-600' : ''}`}>
                                {series.team1}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500">({series.team1_seed})</span>
                            {series.winner === series.team1 && (
                                <span className="text-xs sm:text-sm text-green-600">Winner</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {series.team2 && <TeamLogo team={series.team2} className="w-8 h-8 sm:w-10 sm:h-10" />}
                            <span className={`text-sm sm:text-base font-medium ${series.winner === series.team2 ? 'text-green-600' : ''}`}>
                                {series.team2}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500">({series.team2_seed})</span>
                            {series.winner === series.team2 && (
                                <span className="text-xs sm:text-sm text-green-600">Winner</span>
                            )}
                        </div>
                    </div>

                    {/* Points Info */}
                    <div className="text-xs sm:text-sm text-gray-500">
                        {isPlayIn ? (
                            "Points: 1 for correct winner"
                        ) : (
                            `Points: ${roundPoints[series.round] ?
                                `${roundPoints[series.round][0]} for winner, ${roundPoints[series.round][1]} with correct games` :
                                "TBD"}`
                        )}
                    </div>

                    {/* Series Result for completed series */}
                    {series.status === 'completed' && (
                        <div className="bg-green-50 p-3 rounded-lg">
                            <div className="font-medium text-green-800">
                                {series.winner} won {isPlayIn ? 'the game' : `in ${series.games} games`}
                            </div>
                        </div>
                    )}

                    {canPredict ? (
                        <div className="space-y-3">
                            <Select
                                value={predictionData.winner}
                                onValueChange={(value) => setPredictionData(prev => ({ ...prev, winner: value }))}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pick winner" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={series.team1}>{series.team1}</SelectItem>
                                    <SelectItem value={series.team2}>{series.team2}</SelectItem>
                                </SelectContent>
                            </Select>

                            {!isPlayIn && (
                                <Select
                                    value={predictionData.games}
                                    onValueChange={(value) => setPredictionData(prev => ({ ...prev, games: value }))}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Games to win" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="4">Win in 4</SelectItem>
                                        <SelectItem value="5">Win in 5</SelectItem>
                                        <SelectItem value="6">Win in 6</SelectItem>
                                        <SelectItem value="7">Win in 7</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            <Button
                                className="w-full relative"
                                onClick={makeNewPrediction}
                                disabled={
                                    !predictionData.winner ||
                                    (!isPlayIn && !predictionData.games) ||
                                    isSubmitting
                                }
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        <span>{submissionMessage || "Saving..."}</span>
                                    </div>
                                ) : (
                                    existingPrediction ? 'Update Prediction' : 'Submit Prediction'
                                )}
                            </Button>
                        </div>
                    ) : existingPrediction ? (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-sm font-medium">Your Prediction:</div>
                            <div className="text-gray-600">
                                {isPlayIn ? (
                                    <>{existingPrediction.winner} to win</>
                                ) : (
                                    <>{existingPrediction.winner} in {existingPrediction.games}</>
                                )}
                            </div>
                            {isDeadlinePassed && (
                                <div className="text-xs text-gray-500 mt-2">
                                    Predictions are locked
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 italic">
                            {!user ? "Sign in to make predictions" :
                                isDeadlinePassed ? "Predictions are closed for this series" :
                                    "Make your prediction"}
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="flex justify-between items-center">
                                <span>{error}</span>
                                <Button size="sm" variant="outline" onClick={handleRetry}>Retry</Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Add loading overlay for the entire card when submitting */}
                    {isSubmitting && (
                        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
                            <div className="bg-white p-4 rounded-lg shadow-lg">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                <p className="text-sm text-gray-600">{submissionMessage}</p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
