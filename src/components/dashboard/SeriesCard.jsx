
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Prediction, User } from "@/lib/db";
import TeamLogo from "../common/TeamLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

const roundPoints = {
    play_in: [1, 1],
    first_round: [1, 3],
    second_round: [2, 4],
    conference_finals: [3, 6],
    finals: [4, 8]
};

export default function SeriesCard({ series, predictions, user, onPredictionMade }) {
    const { toast } = useToast();
    const [predictionData, setPredictionData] = React.useState({
        winner: "",
        games: ""
    });
    const [isSubmitting, setIsSubmitting] = React.useState(false);

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

        try {
            const gamesValue = isPlayIn ? 1 : parseInt(predictionData.games);
            const isUpdate = !!existingPrediction;

            if (isUpdate) {
                await Prediction.update(existingPrediction.id, {
                    winner: predictionData.winner,
                    games: gamesValue,
                });
            } else {
                if (!series.series_id) throw new Error("Invalid series ID");
                await Prediction.create({
                    series_id: series.series_id,
                    winner: predictionData.winner,
                    games: gamesValue,
                    prediction_type: series.round,
                    points_earned: 0,
                    is_correct: false,
                    user_email: user.email
                });
            }

            if (onPredictionMade) await onPredictionMade();

            toast({
                title: isUpdate ? "Prediction updated! ✏️" : "Prediction locked in! 🏀",
                description: `${predictionData.winner}${
                    !isPlayIn ? ` in ${predictionData.games}` : ''
                }`,
            });
        } catch (error) {
            console.error("Error making prediction:", error);
            toast({
                title: "Failed to save prediction",
                description: "Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!series) {
        return <div>Series data is missing</div>;
    }

    // Determine if there's a live game in this series
    const currentGame = series.current_game;
    const isLive = currentGame?.is_live;

    return (
        <Card className={`${series.status === 'completed' ? 'bg-gray-50' : ''} ${isLive ? 'ring-2 ring-red-200' : ''}`}>
            <CardHeader className="pb-2 py-3 px-3 sm:py-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trophy className={`w-4 h-4 sm:w-5 sm:h-5 ${series.status === 'completed'
                                ? 'text-green-500'
                                : 'text-yellow-500'
                            }`} />
                        <span>
                            {series.conference && series.conference !== 'Finals' ? `${series.conference} · ` : ''}
                            {series.round.split("_").map(word =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(" ")}
                        </span>
                        {isLive && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                </span>
                                LIVE
                            </span>
                        )}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        {renderDeadline()}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-3 sm:py-4 sm:px-6">
                <div className="space-y-3 sm:space-y-4">
                    {/* Teams with Series Score */}
                    <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                            {series.team1 && <TeamLogo team={series.team1} className="w-8 h-8 sm:w-10 sm:h-10" />}
                            <span className={`text-sm sm:text-base font-medium flex-1 ${series.winner === series.team1 ? 'text-green-600' : ''}`}>
                                {series.team1}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500">({series.team1_seed})</span>
                            {/* Series win count */}
                            {!isPlayIn && (series.team1_wins > 0 || series.team2_wins > 0) && (
                                <span className={`text-lg sm:text-xl font-bold min-w-[24px] text-center ${
                                    series.winner === series.team1 ? 'text-green-600' : 'text-gray-700'
                                }`}>
                                    {series.team1_wins}
                                </span>
                            )}
                            {series.winner === series.team1 && (
                                <span className="text-xs sm:text-sm text-green-600 font-medium">✓</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            {series.team2 && <TeamLogo team={series.team2} className="w-8 h-8 sm:w-10 sm:h-10" />}
                            <span className={`text-sm sm:text-base font-medium flex-1 ${series.winner === series.team2 ? 'text-green-600' : ''}`}>
                                {series.team2}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-500">({series.team2_seed})</span>
                            {/* Series win count */}
                            {!isPlayIn && (series.team1_wins > 0 || series.team2_wins > 0) && (
                                <span className={`text-lg sm:text-xl font-bold min-w-[24px] text-center ${
                                    series.winner === series.team2 ? 'text-green-600' : 'text-gray-700'
                                }`}>
                                    {series.team2_wins}
                                </span>
                            )}
                            {series.winner === series.team2 && (
                                <span className="text-xs sm:text-sm text-green-600 font-medium">✓</span>
                            )}
                        </div>
                    </div>

                    {/* Live Game Score */}
                    {isLive && currentGame && (
                        <div className="bg-red-50 border border-red-200 p-2.5 sm:p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-red-700">
                                    Game {currentGame.game_number} · {currentGame.status}
                                    {currentGame.time && currentGame.time !== 'Final' ? ` · ${currentGame.time}` : ''}
                                </span>
                            </div>
                            <div className="flex items-center justify-center gap-4 mt-1.5">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500">{currentGame.home_team?.split(' ').pop()}</div>
                                    <div className="text-xl font-bold">{currentGame.home_team_score || 0}</div>
                                </div>
                                <div className="text-gray-400 text-sm">—</div>
                                <div className="text-center">
                                    <div className="text-xs text-gray-500">{currentGame.visitor_team?.split(' ').pop()}</div>
                                    <div className="text-xl font-bold">{currentGame.visitor_team_score || 0}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Next Game Info (not live, but scheduled) */}
                    {!isLive && currentGame && currentGame.status !== 'Final' && series.status !== 'completed' && (
                        <div className="bg-blue-50 border border-blue-100 p-2 sm:p-2.5 rounded-lg">
                            <div className="text-xs text-blue-700">
                                {currentGame.game_number ? `Game ${currentGame.game_number} · ` : ''}
                                {(() => {
                                    const timeStr = currentGame.datetime || currentGame.status;
                                    if (!timeStr) return '';
                                    if (timeStr.includes('T') || timeStr.includes('Z')) {
                                        return format(new Date(timeStr), "MMM d 'at' h:mm a");
                                    }
                                    return timeStr;
                                })()}
                            </div>
                        </div>
                    )}

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

                </div>
            </CardContent>
        </Card>
    );
}
