import React from 'react';
import { Card } from "@/components/ui/card";
import TeamLogo from "../common/TeamLogo";

export default function PlayoffBracket({ series, predictions }) {
    const rounds = ["first_round", "second_round", "conference_finals", "finals"];

    const getSeriesByRound = (round, conference = null) => {
        return series.filter(s =>
            s.round === round &&
            (conference ? s.conference === conference : true)
        );
    };

    const getPredictionForSeries = (seriesId) => {
        return predictions.find(p => p.series_id === seriesId);
    };

    const renderSeries = (seriesData) => {
        if (!seriesData) return (
            <div className="h-24 border border-dashed rounded-lg flex items-center justify-center text-gray-400">
                TBD
            </div>
        );

        const prediction = getPredictionForSeries(seriesData.series_id);

        return (
            <Card className={`p-3 ${seriesData.status === "completed"
                    ? "bg-gray-50"
                    : seriesData.status === "active"
                        ? "bg-blue-50"
                        : ""
                }`}>
                <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                        <TeamLogo team={seriesData.team1} className="w-8 h-8" />
                        <span className="font-medium">{seriesData.team1_seed}</span>
                    </div>
                    {seriesData.status === "completed" && (
                        <div className="text-sm font-semibold">
                            {seriesData.winner === seriesData.team1 && "✓"}
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center gap-2 mt-2">
                    <div className="flex items-center gap-2">
                        <TeamLogo team={seriesData.team2} className="w-8 h-8" />
                        <span className="font-medium">{seriesData.team2_seed}</span>
                    </div>
                    {seriesData.status === "completed" && (
                        <div className="text-sm font-semibold">
                            {seriesData.winner === seriesData.team2 && "✓"}
                        </div>
                    )}
                </div>
                {prediction && (
                    <div className="mt-2 text-xs text-gray-500">
                        Your pick: {prediction.winner} in {prediction.games}
                    </div>
                )}
            </Card>
        );
    };

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[900px] p-4">
                <div className="grid grid-cols-4 gap-8">
                    {/* First Round */}
                    <div className="space-y-4">
                        <h3 className="text-center font-semibold mb-6">First Round</h3>
                        <div className="space-y-4">
                            {getSeriesByRound("first_round", "East").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                        <div className="space-y-4 mt-8">
                            {getSeriesByRound("first_round", "West").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                    </div>

                    {/* Second Round */}
                    <div className="space-y-4 pt-12">
                        <h3 className="text-center font-semibold mb-6">Conference Semifinals</h3>
                        <div className="space-y-16">
                            {getSeriesByRound("second_round", "East").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                        <div className="space-y-16 mt-8">
                            {getSeriesByRound("second_round", "West").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                    </div>

                    {/* Conference Finals */}
                    <div className="space-y-4 pt-24">
                        <h3 className="text-center font-semibold mb-6">Conference Finals</h3>
                        <div className="space-y-32">
                            {getSeriesByRound("conference_finals", "East").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                        <div className="space-y-32 mt-8">
                            {getSeriesByRound("conference_finals", "West").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                    </div>

                    {/* Finals */}
                    <div className="space-y-4 pt-48">
                        <h3 className="text-center font-semibold mb-6">NBA Finals</h3>
                        <div className="space-y-4">
                            {getSeriesByRound("finals").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}