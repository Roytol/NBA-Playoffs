/**
 * BallDontLie NBA API client with Supabase caching.
 * 
 * All API calls go through getFromCacheOrFetch() which:
 * 1. Checks the api_cache table in Supabase
 * 2. If cached data is fresh (within TTL), returns it immediately
 * 3. If stale or missing, fetches from BallDontLie API, updates cache, returns fresh data
 */

import { supabase } from '@/lib/supabaseClient';

const API_BASE = 'https://api.balldontlie.io/v1';
const API_KEY = import.meta.env.VITE_BALLDONTLIE_API_KEY;

// Cache TTLs in milliseconds
export const CACHE_TTL = {
    TEAMS: 24 * 60 * 60 * 1000,        // 24 hours
    STANDINGS: 60 * 60 * 1000,          // 1 hour
    PLAYOFF_GAMES: 5 * 60 * 1000,       // 5 minutes
    LIVE_GAMES: 60 * 1000,              // 60 seconds
};

// Current NBA season (2025-26 season = season param 2025)
export const CURRENT_SEASON = 2025;

/**
 * Generic fetch wrapper for BallDontLie API
 */
async function apiFetch(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`);
    
    // Handle array params (e.g., seasons[]=2025)
    for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(`${key}[]`, v));
        } else if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    }

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': API_KEY,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`BallDontLie API error ${response.status}:`, errorText);
        throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return response.json();
}

/**
 * Fetch all pages of a paginated endpoint
 */
async function apiFetchAll(endpoint, params = {}, maxPages = 10) {
    let allData = [];
    let cursor = null;
    let page = 0;

    do {
        const queryParams = { ...params, per_page: 100 };
        if (cursor) queryParams.cursor = cursor;

        const result = await apiFetch(endpoint, queryParams);
        allData = allData.concat(result.data || []);
        cursor = result.meta?.next_cursor || null;
        page++;
    } while (cursor && page < maxPages);

    return allData;
}

/**
 * Core caching logic: check Supabase cache, fetch from API if stale
 */
async function getFromCacheOrFetch(cacheKey, ttlMs, fetchFn) {
    try {
        // 1. Check cache
        const { data: cached } = await supabase
            .from('api_cache')
            .select('*')
            .eq('cache_key', cacheKey)
            .maybeSingle();

        if (cached) {
            const age = Date.now() - new Date(cached.last_synced_at).getTime();
            if (age < ttlMs) {
                // Cache is fresh
                return cached.data;
            }
        }

        // 2. Cache is stale or missing — fetch fresh data
        const freshData = await fetchFn();

        // 3. Upsert into cache
        const { error: upsertError } = await supabase
            .from('api_cache')
            .upsert(
                {
                    cache_key: cacheKey,
                    data: freshData,
                    last_synced_at: new Date().toISOString(),
                },
                { onConflict: 'cache_key' }
            );

        if (upsertError) {
            console.warn(`Failed to update cache for ${cacheKey}:`, upsertError);
        }

        return freshData;
    } catch (error) {
        // If fetch fails, try to return stale cache as fallback
        console.error(`Error in getFromCacheOrFetch(${cacheKey}):`, error);

        const { data: staleCache } = await supabase
            .from('api_cache')
            .select('data')
            .eq('cache_key', cacheKey)
            .maybeSingle();

        if (staleCache) {
            console.warn(`Returning stale cache for ${cacheKey}`);
            return staleCache.data;
        }

        throw error;
    }
}

/**
 * Force-refresh a cache entry regardless of TTL
 */
async function forceRefreshCache(cacheKey, fetchFn) {
    const freshData = await fetchFn();

    await supabase
        .from('api_cache')
        .upsert(
            {
                cache_key: cacheKey,
                data: freshData,
                last_synced_at: new Date().toISOString(),
            },
            { onConflict: 'cache_key' }
        );

    return freshData;
}

// ============================================================
// Public API functions
// ============================================================

/**
 * Get all 30 NBA teams
 * Returns: [{ id, conference, division, city, name, full_name, abbreviation }, ...]
 */
export async function getTeams() {
    const teams = await getFromCacheOrFetch('teams', CACHE_TTL.TEAMS, async () => {
        const data = await apiFetch('/teams');
        return data.data || [];
    });
    // Filter out historical teams (IDs > 30) to prevent 1950s teams like "Chicago Stags"
    return (teams || []).filter(team => team.id <= 30);
}

/**
 * Get team standings for a season
 * Returns: [{ team, conference, division, wins, losses, ... }, ...]
 */
export async function getStandings(season = CURRENT_SEASON) {
    return getFromCacheOrFetch(`standings_${season}`, CACHE_TTL.STANDINGS, async () => {
        try {
            const data = await apiFetch('/standings', { season });
            return data.data || [];
        } catch (error) {
            console.warn('Could not fetch standings (requires paid tier), defaulting to empty.', error);
            return [];
        }
    });
}

/**
 * Get all playoff games for a season
 * Returns: [{ id, date, datetime, status, postseason, home_team, visitor_team, home_team_score, visitor_team_score, ... }, ...]
 */
export async function getPlayoffGames(season = CURRENT_SEASON) {
    return getFromCacheOrFetch(`games_postseason_${season}`, CACHE_TTL.PLAYOFF_GAMES, async () => {
        return apiFetchAll('/games', {
            seasons: [season],
            postseason: true,
        });
    });
}

/**
 * Get today's live/active games (not cached long — 60s)
 * Returns: [{ id, status, period, time, home_team_score, visitor_team_score, ... }, ...]
 */
export async function getLiveGames() {
    return getFromCacheOrFetch('live_games', CACHE_TTL.LIVE_GAMES, async () => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const data = await apiFetchAll('/games', {
            dates: [today],
            postseason: true,
            seasons: [CURRENT_SEASON],
        });
        return data;
    });
}

/**
 * Get team name list for dropdowns (from cache, with hardcoded fallback)
 */
export async function getTeamNames() {
    try {
        const teams = await getTeams();
        return teams
            .map(t => t.full_name)
            .sort();
    } catch {
        // Fallback to hardcoded list if API fails
        return [
            "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets",
            "Chicago Bulls", "Cleveland Cavaliers", "Dallas Mavericks", "Denver Nuggets",
            "Detroit Pistons", "Golden State Warriors", "Houston Rockets", "Indiana Pacers",
            "LA Clippers", "Los Angeles Lakers", "Memphis Grizzlies", "Miami Heat",
            "Milwaukee Bucks", "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks",
            "Oklahoma City Thunder", "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns",
            "Portland Trail Blazers", "Sacramento Kings", "San Antonio Spurs", "Toronto Raptors",
            "Utah Jazz", "Washington Wizards"
        ];
    }
}

/**
 * Force a full refresh of all cached data
 */
export async function forceRefreshAll() {
    const season = CURRENT_SEASON;

    await forceRefreshCache('teams', async () => {
        const data = await apiFetch('/teams');
        return data.data || [];
    });

    await forceRefreshCache(`standings_${season}`, async () => {
        try {
            const data = await apiFetch('/standings', { season });
            return data.data || [];
        } catch (error) {
            console.warn('Could not fetch standings for refresh (requires paid tier).');
            return [];
        }
    });

    await forceRefreshCache(`games_postseason_${season}`, async () => {
        return apiFetchAll('/games', {
            seasons: [season],
            postseason: true,
        });
    });
}
