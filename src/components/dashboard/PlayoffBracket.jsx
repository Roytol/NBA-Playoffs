import React from 'react';
import { Trophy } from "lucide-react";
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
function SeedBadge({ value, compact, micro = false }) {
    const v = value ?? "—";
    const two = String(v).length >= 2;
    const w = two
        ? (micro ? "w-3.5" : compact ? "w-4" : "w-[1.125rem]")
        : (micro ? "w-2" : compact ? "w-2.5" : "w-3");
    return (
        <span
            className={`tabular-nums font-medium text-gray-500 leading-none shrink-0 text-right opacity-90 ${micro ? "text-[6px]" : compact ? "text-[7px]" : "text-[8px]"} ${w}`}
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

    const renderSeries = (seriesData, { compact = false, micro = false, side = "neutral" } = {}) => {
        const pad = micro ? "px-1 py-1" : compact ? "p-1.5" : "p-2";
        const winSize = micro ? "text-[10px]" : compact ? "text-xs" : "text-sm";
        const logo = micro ? "w-3.5 h-3.5" : compact ? "w-5 h-5" : "w-6 h-6";
        const rowGap = micro ? "gap-0.5" : "gap-1";
        const rowMargin = micro ? "mt-0.5" : "mt-1";
        const liveText = micro ? "text-[7px]" : "text-[9px]";
        const liveDot = micro ? "h-1 w-1" : "h-1.5 w-1.5";

        if (!seriesData) {
            if (side === "finals") {
                return (
                    <div className={`rounded-lg bg-white border border-gray-100 ${micro ? "p-0.5" : "p-1"}`}>
                        <div
                            className={`rounded-md border border-dashed border-amber-300/40 bg-amber-50/50 flex flex-col items-center justify-center gap-0.5 ${micro ? "py-1.5 px-1" : "py-2.5 px-2"}`}
                            aria-label="NBA Finals matchup not yet set"
                        >
                            <Trophy className={`${micro ? "w-2.5 h-2.5" : "w-3 h-3"} text-brand-gold/90 shrink-0`} strokeWidth={2} />
                            <span className={`${micro ? "text-[7px]" : "text-[9px]"} text-gray-400 text-center leading-tight`}>
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
                    <div className={`absolute ${micro ? "top-0.5 right-0.5" : "top-1 right-1"} flex items-center gap-0.5`}>
                        <span className={`relative flex ${liveDot}`}>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className={`relative inline-flex rounded-full ${liveDot} bg-red-500`} />
                        </span>
                        <span className={`${liveText} font-bold text-red-600 uppercase tracking-wide`}>Live</span>
                    </div>
                )}
                <div className={`flex justify-between items-center ${rowGap} min-w-0 ${compact ? "text-sm" : ""}`}>
                    <div className="flex items-center gap-0.5 min-w-0">
                        <SeedBadge value={seriesData.team1_seed} compact={compact} micro={micro} />
                        <TeamLogo team={seriesData.team1} className={`${logo} shrink-0`} />
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                        <span className={`tabular-nums font-bold text-gray-900 tracking-tight ${winSize}`}>{w1}</span>
                    </div>
                </div>
                <div className={`flex justify-between items-center ${rowGap} ${rowMargin} min-w-0 ${compact ? "text-sm" : ""}`}>
                    <div className="flex items-center gap-0.5 min-w-0">
                        <SeedBadge value={seriesData.team2_seed} compact={compact} micro={micro} />
                        <TeamLogo team={seriesData.team2} className={`${logo} shrink-0`} />
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                        <span className={`tabular-nums font-bold text-gray-900 tracking-tight ${winSize}`}>{w2}</span>
                    </div>
                </div>
                {showPredictions && prediction && !micro && (
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

    const renderConferenceRoundColumn = (roundKey, gapIdx, conference, dense = false, micro = false) => {
        const { pt, gap } = roundColumnSpacing(gapIdx);
        const densePt = micro
            ? (gapIdx === 0 ? "" : gapIdx === 1 ? "pt-[1.35rem]" : "pt-[3.05rem]")
            : gapIdx === 0 ? "" : gapIdx === 1 ? "pt-2" : "pt-4";
        const denseGap = micro
            ? (gapIdx === 0 ? "space-y-0.5" : gapIdx === 1 ? "space-y-[2.8rem]" : "space-y-[5.85rem]")
            : gapIdx === 0 ? "space-y-1" : gapIdx === 1 ? "space-y-3" : "space-y-5";
        const side = conference === "East" ? "east" : "west";
        const list = getSeriesByRoundSorted(roundKey, conference);

        return (
            <div
                className={`flex flex-col min-w-0 ${micro ? "pl-px" : "pl-0.5 sm:pl-1"} border-l border-gray-100 first:border-l-0 first:pl-0 ${dense ? densePt : pt}`}
            >
                <h4 className={`text-center font-bold uppercase text-gray-500 px-0.5 leading-tight line-clamp-2 ${micro ? "text-[6px] tracking-[0.04em] mb-0.5" : dense ? "text-[7px] tracking-[0.06em] mb-1" : "text-[8px] sm:text-[9px] tracking-[0.1em] mb-1.5"}`}>
                    {ROUND_LABELS[roundKey]}
                </h4>
                <div className={`${dense ? denseGap : gap} min-w-0`}>
                    {list.length === 0 ? (
                        <p className={`${micro ? "text-[7px] py-1" : "text-[9px] py-2"} text-gray-300 text-center px-0.5`}>—</p>
                    ) : (
                        list.map((s) => (
                            <div key={seriesKey(s)} className="min-w-0">
                                {renderSeries(s, { compact: dense, micro, side })}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderFinalsColumn = ({ micro = false } = {}) => (
        <div
            className={`w-full min-w-0 mx-auto flex flex-col items-stretch rounded-lg border border-gray-200 bg-gray-50/30 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${micro ? "px-1 py-1" : "px-1.5 py-1.5"}`}
            aria-label="NBA Finals"
        >
            {finalsMatchup ? (
                renderSeries(finalsMatchup, { side: "neutral", micro })
            ) : (
                renderSeries(null, { side: "finals", micro })
            )}

            {finalsMatchup?.status === "completed" && finalsMatchup.winner && (
                <div className={`${micro ? "mt-1 pt-1" : "mt-2 pt-2"} border-t border-gray-100 text-center`}>
                    <p className={`${micro ? "text-[6px] tracking-[0.12em]" : "text-[8px] tracking-[0.18em]"} font-extrabold text-gray-600 uppercase`}>
                        Champion
                    </p>
                    <TeamLogo team={finalsMatchup.winner} className={`${micro ? "w-5 h-5 mt-1" : "w-9 h-9 mt-1.5"} mx-auto`} />
                    <p className={`${micro ? "text-[7px] mt-0.5 line-clamp-2" : "text-[10px] mt-1 line-clamp-3"} font-bold text-gray-900 leading-snug px-0.5`}>
                        {finalsMatchup.winner}
                    </p>
                </div>
            )}
        </div>
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

                <div className="lg:hidden w-full min-w-0">
                    <div className="rounded-xl border border-gray-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] px-2 py-2.5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div>
                                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-gray-500">
                                    Full bracket
                                </p>
                                <p className="text-[10px] text-gray-600 mt-0.5">
                                    Compact mobile tree
                                </p>
                            </div>
                            <div className="shrink-0 rounded-full border border-amber-200 bg-amber-50 p-1.5">
                                <Trophy className="w-3.5 h-3.5 text-brand-gold" strokeWidth={2.2} />
                            </div>
                        </div>

                        <div className="grid grid-cols-[1fr_2.8rem_1fr] gap-x-1 items-end mb-2">
                            <div className="text-center border-b-2 pb-1" style={{ borderColor: NBA.blue }}>
                                <p className="text-[7px] font-extrabold uppercase tracking-[0.06em] text-[#1D428A]">
                                    East
                                </p>
                            </div>
                            <div className="text-center border-b border-gray-300 pb-1 px-0.5">
                                <Trophy className="w-2.5 h-2.5 text-brand-gold mx-auto mb-0.5" strokeWidth={2} />
                                <p className="text-[6px] font-extrabold text-gray-900 uppercase tracking-[0.08em] leading-tight">
                                    Finals
                                </p>
                            </div>
                            <div className="text-center border-b-2 pb-1" style={{ borderColor: NBA.red }}>
                                <p className="text-[7px] font-extrabold uppercase tracking-[0.06em] text-[#C8102E]">
                                    West
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-[1fr_2.8rem_1fr] gap-x-1 items-start">
                            <div className="grid grid-cols-3 gap-x-0.5 min-w-0">
                                {EAST_ROUND_FLOW.map(({ roundKey, gapIdx }) => (
                                    <React.Fragment key={`east-mobile-${roundKey}`}>
                                        {renderConferenceRoundColumn(roundKey, gapIdx, "East", true, true)}
                                    </React.Fragment>
                                ))}
                            </div>

                            <div className="min-w-0 self-start">
                                {renderFinalsColumn({ micro: true })}
                            </div>

                            <div className="grid grid-cols-3 gap-x-0.5 min-w-0">
                                {WEST_ROUND_FLOW.map(({ roundKey, gapIdx }) => (
                                    <React.Fragment key={`west-mobile-${roundKey}`}>
                                        {renderConferenceRoundColumn(roundKey, gapIdx, "West", true, true)}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
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
