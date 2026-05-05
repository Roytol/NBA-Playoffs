/**
 * Hook for polling live NBA game scores every 60 seconds.
 * Only polls when there are active/in-progress games.
 *
 * @param {boolean} shouldPoll - Whether polling should be active (derived by caller)
 * @param {Function|null} onRealtimeUpdate - Callback for Supabase Realtime updates
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getLiveGames } from "@/api/nbaApi";
import { updateLiveScores } from "@/api/nbaSync";
import { supabase } from "@/lib/supabaseClient";
import { APP_DELAYS } from "@/constants/app";

const POLL_INTERVAL = APP_DELAYS.LIVE_POLL;

export function useLiveScores(shouldPoll = false, onRealtimeUpdate = null) {
  const [liveGames, setLiveGames] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPolled, setLastPolled] = useState(null);

  // Setup Supabase Realtime Subscription (debounced to prevent event flood)
  const pendingUpdatesRef = useRef(new Map());
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!onRealtimeUpdate) return;

    const channel = supabase
      .channel("series-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Series" },
        (payload) => {
          // Batch updates by series ID — only keep the latest version
          pendingUpdatesRef.current.set(payload.new.id, payload.new);

          // Debounce: flush all pending updates after 1 second of quiet
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            const updates = Array.from(pendingUpdatesRef.current.values());
            pendingUpdatesRef.current.clear();

            for (const updated of updates) {
              onRealtimeUpdate(updated);
            }
          }, 1000);
        },
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [onRealtimeUpdate]);

  const pollOnce = useCallback(async () => {
    try {
      const games = await getLiveGames();
      setLiveGames(games || []);
      setLastPolled(new Date());

      // Update live scores in Supabase Series table
      const liveOnlyGames = (games || []).filter(
        (g) =>
          g.status &&
          g.status !== "Final" &&
          g.status !== "" &&
          !g.status.includes("ET") &&
          !g.status.includes("PM") &&
          !g.status.includes("AM"),
      );

      if (liveOnlyGames.length > 0) {
        await updateLiveScores(games);
      }

      return games;
    } catch (err) {
      console.error("[useLiveScores] Poll failed:", err);
      return [];
    }
  }, []);

  // Start/stop polling based on the caller-provided boolean
  useEffect(() => {
    if (!shouldPoll) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    pollOnce(); // Immediate first poll

    const intervalId = setInterval(() => {
      pollOnce();
    }, POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [shouldPoll, pollOnce]);

  return {
    liveGames,
    isPolling,
    lastPolled,
    pollOnce,
  };
}
