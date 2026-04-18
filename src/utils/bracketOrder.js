/**
 * NBA playoff bracket display order (within one conference).
 *
 * First round — standard bracket layout top → bottom (same as nba.com-style trees):
 *   (1 vs 8), (4 vs 5), (3 vs 6), (2 vs 7)
 *
 * Second round — upper half is winners of the (1v8)/(4v5) side; lower half is (3v6)/(2v7).
 * We classify using original playoff seeds still stored on each team.
 */

/** First-round seed pairs in on-screen order (must match NBA bracket geometry). */
export const FIRST_ROUND_DISPLAY_PAIRS = [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
];

/** Seeds that belong to the upper half of the conference bracket before the finals. */
const UPPER_HALF_SEEDS = new Set([1, 4, 5, 8]);
/** Seeds that belong to the lower half. */
const LOWER_HALF_SEEDS = new Set([2, 3, 6, 7]);

/**
 * Numeric sort key for stable ordering within a round (lower sorts first).
 */
export function bracketSortKey(series, roundKey) {
    const s1 = series.team1_seed ?? 0;
    const s2 = series.team2_seed ?? 0;
    const lo = Math.min(s1, s2);
    const hi = Math.max(s1, s2);

    if (roundKey === "first_round") {
        const idx = FIRST_ROUND_DISPLAY_PAIRS.findIndex((p) => p[0] === lo && p[1] === hi);
        if (idx !== -1) return idx;
        // Non-standard pairings (reseed / data): fall back to higher-seed slot first
        return 100 + lo;
    }

    if (roundKey === "play_in") {
        return lo * 20 + hi;
    }

    if (roundKey === "second_round") {
        const inUpper = s1 > 0 && s2 > 0 && UPPER_HALF_SEEDS.has(s1) && UPPER_HALF_SEEDS.has(s2);
        const inLower = s1 > 0 && s2 > 0 && LOWER_HALF_SEEDS.has(s1) && LOWER_HALF_SEEDS.has(s2);
        if (inUpper && !inLower) return 0;
        if (inLower && !inUpper) return 1;
        return 50 + lo;
    }

    return 0;
}

export function sortSeriesForBracketDisplay(seriesList, roundKey) {
    return [...seriesList].sort((a, b) => {
        const ka = bracketSortKey(a, roundKey);
        const kb = bracketSortKey(b, roundKey);
        if (ka !== kb) return ka - kb;
        const minA = Math.min(a.team1_seed ?? 99, a.team2_seed ?? 99);
        const minB = Math.min(b.team1_seed ?? 99, b.team2_seed ?? 99);
        if (minA !== minB) return minA - minB;
        return Math.max(a.team1_seed ?? 0, a.team2_seed ?? 0) - Math.max(b.team1_seed ?? 0, b.team2_seed ?? 0);
    });
}
