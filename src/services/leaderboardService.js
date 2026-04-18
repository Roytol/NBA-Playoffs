import { Leaderboard } from "@/lib/db";

export async function listLeaderboardEntries() {
    return Leaderboard.list();
}

export async function listLeaderboardEntriesByFilters(filters) {
    return Leaderboard.filter(filters);
}
