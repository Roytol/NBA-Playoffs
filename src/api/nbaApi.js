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
    TEAMS: 24 * 60 * 60 * 1000,            // 24 hours
    STANDINGS: 30 * 24 * 60 * 60 * 1000,   // 30 days — playoff seeds never change mid-season
    PLAYOFF_GAMES: 5 * 60 * 1000,           // 5 minutes
    LIVE_GAMES: 60 * 1000,                  // 60 seconds
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
            // Treat empty arrays as cache misses — forces re-fetch (e.g. stale [] from old endpoint)
            const hasData = !Array.isArray(cached.data) || cached.data.length > 0;
            if (age < ttlMs && hasData) {
                // Cache is fresh and non-empty
                return cached.data;
            }
        }

        // 2. Cache is stale or missing — attempt to acquire distributed lock
        const lockKey = `${cacheKey}_lock`;
        const { data: lockRecord } = await supabase
            .from('api_cache')
            .select('last_synced_at')
            .eq('cache_key', lockKey)
            .maybeSingle();

        if (lockRecord) {
            const lockAge = Date.now() - new Date(lockRecord.last_synced_at).getTime();
            if (lockAge < 10000) {
                // Lock is less than 10s old — another client is currently fetching!
                console.log(`[API Cache] Lock active for ${cacheKey}. Serving stale/waiting...`);
                if (cached) return cached.data; 
                
                // If completely missing, wait 2.5s and retry cache read
                await new Promise(resolve => setTimeout(resolve, 2500));
                return getFromCacheOrFetch(cacheKey, ttlMs, fetchFn);
            }
        }

        // Acquire lock
        await supabase.from('api_cache').upsert({
            cache_key: lockKey,
            data: { status: 'syncing' },
            last_synced_at: new Date().toISOString()
        }, { onConflict: 'cache_key' });

        // 3. Fetch fresh data
        const freshData = await fetchFn();

        // 4. Upsert into cache
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

        // Free the lock
        await supabase.from('api_cache').delete().eq('cache_key', lockKey);

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
 * Get team standings with conference seeds.
 * Uses ESPN's public (unofficial) standings API — free, no auth required.
 * Returns: [{ team: { full_name }, seed, conference, wins, losses }, ...]
 */
export async function getStandings(season = CURRENT_SEASON) {
    // ESPN uses the season END year (e.g. 2025-26 season → espnSeason=2026)
    const espnSeason = season + 1;

    return getFromCacheOrFetch(`standings_${season}`, CACHE_TTL.STANDINGS, async () => {
        try {
            const res = await fetch(
                `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${espnSeason}`
            );
            if (!res.ok) throw new Error(`ESPN standings HTTP ${res.status}`);
            const data = await res.json();

            const results = [];
            for (const conf of data.children || []) {
                const conference = conf.name?.includes('Eastern') ? 'East' : 'West';
                for (const entry of conf.standings?.entries || []) {
                    const fullName = entry.team?.displayName;
                    if (!fullName) continue;
                    let seed = 0, wins = 0, losses = 0;
                    for (const stat of entry.stats || []) {
                        if (stat.name === 'playoffSeed') seed = Math.round(stat.value);
                        if (stat.name === 'wins')   wins   = Math.round(stat.value);
                        if (stat.name === 'losses') losses = Math.round(stat.value);
                    }
                    results.push({ team: { full_name: fullName }, seed, conference, wins, losses });
                }
            }
            console.log(`[nbaApi] ESPN standings loaded: ${results.length} teams`);
            return results;
        } catch (error) {
            console.warn('[nbaApi] ESPN standings fetch failed:', error.message);
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
 * Fetch Head-to-Head regular season matchups between two given teams
 */
export async function getHeadToHeadMatchups(team1Name, team2Name, season = CURRENT_SEASON) {
    if (!team1Name || !team2Name) return null;

    // Stable cache key regardless of arg order
    const sortedNames = [team1Name, team2Name].sort();
    const cacheKey = `h2h_${season}_${sortedNames[0]}_${sortedNames[1]}`.replace(/\s+/g, '');
    
    const H2H_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days caching since reg-season is over

    return getFromCacheOrFetch(cacheKey, H2H_TTL, async () => {
        try {
            const teams = await getTeams();
            const t1 = teams.find(t => t.full_name === team1Name || t.name === team1Name);
            const t2 = teams.find(t => t.full_name === team2Name || t.name === team2Name);

            if (!t1 || !t2) return null;

            const matches = await apiFetchAll('/games', {
                seasons: [season],
                "team_ids[]": [t1.id, t2.id],
                postseason: false
            });

            // Filter exactly games where THESE two played each other
            const h2hGames = matches.filter(g => 
                (g.home_team.id === t1.id && g.visitor_team.id === t2.id) ||
                (g.home_team.id === t2.id && g.visitor_team.id === t1.id)
            ).sort((a,b) => new Date(a.date) - new Date(b.date));

            let team1Wins = 0;
            let team2Wins = 0;

            const games = h2hGames.map(game => {
                const isT1Home = game.home_team.id === t1.id;
                const t1Score = isT1Home ? game.home_team_score : game.visitor_team_score;
                const t2Score = isT1Home ? game.visitor_team_score : game.home_team_score;
                
                if (t1Score > t2Score) team1Wins++;
                else if (t2Score > t1Score) team2Wins++;

                return {
                    date: game.date,
                    team1Score: t1Score,
                    team2Score: t2Score,
                    isTeam1Home: isT1Home,
                    status: game.status
                };
            });

            return {
                team1: team1Name,
                team2: team2Name,
                team1Wins,
                team2Wins,
                games,
                totalGames: games.length
            };
        } catch (error) {
            console.error("Failed to fetch head-to-head:", error);
            return null;
        }
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

    // Note: standings are NOT force-refreshed here.
    // They come from ESPN (free, no auth) via getStandings() with a 30-day TTL.
    // Playoff seeds are frozen for the season — no need to ever clear them.

    await forceRefreshCache(`games_postseason_${season}`, async () => {
        return apiFetchAll('/games', {
            seasons: [season],
            postseason: true,
        });
    });
}
