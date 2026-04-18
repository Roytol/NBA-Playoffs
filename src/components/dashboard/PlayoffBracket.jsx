import React from 'react';
import { Card } from "@/components/ui/card";
import TeamLogo from "../common/TeamLogo";
import { BRACKET_ROUND_KEYS, ROUND_LABELS } from "@/constants/app";

export default function PlayoffBracket({ series, predictions }) {
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
                        ? "surface-status-info border"
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
                        <h3 className="text-center font-semibold mb-6">{ROUND_LABELS[BRACKET_ROUND_KEYS[0]]}</h3>
                        <div className="space-y-4">
                            {getSeriesByRound(BRACKET_ROUND_KEYS[0], "East").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                        <div className="space-y-4 mt-8">
                            {getSeriesByRound(BRACKET_ROUND_KEYS[0], "West").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                    </div>

                    {/* Second Round */}
                    <div className="space-y-4 pt-12">
                        <h3 className="text-center font-semibold mb-6">{ROUND_LABELS[BRACKET_ROUND_KEYS[1]]}</h3>
                        <div className="space-y-16">
                            {getSeriesByRound(BRACKET_ROUND_KEYS[1], "East").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                        <div className="space-y-16 mt-8">
                            {getSeriesByRound(BRACKET_ROUND_KEYS[1], "West").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                    </div>

                    {/* Conference Finals */}
                    <div className="space-y-4 pt-24">
                        <h3 className="text-center font-semibold mb-6">{ROUND_LABELS[BRACKET_ROUND_KEYS[2]]}</h3>
                        <div className="space-y-32">
                            {getSeriesByRound(BRACKET_ROUND_KEYS[2], "East").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                        <div className="space-y-32 mt-8">
                            {getSeriesByRound(BRACKET_ROUND_KEYS[2], "West").map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                    </div>

                    {/* Finals */}
                    <div className="space-y-4 pt-48">
                        <h3 className="text-center font-semibold mb-6">{ROUND_LABELS[BRACKET_ROUND_KEYS[3]]}</h3>
                        <div className="space-y-4">
                            {getSeriesByRound(BRACKET_ROUND_KEYS[3]).map(s => (
                                <div key={s.series_id}>{renderSeries(s)}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
