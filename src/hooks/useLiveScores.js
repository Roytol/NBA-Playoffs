/**
 * Hook for polling live NBA game scores every 60 seconds.
 * Only polls when there are active/in-progress games.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getLiveGames } from '@/api/nbaApi';
import { updateLiveScores } from '@/api/nbaSync';

const POLL_INTERVAL = 60 * 1000; // 60 seconds

export function useLiveScores(activeSeries = []) {
    const [liveGames, setLiveGames] = useState([]);
    const [isPolling, setIsPolling] = useState(false);
    const [lastPolled, setLastPolled] = useState(null);
    const intervalRef = useRef(null);

    // Check if any game might be live right now
    const shouldPoll = useCallback(() => {
        if (!activeSeries || activeSeries.length === 0) return false;

        // Check if any series has an active status
        const hasActiveSeries = activeSeries.some(s => s.status === 'active');
        if (!hasActiveSeries) return false;

        // Check if any series has a current_game that's live
        const hasLiveGame = activeSeries.some(s => s.current_game?.is_live);
        if (hasLiveGame) return true;

        // Check if today's date matches any game date
        const today = new Date().toISOString().split('T')[0];
        const hasGameToday = activeSeries.some(s => {
            const gameDate = s.current_game?.date;
            return gameDate === today;
        });

        return hasGameToday;
    }, [activeSeries]);

    const pollOnce = useCallback(async () => {
        try {
            const games = await getLiveGames();
            setLiveGames(games || []);
            setLastPolled(new Date());

            // Update live scores in Supabase Series table
            const liveOnlyGames = (games || []).filter(g =>
                g.status && g.status !== 'Final' && g.status !== '' &&
                !g.status.includes('ET') && !g.status.includes('PM') && !g.status.includes('AM')
            );

            if (liveOnlyGames.length > 0) {
                await updateLiveScores(games);
            }

            return games;
        } catch (err) {
            console.error('[useLiveScores] Poll failed:', err);
            return [];
        }
    }, []);

    // Start/stop polling based on whether we should poll
    useEffect(() => {
        const active = shouldPoll();

        if (active && !intervalRef.current) {
            // Start polling
            setIsPolling(true);
            pollOnce(); // Immediate first poll

            intervalRef.current = setInterval(() => {
                pollOnce();
            }, POLL_INTERVAL);
        } else if (!active && intervalRef.current) {
            // Stop polling
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsPolling(false);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [shouldPoll, pollOnce]);

    return {
        liveGames,
        isPolling,
        lastPolled,
        pollOnce,
    };
}
