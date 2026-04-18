import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Trophy, GitBranch } from "lucide-react";
import { motion } from "framer-motion";
import PlayoffBracket from "@/components/dashboard/PlayoffBracket";
import { useLiveScores } from "@/hooks/useLiveScores";
import { useNbaSync } from "@/hooks/useNbaSync";
import { listSeries } from "@/services";

export default function PlayoffTree() {
    const [series, setSeries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [loadRetries, setLoadRetries] = React.useState(0);

    const { syncing, lastSynced, error: syncError, triggerSync } = useNbaSync();

    useLiveScores(
        series,
        React.useCallback((updatedSeries) => {
            setSeries((prev) => prev.map((s) => (s.id === updatedSeries.id ? updatedSeries : s)));
        }, [])
    );

    React.useEffect(() => {
        if (lastSynced) {
            loadData(true);
        }
    }, [lastSynced]);

    React.useEffect(() => {
        loadData();
    }, [loadRetries]);

    const loadData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        setError(null);
        try {
            const seriesData = await listSeries().catch((e) => {
                console.error("Failed to load series:", e);
                setError("Failed to load playoff bracket. Please try again.");
                return [];
            });
            setSeries(seriesData);
        } catch (err) {
            console.error(err);
            setError("Failed to load playoff bracket. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => setLoadRetries((n) => n + 1);

    const hasLiveGame = React.useMemo(
        () => series.some((s) => s.current_game?.is_live),
        [series]
    );

    if (error && !series.length) {
        return (
            <div className="max-w-6xl mx-auto p-4 sm:p-6">
                <Alert variant="destructive" className="my-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between gap-2">
                        <span>{error}</span>
                        <Button size="sm" onClick={handleRetry}>
                            Try Again
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto min-w-0 w-full p-4 sm:p-6"
        >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center gap-2">
                        <GitBranch className="w-7 h-7 sm:w-8 sm:h-8 text-blue-700 shrink-0" />
                        Playoff tree
                    </h1>
                    <p className="text-gray-500 text-sm flex items-center gap-2 flex-wrap">
                        <Trophy className="w-4 h-4 text-brand-gold shrink-0" />
                        Live bracket and series scores
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {hasLiveGame && (
                        <div className="surface-status-danger flex items-center gap-1.5 px-2.5 py-1 rounded-full border">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="bg-status-danger-strong relative inline-flex rounded-full h-2 w-2" />
                            </span>
                            <span className="text-status-danger text-xs font-medium">LIVE</span>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={triggerSync}
                        disabled={syncing}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {(syncing || syncError) && (
                <div className="mb-4 space-y-2">
                    {syncing && (
                        <div className="surface-status-info text-status-info flex items-center gap-2 text-xs rounded-lg border px-3 py-2">
                            <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
                            Syncing playoff data from NBA…
                        </div>
                    )}
                    {syncError && (
                        <div className="text-xs text-amber-800 bg-amber-50 rounded-lg border border-amber-200 px-3 py-2">
                            Sync issue: {syncError} — showing saved data
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="rounded-lg border bg-white p-8 text-center text-gray-500 text-sm">
                    Loading bracket…
                </div>
            ) : series.length === 0 ? (
                <div className="rounded-lg border bg-white p-8 text-center text-gray-600 text-sm">
                    No playoff series yet. Use Refresh after games are scheduled, or check back soon.
                </div>
            ) : (
                <PlayoffBracket series={series} predictions={[]} showPredictions={false} />
            )}

            {error && series.length > 0 && (
                <p className="mt-3 text-xs text-amber-700">{error}</p>
            )}
        </motion.div>
    );
}
