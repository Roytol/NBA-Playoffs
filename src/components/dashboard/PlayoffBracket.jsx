import React from "react";
import { Trophy } from "lucide-react";
import TeamLogo from "../common/TeamLogo";
import { BRACKET_ROUND_KEYS, ROUND_LABELS } from "@/constants/app";
import { BRACKET_THEME } from "@/constants/theme";
import { sortSeriesForBracketDisplay } from "@/utils/bracketOrder";

const SEED_BADGE_WIDTHS = {
  compact: {
    single: "w-2.5",
    double: "w-4",
  },
  regular: {
    single: "w-3",
    double: "w-[1.125rem]",
  },
  micro: {
    single: "w-2",
    double: "w-3.5",
  },
};

const SEED_BADGE_TEXT_SIZE = {
  micro: "text-[6px]",
  compact: "text-[7px]",
  regular: "text-[8px]",
};

const SERIES_SIZE_PRESETS = {
  micro: {
    pad: "px-1 py-1",
    score: "text-[10px]",
    logo: "w-3.5 h-3.5",
    rowGap: "gap-0.5",
    rowMargin: "mt-0.5",
    liveText: "text-[7px]",
    liveDot: "h-1 w-1",
  },
  compact: {
    pad: "p-1.5",
    score: "text-xs",
    logo: "w-5 h-5",
    rowGap: "gap-1",
    rowMargin: "mt-1",
    liveText: "text-[9px]",
    liveDot: "h-1.5 w-1.5",
  },
  regular: {
    pad: "p-2",
    score: "text-sm",
    logo: "w-6 h-6",
    rowGap: "gap-1",
    rowMargin: "mt-1",
    liveText: "text-[9px]",
    liveDot: "h-1.5 w-1.5",
  },
};

const DENSE_ROUND_SPACING = {
  regular: {
    pt: ["", "pt-2", "pt-4"],
    gap: ["space-y-1", "space-y-3", "space-y-5"],
  },
  micro: {
    pt: ["", "pt-[1.35rem]", "pt-[3.05rem]"],
    gap: ["space-y-0.5", "space-y-[2.8rem]", "space-y-[5.85rem]"],
  },
};

function seriesKey(s) {
  return s.series_id ?? s.id ?? `${s.team1}-${s.team2}`;
}

function roundColumnSpacing(gapIdx) {
  const pt =
    gapIdx === 0 ? "" : gapIdx === 1 ? "pt-4 sm:pt-6" : "pt-8 sm:pt-12";
  const gap =
    gapIdx === 0
      ? "space-y-1.5"
      : gapIdx === 1
        ? "space-y-5 sm:space-y-6"
        : "space-y-9 sm:space-y-11";
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
  const eastTint = BRACKET_THEME.matchupTint.east;
  const westTint = BRACKET_THEME.matchupTint.west;
  const neutral = BRACKET_THEME.matchupTint.neutral;

  if (side === "east") {
    if (status === "active") {
      return `${base} ${eastTint} ${BRACKET_THEME.matchupRing.east}`;
    }
    if (status === "completed") {
      return `${base} ${eastTint} opacity-[0.97]`;
    }
    return `${base} ${eastTint}`;
  }
  if (side === "west") {
    if (status === "active") {
      return `${base} ${westTint} ${BRACKET_THEME.matchupRing.west}`;
    }
    if (status === "completed") {
      return `${base} ${westTint} opacity-[0.97]`;
    }
    return `${base} ${westTint}`;
  }
  if (status === "active") {
    return `${base} ${neutral} ${BRACKET_THEME.matchupRing.neutral}`;
  }
  return `${base} ${neutral}`;
}

/** Small seed to the left of the logo — subordinate to scores, but readable. */
function SeedBadge({ value, compact, micro = false }) {
  const v = value ?? "—";
  const two = String(v).length >= 2;
  const sizeKey = micro ? "micro" : compact ? "compact" : "regular";
  const width = two
    ? SEED_BADGE_WIDTHS[sizeKey].double
    : SEED_BADGE_WIDTHS[sizeKey].single;
  const textSize = micro
    ? SEED_BADGE_TEXT_SIZE.micro
    : compact
      ? SEED_BADGE_TEXT_SIZE.compact
      : SEED_BADGE_TEXT_SIZE.regular;
  return (
    <span
      className={`shrink-0 text-right tabular-nums font-medium leading-none text-muted-foreground opacity-90 ${textSize} ${width}`}
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
  const predictionList = showPredictions ? predictions || [] : [];

  const getSeriesByRoundSorted = (round, conference = null) => {
    const filtered = series.filter(
      (s) =>
        s.round === round && (conference ? s.conference === conference : true),
    );
    return sortSeriesForBracketDisplay(filtered, round);
  };

  const playInEast = sortSeriesForBracketDisplay(
    series.filter((s) => s.round === "play_in" && s.conference === "East"),
    "play_in",
  );
  const playInWest = sortSeriesForBracketDisplay(
    series.filter((s) => s.round === "play_in" && s.conference === "West"),
    "play_in",
  );
  const hasPlayIn = playInEast.length > 0 || playInWest.length > 0;

  const finalsSeries = getSeriesByRoundSorted(BRACKET_ROUND_KEYS[3]);
  const finalsMatchup = finalsSeries[0] ?? null;

  const getPredictionForSeries = (seriesId) => {
    return predictionList.find((p) => p.series_id === seriesId);
  };

  const renderSeries = (
    seriesData,
    { compact = false, micro = false, side = "neutral" } = {},
  ) => {
    const sizePreset = micro
      ? SERIES_SIZE_PRESETS.micro
      : compact
        ? SERIES_SIZE_PRESETS.compact
        : SERIES_SIZE_PRESETS.regular;

    if (!seriesData) {
      if (side === "finals") {
        return (
          <div
            className={`rounded-lg border border-border bg-card ${micro ? "p-0.5" : "p-1"}`}
          >
            <div
              className={`${BRACKET_THEME.finalsPlaceholder} ${micro ? "py-1.5 px-1" : "py-2.5 px-2"}`}
              aria-label="NBA Finals matchup not yet set"
            >
              <Trophy
                className={`${micro ? "w-2.5 h-2.5" : "w-3 h-3"} text-brand-gold/90 shrink-0`}
                strokeWidth={2}
              />
              <span
                className={`${micro ? "text-[7px]" : "text-[9px]"} text-center leading-tight text-muted-foreground`}
              >
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
    const isLive =
      seriesData.status === "active" && seriesData.current_game?.is_live;
    const shell = matchupShellClass(side, seriesData.status);

    return (
      <div className={`${shell} ${sizePreset.pad} min-w-0`}>
        {isLive && (
          <div
            className={`absolute ${micro ? "top-0.5 right-0.5" : "top-1 right-1"} flex items-center gap-0.5`}
          >
            <span className={`relative flex ${sizePreset.liveDot}`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span
                className={`relative inline-flex rounded-full ${sizePreset.liveDot} bg-red-500`}
              />
            </span>
            <span
              className={`${sizePreset.liveText} font-bold text-red-600 uppercase tracking-wide`}
            >
              Live
            </span>
          </div>
        )}
        <div
          className={`flex justify-between items-center ${sizePreset.rowGap} min-w-0 ${compact ? "text-sm" : ""}`}
        >
          <div className="flex items-center gap-0.5 min-w-0">
            <SeedBadge
              value={seriesData.team1_seed}
              compact={compact}
              micro={micro}
            />
            <TeamLogo
              team={seriesData.team1}
              className={`${sizePreset.logo} shrink-0`}
            />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <span
              className={`tabular-nums font-bold tracking-tight text-foreground ${sizePreset.score}`}
            >
              {w1}
            </span>
          </div>
        </div>
        <div
          className={`flex justify-between items-center ${sizePreset.rowGap} ${sizePreset.rowMargin} min-w-0 ${compact ? "text-sm" : ""}`}
        >
          <div className="flex items-center gap-0.5 min-w-0">
            <SeedBadge
              value={seriesData.team2_seed}
              compact={compact}
              micro={micro}
            />
            <TeamLogo
              team={seriesData.team2}
              className={`${sizePreset.logo} shrink-0`}
            />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <span
              className={`tabular-nums font-bold tracking-tight text-foreground ${sizePreset.score}`}
            >
              {w2}
            </span>
          </div>
        </div>
        {showPredictions && prediction && !micro && (
          <div className="mt-1.5 border-t border-border pt-1 text-[10px] text-muted-foreground">
            Your pick: {prediction.winner} in {prediction.games}
          </div>
        )}
      </div>
    );
  };

  const ConferenceLabel = ({ children, variant }) => (
    <p
      className={`text-[9px] font-bold tracking-[0.18em] uppercase mb-2 ${
        variant === "east"
          ? BRACKET_THEME.conferenceText.east
          : BRACKET_THEME.conferenceText.west
      }`}
    >
      {children}
    </p>
  );

  const renderConferenceRoundColumn = (
    roundKey,
    gapIdx,
    conference,
    dense = false,
    micro = false,
  ) => {
    const { pt, gap } = roundColumnSpacing(gapIdx);
    const densePt = micro
      ? DENSE_ROUND_SPACING.micro.pt[gapIdx]
      : DENSE_ROUND_SPACING.regular.pt[gapIdx];
    const denseGap = micro
      ? DENSE_ROUND_SPACING.micro.gap[gapIdx]
      : DENSE_ROUND_SPACING.regular.gap[gapIdx];
    const side = conference === "East" ? "east" : "west";
    const list = getSeriesByRoundSorted(roundKey, conference);

    return (
      <div
        className={`flex min-w-0 flex-col border-l border-border ${micro ? "pl-px" : "pl-0.5 sm:pl-1"} first:border-l-0 first:pl-0 ${dense ? densePt : pt}`}
      >
        <h4
          className={`line-clamp-2 px-0.5 text-center font-bold uppercase leading-tight text-muted-foreground ${micro ? "mb-0.5 text-[6px] tracking-[0.04em]" : dense ? "mb-1 text-[7px] tracking-[0.06em]" : "mb-1.5 text-[8px] tracking-[0.1em] sm:text-[9px]"}`}
        >
          {ROUND_LABELS[roundKey]}
        </h4>
        <div className={`${dense ? denseGap : gap} min-w-0`}>
          {list.length === 0 ? (
            <p
              className={`${micro ? "text-[7px] py-1" : "text-[9px] py-2"} px-0.5 text-center text-border`}
            >
              —
            </p>
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
      className={`mx-auto flex w-full min-w-0 flex-col items-stretch rounded-lg border border-border bg-muted/30 shadow-[0_1px_2px_hsl(var(--foreground)/0.08)] ${micro ? "px-1 py-1" : "px-1.5 py-1.5"}`}
      aria-label="NBA Finals"
    >
      {finalsMatchup
        ? renderSeries(finalsMatchup, { side: "neutral", micro })
        : renderSeries(null, { side: "finals", micro })}

      {finalsMatchup?.status === "completed" && finalsMatchup.winner && (
        <div
          className={`${micro ? "mt-1 pt-1" : "mt-2 pt-2"} border-t border-border text-center`}
        >
          <p
            className={`${micro ? "text-[6px] tracking-[0.12em]" : "text-[8px] tracking-[0.18em]"} font-extrabold uppercase text-muted-foreground`}
          >
            Champion
          </p>
          <TeamLogo
            team={finalsMatchup.winner}
            className={`${micro ? "w-5 h-5 mt-1" : "w-9 h-9 mt-1.5"} mx-auto`}
          />
          <p
            className={`${micro ? "mt-0.5 text-[7px] line-clamp-2" : "mt-1 text-[10px] line-clamp-3"} px-0.5 font-bold leading-snug text-foreground`}
          >
            {finalsMatchup.winner}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="w-full max-w-full min-w-0 px-2 sm:px-3 pt-3 pb-4 lg:px-4">
        <div
          className="flex h-1 w-full min-w-0 rounded-full overflow-hidden mb-3 shadow-sm"
          aria-hidden
        >
          <div className={`flex-1 min-w-0 ${BRACKET_THEME.brandBar.east}`} />
          <div
            className={`w-6 sm:w-7 shrink-0 ${BRACKET_THEME.brandBar.divider}`}
          />
          <div className={`flex-1 min-w-0 ${BRACKET_THEME.brandBar.west}`} />
        </div>

        {hasPlayIn && (
          <div className="mb-5">
            <h3 className="mb-0.5 text-center text-xs font-semibold text-foreground">
              {ROUND_LABELS.play_in}
            </h3>
            <p className="mb-3 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Play-In tournament
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 min-w-0">
              <div className="min-w-0 sm:border-r sm:border-border sm:pr-5">
                <ConferenceLabel variant="east">Eastern</ConferenceLabel>
                <div className="space-y-1.5">
                  {playInEast.map((s) => (
                    <div key={seriesKey(s)}>
                      {renderSeries(s, { compact: true, side: "east" })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-w-0">
                <ConferenceLabel variant="west">Western</ConferenceLabel>
                <div className="space-y-1.5">
                  {playInWest.map((s) => (
                    <div key={seriesKey(s)}>
                      {renderSeries(s, { compact: true, side: "west" })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="lg:hidden w-full min-w-0">
          <div className={BRACKET_THEME.mobileShell}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Full bracket
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Compact mobile tree
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 p-1.5">
                <Trophy
                  className="w-3.5 h-3.5 text-brand-gold"
                  strokeWidth={2.2}
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_2.8rem_1fr] gap-x-1 items-end mb-2">
              <div
                className={`text-center border-b-2 pb-1 ${BRACKET_THEME.conferenceBorder.east}`}
              >
                <p
                  className={`text-[7px] font-extrabold uppercase tracking-[0.06em] ${BRACKET_THEME.conferenceText.east}`}
                >
                  East
                </p>
              </div>
              <div className="px-0.5 pb-1 text-center border-b border-border">
                <Trophy
                  className="w-2.5 h-2.5 text-brand-gold mx-auto mb-0.5"
                  strokeWidth={2}
                />
                <p className="text-[6px] font-extrabold uppercase tracking-[0.08em] leading-tight text-foreground">
                  Finals
                </p>
              </div>
              <div
                className={`text-center border-b-2 pb-1 ${BRACKET_THEME.conferenceBorder.west}`}
              >
                <p
                  className={`text-[7px] font-extrabold uppercase tracking-[0.06em] ${BRACKET_THEME.conferenceText.west}`}
                >
                  West
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_2.8rem_1fr] gap-x-1 items-start">
              <div className="grid grid-cols-3 gap-x-0.5 min-w-0">
                {EAST_ROUND_FLOW.map(({ roundKey, gapIdx }) => (
                  <React.Fragment key={`east-mobile-${roundKey}`}>
                    {renderConferenceRoundColumn(
                      roundKey,
                      gapIdx,
                      "East",
                      true,
                      true,
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="min-w-0 self-start">
                {renderFinalsColumn({ micro: true })}
              </div>

              <div className="grid grid-cols-3 gap-x-0.5 min-w-0">
                {WEST_ROUND_FLOW.map(({ roundKey, gapIdx }) => (
                  <React.Fragment key={`west-mobile-${roundKey}`}>
                    {renderConferenceRoundColumn(
                      roundKey,
                      gapIdx,
                      "West",
                      true,
                      true,
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block w-full min-w-0">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-x-1 sm:gap-x-2 mb-3 w-full min-w-0 items-end">
            <div
              className={`text-center border-b-2 pb-1 min-w-0 ${BRACKET_THEME.conferenceBorder.east}`}
            >
              <p
                className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.14em] truncate px-0.5 ${BRACKET_THEME.conferenceText.east}`}
              >
                Eastern Conference
              </p>
            </div>
            <div className="w-[min(100%,6.5rem)] max-w-full min-w-0 justify-self-center px-0.5 pb-1 text-center border-b border-border">
              <Trophy
                className="w-3 h-3 text-brand-gold mx-auto mb-0.5"
                strokeWidth={2}
              />
              <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] leading-tight text-foreground sm:text-[9px]">
                {ROUND_LABELS[BRACKET_ROUND_KEYS[3]]}
              </p>
            </div>
            <div
              className={`text-center border-b-2 pb-1 min-w-0 ${BRACKET_THEME.conferenceBorder.west}`}
            >
              <p
                className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.14em] truncate px-0.5 ${BRACKET_THEME.conferenceText.west}`}
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
