// Shared time building blocks used anywhere the app needs readable millisecond values.
// Consumers: API cache TTLs, polling intervals, banner cooldowns, and UI delays.
export const TIME_MS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
};

// Centralized "wait this long" values for UX and polling behavior.
// Changing these affects Admin success/error message timing, API cache lock behavior,
// the add-to-home-screen banner delay, and live-score polling cadence.
export const APP_DELAYS = {
    PROCESSING_COMPLETE: 2 * TIME_MS.SECOND,
    TRANSIENT_MESSAGE: 3 * TIME_MS.SECOND,
    CACHE_LOCK_MAX_AGE: 10 * TIME_MS.SECOND,
    CACHE_LOCK_RETRY: 2500,
    HOME_SCREEN_BANNER_SHOW: 3 * TIME_MS.SECOND,
    LIVE_POLL: TIME_MS.MINUTE,
};

// The active NBA season used by API calls and admin defaults.
// Example: 2025 means the 2025-26 NBA season.
export const CURRENT_SEASON = 2025;

// Canonical keys for the Settings table in Supabase.
// Consumers: Admin, Layout, Leaderboard, Rules, Predictions, AllPredictions,
// UserPredictions, and the pre-playoff picks components.
export const SETTINGS_KEYS = {
    ACTIVE_SEASON: "active_season",
    SCORING_RULES: "scoring_rules",
    CHAMPION_PREDICTION_DEADLINE: "champion_prediction_deadline",
    MVP_PREDICTION_START: "mvp_prediction_start",
    MVP_PREDICTION_DEADLINE: "mvp_prediction_deadline",
    MVP_PREDICTION_STATUS: "mvp_prediction_status",
    CHAMPION_MVP_WINNERS: "champion_mvp_winners",
};

// Local storage keys used by browser-only UI behavior.
// Right now this is only used by the add-to-home-screen banner dismissal state.
export const STORAGE_KEYS = {
    HOME_SCREEN_BANNER_DISMISSED: "hs_banner_dismissed",
};

// Controls how long the iOS add-to-home-screen banner stays dismissed after the user closes it.
export const HOME_SCREEN_BANNER_DISMISS_DAYS = 1;

// Source of truth for playoff round metadata.
// This drives labels, tab text, sort order, and default scoring across Dashboard,
// Admin, Rules, Predictions, UserPredictions, AllPredictions, and the bracket UI.
export const ROUND_CONFIG = {
    play_in: {
        label: "Play-In Games",
        tabLabel: "Play-In",
        groupLabel: "Play-In",
        shortLabel: "Play-In",
        winnerPoints: 1,
        gamesPoints: 0,
        sortOrder: 0,
    },
    first_round: {
        label: "First Round",
        tabLabel: "First",
        groupLabel: "1st",
        shortLabel: "First Round",
        winnerPoints: 1,
        gamesPoints: 2,
        sortOrder: 1,
    },
    second_round: {
        label: "Conference Semifinals",
        tabLabel: "Second",
        groupLabel: "2nd",
        shortLabel: "Conference Semifinals",
        winnerPoints: 2,
        gamesPoints: 2,
        sortOrder: 2,
    },
    conference_finals: {
        label: "Conference Finals",
        tabLabel: "Conf",
        groupLabel: "Conf",
        shortLabel: "Conference Finals",
        winnerPoints: 3,
        gamesPoints: 3,
        sortOrder: 3,
    },
    finals: {
        label: "NBA Finals",
        tabLabel: "Finals",
        groupLabel: "Finals",
        shortLabel: "NBA Finals",
        winnerPoints: 4,
        gamesPoints: 4,
        sortOrder: 4,
    },
    champion: {
        label: "Champion Pick (Pre-playoffs)",
        tabLabel: "Champ",
        groupLabel: "Champion",
        shortLabel: "Champion Pick",
        winnerPoints: 5,
        gamesPoints: null,
        sortOrder: 5,
    },
    finals_mvp: {
        label: "Finals MVP Pick (Pre-finals)",
        tabLabel: "MVP",
        groupLabel: "Finals MVP",
        shortLabel: "Finals MVP",
        winnerPoints: 3,
        gamesPoints: null,
        sortOrder: 6,
    },
};

// Ordered list of all supported prediction/round types in the app.
export const ROUND_KEYS = Object.keys(ROUND_CONFIG);

// Only the rounds that are actual series with winner + games picks.
// Excludes bonus picks like champion and finals MVP.
export const SERIES_ROUND_KEYS = ROUND_KEYS.filter((roundKey) => ROUND_CONFIG[roundKey].gamesPoints !== null);

// The subset of rounds rendered in the visual playoff bracket.
export const BRACKET_ROUND_KEYS = ["first_round", "second_round", "conference_finals", "finals"];

// Lightweight lookup map used when sorting series cards by round progression.
// Primary consumer: Dashboard closed-series ordering.
export const ROUND_SORT_ORDER = Object.fromEntries(
    ROUND_KEYS.map((roundKey) => [roundKey, ROUND_CONFIG[roundKey].sortOrder])
);

// Full display labels for each round key.
// Consumers: Rules page, PlayoffBracket, and generic round-title helpers.
export const ROUND_LABELS = Object.fromEntries(
    ROUND_KEYS.map((roundKey) => [roundKey, ROUND_CONFIG[roundKey].label])
);

// Fallback scoring rules used when the DB has no saved scoring config yet.
// Primary consumers: Admin defaults and Rules page fallback rendering.
export const DEFAULT_SCORING_RULES = Object.fromEntries(
    ROUND_KEYS.map((roundKey) => [
        roundKey,
        {
            winner: ROUND_CONFIG[roundKey].winnerPoints,
            games: ROUND_CONFIG[roundKey].gamesPoints,
        },
    ])
);

// UI-friendly scoring summary for badges/tooltips/tables.
// "winner" is the base score, "max" is the total possible score for that prediction type.
// Consumers: SeriesCard and Predictions page.
export const ROUND_POINTS_DISPLAY = Object.fromEntries(
    ROUND_KEYS.map((roundKey) => {
        const { winnerPoints, gamesPoints } = ROUND_CONFIG[roundKey];
        return [
            roundKey,
            {
                winner: winnerPoints,
                max: gamesPoints === null ? winnerPoints : winnerPoints + gamesPoints,
            },
        ];
    })
);

// Shared tab model for predictions-related pages so tab order and labels stay aligned.
// Consumers: Predictions, UserPredictions, and AllPredictions.
export const PREDICTION_TABS = [
    { value: "all", label: "All" },
    ...ROUND_KEYS.map((roundKey) => ({
        value: roundKey,
        label: ROUND_CONFIG[roundKey].tabLabel,
    })),
];

// Merges DB scoring values with our app defaults and display descriptions.
// Used when rendering the Rules page so missing DB fields do not break the UI.
export function buildScoringDetails(scoringRules = DEFAULT_SCORING_RULES) {
    return Object.fromEntries(
        ROUND_KEYS.map((roundKey) => [
            roundKey,
            {
                ...DEFAULT_SCORING_RULES[roundKey],
                ...(scoringRules?.[roundKey] || {}),
                description: ROUND_LABELS[roundKey],
            },
        ])
    );
}

// Returns the full human-readable label for a round key.
// Useful when a page has a round id like "conference_finals" and needs display text.
export function getRoundDisplayLabel(roundKey) {
    return ROUND_LABELS[roundKey] || roundKey;
}

// Returns the compact/group label used in tighter UI spaces.
// Examples: "1st", "2nd", "Conf", "Champion".
// Primary consumer: AllPredictions grouped cards.
export function getRoundGroupLabel(roundKey) {
    return ROUND_CONFIG[roundKey]?.groupLabel || roundKey;
}
