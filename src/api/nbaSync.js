/**
 * NBA Playoff Sync Logic
 * 
 * Transforms BallDontLie API game data into Series records in Supabase.
 * Handles:
 * - Auto-detecting playoff matchups and creating Series rows
 * - Determining round (play_in, first_round, second_round, conference_finals, finals)
 * - Tracking series score (team1_wins, team2_wins)
 * - Auto-completing series when a team reaches 4 wins (or 1 for play-in)
 * - Setting prediction deadlines to Game 1 start time
 * - Updating live game data on Series rows
 */

import { supabase } from '@/lib/supabaseClient';
import { getPlayoffGames, getStandings, getTeams, CURRENT_SEASON } from './nbaApi';

/**
 * Main sync function — call this to sync all playoff data from API into Series table
 */
export async function syncPlayoffSeries(season = CURRENT_SEASON) {
    console.log(`[nbaSync] Starting playoff sync for season ${season}...`);

    // 1. Fetch all data we need
    const [playoffGames, standings] = await Promise.all([
        getPlayoffGames(season),
        getStandings(season),
    ]);

    if (!playoffGames || playoffGames.length === 0) {
        console.log('[nbaSync] No playoff games found yet.');
        return { synced: 0, created: 0, updated: 0 };
    }

    console.log(`[nbaSync] Found ${playoffGames.length} playoff games`);

    // 2. Build lookup maps
    const seedMap = buildSeedMap(standings);

    // 3. Group games by matchup
    const matchups = groupGamesByMatchup(playoffGames);
    console.log(`[nbaSync] Found ${matchups.size} unique matchups`);

    // 4. Get existing Series from Supabase
    const { data: existingSeries } = await supabase
        .from('Series')
        .select('*');
    
    const existingByKey = new Map();
    (existingSeries || []).forEach(s => {
        if (s.api_matchup_key) {
            existingByKey.set(s.api_matchup_key, s);
        }
    });

    // 5. Process each matchup
    let created = 0;
    let updated = 0;

    for (const [matchupKey, games] of matchups) {
        const result = await processMatchup(
            matchupKey,
            games,
            seedMap,
            existingByKey,
            existingSeries || []
        );
        if (result === 'created') created++;
        else if (result === 'updated') updated++;
    }

    console.log(`[nbaSync] Sync complete. Created: ${created}, Updated: ${updated}`);
    return { synced: matchups.size, created, updated };
}

/**
 * Build a map of team ID -> team data
 */
function buildTeamMap(teams) {
    const map = new Map();
    teams.forEach(t => map.set(t.id, t));
    return map;
}

/**
 * Build a map of team full_name -> seed info
 */
function buildSeedMap(standings) {
    const map = new Map();
    if (!standings || standings.length === 0) return map;

    standings.forEach(s => {
        const teamName = s.team?.full_name;
        if (teamName) {
            map.set(teamName, {
                seed: s.seed || s.conference_rank || 0,
                conference: s.conference || s.team?.conference || '',
                wins: s.wins || 0,
                losses: s.losses || 0,
            });
        }
    });
    return map;
}

/**
 * Create a consistent matchup key from two team names (alphabetical order)
 */
function makeMatchupKey(team1Name, team2Name) {
    return [team1Name, team2Name].sort().join(' vs ');
}

/**
 * Group playoff games by the unique matchup pair
 */
function groupGamesByMatchup(games) {
    const matchups = new Map();

    for (const game of games) {
        const homeName = game.home_team?.full_name;
        const visitorName = game.visitor_team?.full_name;
        if (!homeName || !visitorName) continue;

        const key = makeMatchupKey(homeName, visitorName);

        if (!matchups.has(key)) {
            matchups.set(key, []);
        }
        matchups.get(key).push(game);
    }

    // Sort games within each matchup by date
    for (const [key, games] of matchups) {
        games.sort((a, b) => new Date(a.datetime || a.date) - new Date(b.datetime || b.date));
    }

    return matchups;
}

/**
 * Process a single matchup — create or update the corresponding Series record
 */
async function processMatchup(matchupKey, games, seedMap, existingByKey, allExistingSeries) {
    // Determine the two teams (use first game)
    const firstGame = games[0];
    const team1Name = firstGame.home_team.full_name;
    const team2Name = firstGame.visitor_team.full_name;

    // Get seed info
    const team1Seed = seedMap.get(team1Name)?.seed || 0;
    const team2Seed = seedMap.get(team2Name)?.seed || 0;
    const team1Conf = seedMap.get(team1Name)?.conference || firstGame.home_team.conference || '';
    const team2Conf = seedMap.get(team2Name)?.conference || firstGame.visitor_team.conference || '';

    // Determine conference
    let conference;
    if (team1Conf === team2Conf) {
        conference = team1Conf;
    } else {
        conference = 'Finals';
    }

    // Determine round
    const round = detectRound(team1Name, team2Name, team1Seed, team2Seed, team1Conf, team2Conf, allExistingSeries);

    // Calculate series score
    const { team1Wins, team2Wins } = calculateSeriesScore(games, team1Name, team2Name);

    // Determine series status and winner
    const winsNeeded = round === 'play_in' ? 1 : 4;
    let status = 'active';
    let winner = null;
    let totalGames = null;

    if (team1Wins >= winsNeeded) {
        status = 'completed';
        winner = team1Name;
        totalGames = team1Wins + team2Wins;
    } else if (team2Wins >= winsNeeded) {
        status = 'completed';
        winner = team2Name;
        totalGames = team1Wins + team2Wins;
    }

    // Get prediction deadline (Game 1 start time)
    const game1DateTime = firstGame.datetime || firstGame.date;
    const predictionDeadline = game1DateTime
        ? new Date(game1DateTime).toISOString()
        : new Date().toISOString();

    // Find current/next game for live data
    const currentGame = findCurrentGame(games);

    // Order teams by seed (lower seed = team1 = higher seeded)
    let orderedTeam1, orderedTeam2, orderedSeed1, orderedSeed2, orderedWins1, orderedWins2;
    if (team1Seed > 0 && team2Seed > 0 && team1Seed <= team2Seed) {
        orderedTeam1 = team1Name;
        orderedTeam2 = team2Name;
        orderedSeed1 = team1Seed;
        orderedSeed2 = team2Seed;
        orderedWins1 = team1Wins;
        orderedWins2 = team2Wins;
    } else if (team1Seed > 0 && team2Seed > 0) {
        orderedTeam1 = team2Name;
        orderedTeam2 = team1Name;
        orderedSeed1 = team2Seed;
        orderedSeed2 = team1Seed;
        orderedWins1 = team2Wins;
        orderedWins2 = team1Wins;
    } else {
        orderedTeam1 = team1Name;
        orderedTeam2 = team2Name;
        orderedSeed1 = team1Seed;
        orderedSeed2 = team2Seed;
        orderedWins1 = team1Wins;
        orderedWins2 = team2Wins;
    }

    // Build the Series data object
    const seriesData = {
        team1: orderedTeam1,
        team2: orderedTeam2,
        team1_seed: orderedSeed1,
        team2_seed: orderedSeed2,
        team1_wins: orderedWins1,
        team2_wins: orderedWins2,
        round,
        conference,
        status,
        winner,
        games: totalGames,
        prediction_deadline: predictionDeadline,
        current_game: currentGame,
        api_matchup_key: matchupKey,
    };

    // Check if this series already exists
    const existing = existingByKey.get(matchupKey);

    if (existing) {
        // Update existing series (don't override prediction_deadline if admin set it manually)
        const updateData = { ...seriesData };
        
        // Keep the original prediction_deadline if the series was manually created
        // or if the deadline has already been customized
        if (existing.prediction_deadline && !existing.api_matchup_key) {
            delete updateData.prediction_deadline;
        }

        // Don't override winner/games if it was already set (admin override)
        if (existing.status === 'completed' && existing.winner) {
            updateData.status = existing.status;
            updateData.winner = existing.winner;
            updateData.games = existing.games;
        }

        // Check if anything actually changed before doing a DB write
        let hasChanges = false;
        for (const key of Object.keys(updateData)) {
            if (JSON.stringify(existing[key]) !== JSON.stringify(updateData[key])) {
                hasChanges = true;
                break;
            }
        }

        if (!hasChanges) {
            return 'skipped';
        }

        const { error } = await supabase
            .from('Series')
            .update(updateData)
            .eq('id', existing.id);

        if (error) {
            console.error(`[nbaSync] Error updating series ${matchupKey}:`, error);
            return null;
        }
        return 'updated';
    } else {
        // Create new series
        const seriesId = `API_${round}_${Date.now()}`;
        const { error } = await supabase
            .from('Series')
            .insert({
                ...seriesData,
                series_id: seriesId,
            });

        if (error) {
            console.error(`[nbaSync] Error creating series ${matchupKey}:`, error);
            return null;
        }
        return 'created';
    }
}

/**
 * Calculate series score from individual game results
 */
function calculateSeriesScore(games, team1Name, team2Name) {
    let team1Wins = 0;
    let team2Wins = 0;

    for (const game of games) {
        // Only count completed games
        if (game.status !== 'Final') continue;

        const homeTeam = game.home_team.full_name;
        const homeScore = game.home_team_score || 0;
        const visitorScore = game.visitor_team_score || 0;

        if (homeScore > visitorScore) {
            // Home team won
            if (homeTeam === team1Name) team1Wins++;
            else team2Wins++;
        } else if (visitorScore > homeScore) {
            // Visitor won
            if (homeTeam === team1Name) team2Wins++;
            else team1Wins++;
        }
    }

    return { team1Wins, team2Wins };
}

/**
 * Find the current or next game in a series for live score display
 */
function findCurrentGame(games) {
    // First, look for a live game
    const liveGame = games.find(g => {
        const isISO = g.status && (g.status.includes('T') || g.status.includes('Z'));
        return g.status && g.status !== 'Final' && g.status !== '' && !isISO && g.period > 0;
    });

    if (liveGame) {
        return formatGameData(liveGame, games);
    }

    // Next, find the next upcoming game
    const now = new Date();
    const nextGame = games.find(g => {
        const gameDate = new Date(g.datetime || g.date);
        return gameDate > now && g.status !== 'Final';
    });

    if (nextGame) {
        return formatGameData(nextGame, games);
    }

    // If all games are finished, return the last game
    const lastGame = [...games].reverse().find(g => g.status === 'Final');
    if (lastGame) {
        return formatGameData(lastGame, games);
    }

    return null;
}

/**
 * Format a game object for storing in the current_game JSONB column
 */
function formatGameData(game, allGames) {
    // Determine game number in the series
    const completedGames = allGames.filter(g => g.status === 'Final');
    const isISO = game.status && (game.status.includes('T') || game.status.includes('Z'));
    const isLive = game.status && game.status !== 'Final' && game.status !== '' && 
        !isISO && game.period > 0;
    const gameNumber = isLive
        ? completedGames.length + 1
        : completedGames.indexOf(game) + 1 || allGames.indexOf(game) + 1;

    return {
        game_id: game.id,
        game_number: gameNumber,
        date: game.date,
        datetime: game.datetime,
        status: game.status,
        period: game.period,
        time: game.time,
        home_team: game.home_team?.full_name,
        visitor_team: game.visitor_team?.full_name,
        home_team_score: game.home_team_score,
        visitor_team_score: game.visitor_team_score,
        is_live: isLive,
    };
}

/**
 * Detect which playoff round a matchup belongs to
 */
function detectRound(team1Name, team2Name, team1Seed, team2Seed, team1Conf, team2Conf, existingSeries) {
    // Cross-conference = Finals
    if (team1Conf && team2Conf && team1Conf !== team2Conf) {
        return 'finals';
    }

    // Both seeds 7-10 in same conference = Play-In
    if (team1Seed >= 7 && team2Seed >= 7 && team1Seed <= 10 && team2Seed <= 10) {
        return 'play_in';
    }

    // Standard first-round bracket pairings
    const firstRoundPairs = [[1, 8], [2, 7], [3, 6], [4, 5]];
    const seedPair = [Math.min(team1Seed, team2Seed), Math.max(team1Seed, team2Seed)];
    const isFirstRound = firstRoundPairs.some(
        p => p[0] === seedPair[0] && p[1] === seedPair[1]
    );
    if (isFirstRound) return 'first_round';

    // Check if both teams are winners of completed first-round series
    const completedFirstRound = (existingSeries || []).filter(
        s => s.round === 'first_round' && s.status === 'completed' && s.winner
    );
    const firstRoundWinners = completedFirstRound.map(s => s.winner);

    const team1WonFirstRound = firstRoundWinners.includes(team1Name);
    const team2WonFirstRound = firstRoundWinners.includes(team2Name);

    if (team1WonFirstRound && team2WonFirstRound) {
        // Both won first round — check if second round is done
        const completedSecondRound = (existingSeries || []).filter(
            s => s.round === 'second_round' && s.status === 'completed' && s.winner
        );
        const secondRoundWinners = completedSecondRound.map(s => s.winner);

        const team1WonSecondRound = secondRoundWinners.includes(team1Name);
        const team2WonSecondRound = secondRoundWinners.includes(team2Name);

        if (team1WonSecondRound && team2WonSecondRound) {
            return 'conference_finals';
        }

        return 'second_round';
    }

    // Default to first_round if we can't determine
    // This handles edge cases like reseeded brackets
    return 'first_round';
}

/**
 * Update live game data for active series
 * Called by useLiveScores hook every 60 seconds
 */
export async function updateLiveScores(liveGames) {
    if (!liveGames || liveGames.length === 0) return;

    // Get all active series
    const { data: activeSeries } = await supabase
        .from('Series')
        .select('*')
        .in('status', ['active', 'upcoming']);

    if (!activeSeries || activeSeries.length === 0) return;

    for (const series of activeSeries) {
        // Find live game matching this series
        const matchingGame = liveGames.find(g => {
            const homeName = g.home_team?.full_name;
            const visitorName = g.visitor_team?.full_name;
            return (
                (homeName === series.team1 && visitorName === series.team2) ||
                (homeName === series.team2 && visitorName === series.team1)
            );
        });

        if (matchingGame) {
            const isISO = matchingGame.status && (matchingGame.status.includes('T') || matchingGame.status.includes('Z'));
            const isLive = matchingGame.status && matchingGame.status !== 'Final' &&
                !isISO && matchingGame.period > 0;

            const currentGameData = {
                game_id: matchingGame.id,
                date: matchingGame.date,
                datetime: matchingGame.datetime,
                status: matchingGame.status,
                period: matchingGame.period,
                time: matchingGame.time,
                home_team: matchingGame.home_team?.full_name,
                visitor_team: matchingGame.visitor_team?.full_name,
                home_team_score: matchingGame.home_team_score,
                visitor_team_score: matchingGame.visitor_team_score,
                is_live: isLive,
            };

            // Only update DB if the data actually changed
            if (JSON.stringify(series.current_game) !== JSON.stringify(currentGameData)) {
                await supabase
                    .from('Series')
                    .update({ current_game: currentGameData })
                    .eq('id', series.id);
            }
        }
    }
}
