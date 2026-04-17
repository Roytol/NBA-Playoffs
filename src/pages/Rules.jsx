import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, AlertCircle, Clock } from "lucide-react";

const SCORING_DETAILS = {
    play_in: { winner: 1, withGames: 1, description: "Play-In Games" },
    first_round: { winner: 1, withGames: 3, description: "First Round" },
    second_round: { winner: 2, withGames: 4, description: "Conference Semifinals" },
    conference_finals: { winner: 3, withGames: 6, description: "Conference Finals" },
    finals: { winner: 4, withGames: 8, description: "NBA Finals" },
    champion: { winner: 5, withGames: 5, description: "Champion Pick (Pre-playoffs)" },
    finals_mvp: { winner: 3, withGames: 3, description: "Finals MVP Pick (Pre-finals)" }
};

export default function RulesPage() {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Rules</h1>
            <p className="text-gray-500 mb-4 sm:mb-6 text-sm">Learn how to play and score points</p>

            {/* Scoring System */}
            <Card className="mb-4 sm:mb-8">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                        Scoring System
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4 sm:pb-6 sm:px-6">
                    <div className="grid gap-2 sm:gap-4">
                        {Object.entries(SCORING_DETAILS).map(([key, details]) => (
                            <div key={key} className="bg-gray-50 rounded-lg p-2 sm:p-4">
                                <h3 className="font-medium mb-1 text-sm sm:text-base">{details.description}</h3>
                                <p className="text-xs sm:text-sm text-gray-600">
                                    {details.winner === details.withGames ? (
                                        `${details.winner} points for correct pick`
                                    ) : (
                                        <>
                                            {details.winner} pts for winner
                                            {details.withGames - details.winner > 0 && (
                                                <span className="ml-2">+{details.withGames - details.winner} for exact games</span>
                                            )}
                                        </>
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Prediction Rules */}
            <Card className="mb-4 sm:mb-8">
                <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                        Prediction Rules
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 pb-3 px-4 sm:pb-6 sm:px-6">
                    <Alert className="py-2 text-xs sm:text-sm">
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        <AlertDescription>
                            All predictions must be submitted before deadlines.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-3 sm:space-y-4">
                        <div>
                            <h3 className="font-medium mb-1 text-sm sm:text-base">Series Predictions</h3>
                            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 pl-1">
                                <li>Pick winner and games for each series</li>
                                <li>Edit until series starts</li>
                                <li>Points for correct winner and game count</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-medium mb-1 text-sm sm:text-base">Champion Pick</h3>
                            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 pl-1">
                                <li>Pick before playoffs begin</li>
                                <li>Worth 5 points</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-medium mb-1 text-sm sm:text-base">Finals MVP</h3>
                            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 pl-1">
                                <li>Pick before Finals begin</li>
                                <li>Worth 3 points</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}