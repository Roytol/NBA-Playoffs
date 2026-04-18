import React from 'react';
import { Check, Trophy } from "lucide-react";
import TeamLogo from "../common/TeamLogo";
import { BRACKET_ROUND_KEYS, ROUND_LABELS } from "@/constants/app";
import { sortSeriesForBracketDisplay } from "@/utils/bracketOrder";

/** Official-adjacent NBA brand colors (mockup reference) */
const NBA = {
    blue: "#1D428A",
    red: "#C8102E",
    gold: "hsl(45 93% 47%)",
};

const MOBILE_ROUND_ORDER = [
    BRACKET_ROUND_KEYS[0],
    BRACKET_ROUND_KEYS[1],
    BRACKET_ROUND_KEYS[2],
];

function seriesKey(s) {
    return s.series_id ?? s.id ?? `${s.team1}-${s.team2}`;
}

function roundColumnSpacing(gapIdx) {
    const pt = gapIdx === 0 ? "" : gapIdx === 1 ? "pt-4 sm:pt-6" : "pt-8 sm:pt-12";
    const gap = gapIdx === 0 ? "space-y-1.5" : gapIdx === 1 ? "space-y-5 sm:space-y-6" : "space-y-9 sm:space-y-11";
    return { pt, gap };
}

const EAST_ROUND_FLOW = [
    { roundKey: BRACKET_ROUND_KEYS[0], gapIdx: 0 },
    { roundKey: BRACKET_ROUND_KEYS[1], gapIdx: 1 },
    { roundKey: BRACKET_ROUND_KEYS[2], gapIdx: 2 },
];

const WEST_ROUND_FLOW = [
    { roundKey: BRACKET_ROUND_KEYS[2], gapIdx: 2 },
    { roundKey: BRACKET_ROUND_KEYS[1], gapIdx: 1 },
    { roundKey: BRACKET_ROUND_KEYS[0], gapIdx: 0 },
];

function matchupShellClass(side, status) {
    const base = "relative rounded-lg border transition-shadow";
    const eastTint =
        "bg-white border-[#1D428A]/22 shadow-[inset_0_0_0_1px_rgba(29,66,138,0.04)] hover:border-[#1D428A]/35";
    const westTint =
        "bg-white border-[#C8102E]/22 shadow-[inset_0_0_0_1px_rgba(200,16,46,0.04)] hover:border-[#C8102E]/35";
    const neutral = "bg-white border-gray-200/90";

    if (side === "east") {
        if (status === "active") {
            return `${base} ${eastTint} ring-1 ring-[#1D428A]/25 shadow-sm`;
        }
        if (status === "completed") {
            return `${base} ${eastTint} opacity-[0.97]`;
        }
        return `${base} ${eastTint}`;
    }
    if (side === "west") {
        if (status === "active") {
            return `${base} ${westTint} ring-1 ring-[#C8102E]/25 shadow-sm`;
        }
        if (status === "completed") {
            return `${base} ${westTint} opacity-[0.97]`;
        }
        return `${base} ${westTint}`;
    }
    if (status === "active") {
        return `${base} ${neutral} ring-1 ring-blue-200/80 shadow-sm`;
    }
    return `${base} ${neutral}`;
}

/** Small seed to the left of the logo — subordinate to scores, but readable. */
function SeedBadge({ value, compact }) {
    const v = value ?? "—";
    const two = String(v).length >= 2;
    const w = two ? (compact ? "w-4" : "w-[1.125rem]") : (compact ? "w-2.5" : "w-3");
    return (
        <span
            className={`tabular-nums font-medium text-gray-500 leading-none shrink-0 text-right opacity-90 ${compact ? "text-[7px]" : "text-[8px]"} ${w}`}
            title="Seed"
        >
            {v}
        </span>
    );
}

export default function PlayoffBracket({
    series = [],
    predictions = [],
    showPredictions = true,
}) {
    const predictionList = showPredictions ? (predictions || []) : [];

    const getSeriesByRoundSorted = (round, conference = null) => {
        const filtered = series.filter((s) =>
            s.round === round &&
            (conference ? s.conference === conference : true)
        );
        return sortSeriesForBracketDisplay(filtered, round);
    };

    const playInEast = sortSeriesForBracketDisplay(
        series.filter((s) => s.round === "play_in" && s.conference === "East"),
        "play_in"
    );
    const playInWest = sortSeriesForBracketDisplay(
        series.filter((s) => s.round === "play_in" && s.conference === "West"),
        "play_in"
    );
    const hasPlayIn = playInEast.length > 0 || playInWest.length > 0;

    const finalsSeries = getSeriesByRoundSorted(BRACKET_ROUND_KEYS[3]);
    const finalsMatchup = finalsSeries[0] ?? null;

    const getPredictionForSeries = (seriesId) => {
        return predictionList.find((p) => p.series_id === seriesId);
    };

    const renderSeries = (seriesData, { compact = false, side = "neutral" } = {}) => {
        const pad = compact ? "p-1.5" : "p-2";
        const winSize = compact ? "text-xs" : "text-sm";
        const logo = compact ? "w-5 h-5" : "w-6 h-6";

        if (!seriesData) {
            if (side === "finals") {
                return (
                    <div className="rounded-lg bg-white p-1 border border-gray-100">
                        <div
                            className="rounded-md border border-dashed border-amber-300/40 bg-amber-50/50 py-2.5 px-2 flex flex-col items-center justify-center gap-0.5"
                            aria-label="NBA Finals matchup not yet set"
                        >
                            <Trophy className="w-3 h-3 text-brand-gold/90 shrink-0" strokeWidth={2} />
                            <span className="text-[9px] text-gray-400 text-center leading-tight">
                                Pending
                            </span>
                        </div>
                    </div>
                );
            }
            return null;
        }

        const w1 = Number(seriesData.team1_wins) || 0;
        const w2 = Number(seriesData.team2_wins) || 0;
        const prediction = getPredictionForSeries(seriesData.series_id);
        const isLive = seriesData.status === "active" && seriesData.current_game?.is_live;
        const shell = matchupShellClass(side, seriesData.status);

        return (
            <div className={`${shell} ${pad} min-w-0`}>
                {isLive && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                        </span>
                        <span className="text-[9px] font-bold text-red-600 uppercase tracking-wide">Live</span>
                    </div>
                )}
                <div className={`flex justify-between items-center gap-1 min-w-0 ${compact ? "text-sm" : ""}`}>
                    <div className="flex items-center gap-0.5 min-w-0">
                        <SeedBadge value={seriesData.team1_seed} compact={compact} />
                        <TeamLogo team={seriesData.team1} className={`${logo} shrink-0`} />
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                        <span className={`tabular-nums font-bold text-gray-900 tracking-tight ${winSize}`}>{w1}</span>
                        {seriesData.status === "completed" && seriesData.winner === seriesData.team1 && (
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" strokeWidth={2.5} aria-hidden />
                        )}
                    </div>
                </div>
                <div className={`flex justify-between items-center gap-1 mt-1 min-w-0 ${compact ? "text-sm" : ""}`}>
                    <div className="flex items-center gap-0.5 min-w-0">
                        <SeedBadge value={seriesData.team2_seed} compact={compact} />
                        <TeamLogo team={seriesData.team2} className={`${logo} shrink-0`} />
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                        <span className={`tabular-nums font-bold text-gray-900 tracking-tight ${winSize}`}>{w2}</span>
                        {seriesData.status === "completed" && seriesData.winner === seriesData.team2 && (
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" strokeWidth={2.5} aria-hidden />
                        )}
                    </div>
                </div>
                {showPredictions && prediction && (
                    <div className="mt-1.5 text-[10px] text-gray-500 border-t border-black/5 pt-1">
                        Your pick: {prediction.winner} in {prediction.games}
                    </div>
                )}
            </div>
        );
    };

    const ConferenceLabel = ({ children, variant }) => (
        <p
            className={`text-[9px] font-bold tracking-[0.18em] uppercase mb-2 ${variant === "east" ? "text-[#1D428A]" : "text-[#C8102E]"
                }`}
        >
            {children}
        </p>
    );

    const renderConferenceRoundColumn = (roundKey, gapIdx, conference) => {
        const { pt, gap } = roundColumnSpacing(gapIdx);
        const side = conference === "East" ? "east" : "west";
        const list = getSeriesByRoundSorted(roundKey, conference);

        return (
            <div
                className={`flex flex-col min-w-0 pl-1 sm:pl-1.5 border-l border-gray-100 first:border-l-0 first:pl-0 ${pt}`}
            >
                <h4 className="text-center font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.1em] text-gray-500 mb-1.5 px-0.5 leading-tight line-clamp-2">
                    {ROUND_LABELS[roundKey]}
                </h4>
                <div className={`${gap} min-w-0`}>
                    {list.length === 0 ? (
                        <p className="text-[9px] text-gray-300 text-center py-2 px-0.5">—</p>
                    ) : (
                        list.map((s) => (
                            <div key={seriesKey(s)} className="min-w-0">
                                {renderSeries(s, { compact: false, side })}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderFinalsColumn = () => (
        <div
            className="w-full min-w-0 mx-auto flex flex-col items-stretch rounded-lg border border-gray-200 bg-gray-50/30 px-1.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
            aria-label="NBA Finals"
        >
            {finalsMatchup ? (
                renderSeries(finalsMatchup, { side: "neutral" })
            ) : (
                renderSeries(null, { side: "finals" })
            )}

            {finalsMatchup?.status === "completed" && finalsMatchup.winner && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-center">
                    <p className="text-[8px] font-extrabold tracking-[0.18em] text-gray-600 uppercase">
                        Champion
                    </p>
                    <TeamLogo team={finalsMatchup.winner} className="w-9 h-9 mx-auto mt-1.5" />
                    <p className="text-[10px] font-bold text-gray-900 mt-1 leading-snug px-0.5 line-clamp-3">
                        {finalsMatchup.winner}
                    </p>
                </div>
            )}
        </div>
    );

    const renderMobileConference = (conference, borderColor, title) => (
        <section className="rounded-lg border border-gray-200/70 bg-white/50 p-3 w-full min-w-0">
            <h3
                className="text-center text-[10px] font-extrabold uppercase tracking-[0.16em] pb-2 mb-3 border-b-2"
                style={{ color: borderColor, borderColor }}
            >
                {title}
            </h3>
            <div className="space-y-4">
                {MOBILE_ROUND_ORDER.map((roundKey) => {
                    const side = conference === "East" ? "east" : "west";
                    const list = getSeriesByRoundSorted(roundKey, conference);
                    const oneSlot = list.length <= 1;
                    return (
                        <div key={`${conference}-${roundKey}`}>
                            <h4 className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-2">
                                {ROUND_LABELS[roundKey]}
                            </h4>
                            {list.length === 0 ? (
                                <p className="text-[10px] text-gray-300 text-center py-2">—</p>
                            ) : (
                                <div
                                    className={
                                        oneSlot
                                            ? "grid grid-cols-1 gap-2 max-w-[220px] mx-auto"
                                            : "grid grid-cols-2 gap-2"
                                    }
                                >
                                    {list.map((s) => (
                                        <div key={seriesKey(s)} className="min-w-0">
                                            {renderSeries(s, { compact: true, side })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );

    return (
        <div className="w-full max-w-full min-w-0 overflow-hidden rounded-lg border border-gray-200/60 bg-white shadow-sm">
            <div className="w-full max-w-full min-w-0 px-2 sm:px-3 pt-3 pb-4 lg:px-4">
                <div className="flex h-1 w-full min-w-0 rounded-full overflow-hidden mb-3 shadow-sm" aria-hidden>
                    <div className="flex-1 min-w-0 bg-[#1D428A]" />
                    <div
                        className="w-6 sm:w-7 shrink-0"
                        style={{ backgroundColor: NBA.gold }}
                    />
                    <div className="flex-1 min-w-0 bg-[#C8102E]" />
                </div>

                {hasPlayIn && (
                    <div className="mb-5">
                        <h3 className="text-center font-semibold text-xs text-gray-800 mb-0.5">
                            {ROUND_LABELS.play_in}
                        </h3>
                        <p className="text-center text-[9px] font-medium text-gray-400 uppercase tracking-[0.18em] mb-3">
                            Play-In tournament
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 min-w-0">
                            <div className="sm:pr-5 sm:border-r border-gray-100 min-w-0">
                                <ConferenceLabel variant="east">Eastern</ConferenceLabel>
                                <div className="space-y-1.5">
                                    {playInEast.map((s) => (
                                        <div key={seriesKey(s)}>{renderSeries(s, { compact: true, side: "east" })}</div>
                                    ))}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <ConferenceLabel variant="west">Western</ConferenceLabel>
                                <div className="space-y-1.5">
                                    {playInWest.map((s) => (
                                        <div key={seriesKey(s)}>{renderSeries(s, { compact: true, side: "west" })}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="lg:hidden space-y-5 min-w-0">
                    {renderMobileConference("East", NBA.blue, "Eastern Conference")}
                    <div className="text-center pb-1 border-b border-gray-200">
                        <Trophy className="w-3.5 h-3.5 text-brand-gold mx-auto mb-0.5" strokeWidth={2} />
                        <p className="text-[10px] font-extrabold text-gray-900 uppercase tracking-[0.16em]">
                            {ROUND_LABELS[BRACKET_ROUND_KEYS[3]]}
                        </p>
                    </div>
                    <div className="max-w-[12rem] w-full mx-auto min-w-0">
                        {renderFinalsColumn()}
                    </div>
                    {renderMobileConference("West", NBA.red, "Western Conference")}
                </div>

                <div className="hidden lg:block w-full min-w-0">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-x-1 sm:gap-x-2 mb-3 w-full min-w-0 items-end">
                        <div className="text-center border-b-2 pb-1 min-w-0" style={{ borderColor: NBA.blue }}>
                            <p
                                className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.14em] truncate px-0.5"
                                style={{ color: NBA.blue }}
                            >
                                Eastern Conference
                            </p>
                        </div>
                        <div className="text-center border-b border-gray-300 pb-1 w-[min(100%,6.5rem)] max-w-full min-w-0 justify-self-center px-0.5">
                            <Trophy className="w-3 h-3 text-brand-gold mx-auto mb-0.5" strokeWidth={2} />
                            <p className="text-[8px] sm:text-[9px] font-extrabold text-gray-900 uppercase tracking-[0.12em] leading-tight">
                                {ROUND_LABELS[BRACKET_ROUND_KEYS[3]]}
                            </p>
                        </div>
                        <div className="text-center border-b-2 pb-1 min-w-0" style={{ borderColor: NBA.red }}>
                            <p
                                className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.14em] truncate px-0.5"
                                style={{ color: NBA.red }}
                            >
                                Western Conference
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] gap-x-1 sm:gap-x-2 w-full min-w-0 items-start">
                        <div className="grid grid-cols-3 gap-x-0.5 sm:gap-x-1 min-w-0">
                            {EAST_ROUND_FLOW.map(({ roundKey, gapIdx }) => (
                                <React.Fragment key={`east-${roundKey}`}>
                                    {renderConferenceRoundColumn(roundKey, gapIdx, "East")}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="min-w-0 w-full max-w-[7rem] justify-self-center self-start">
                            {renderFinalsColumn()}
                        </div>

                        <div className="grid grid-cols-3 gap-x-0.5 sm:gap-x-1 min-w-0">
                            {WEST_ROUND_FLOW.map(({ roundKey, gapIdx }) => (
                                <React.Fragment key={`west-${roundKey}`}>
                                    {renderConferenceRoundColumn(roundKey, gapIdx, "West")}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
