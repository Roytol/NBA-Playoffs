/**
 * Hook for syncing NBA playoff data from API on component mount.
 * Triggers a full sync of playoff games -> Series records.
 */

import { useState, useEffect, useRef } from 'react';
import { syncPlayoffSeries } from '@/api/nbaSync';

export function useNbaSync() {
    const [syncing, setSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState(null);
    const [error, setError] = useState(null);
    const [syncResult, setSyncResult] = useState(null);
    const hasSynced = useRef(false);

    const triggerSync = async () => {
        if (syncing) return;

        setSyncing(true);
        setError(null);

        try {
            const result = await syncPlayoffSeries();
            setSyncResult(result);
            setLastSynced(new Date());
            console.log('[useNbaSync] Sync complete:', result);
        } catch (err) {
            console.error('[useNbaSync] Sync failed:', err);
            setError(err.message || 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    // Auto-sync on mount (once)
    useEffect(() => {
        if (hasSynced.current) return;
        hasSynced.current = true;
        triggerSync();
    }, []);

    return {
        syncing,
        lastSynced,
        error,
        syncResult,
        triggerSync,
    };
}
