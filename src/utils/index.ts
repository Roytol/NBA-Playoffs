import { getPageRoute } from "@/routes/paths";

export function createPageUrl(pageName: string) {
    return getPageRoute(pageName);
}

function normalizeLiveClock(time?: string) {
    return time?.trim().replace(/^(Q\d+|\dQ|\dOT|OT)\s+/i, '').trim();
}

function getLivePeriodLabel(period?: number) {
    if (!period) return null;

    if (period <= 4) {
        return `${period}Q`;
    }

    if (period === 5) {
        return 'OT';
    }

    return `${period - 4}OT`;
}

export function formatLiveGameDetail(game: { time?: string; period?: number }) {
    const timeLabel = normalizeLiveClock(game.time);

    if (timeLabel && /halftime/i.test(timeLabel)) {
        return timeLabel;
    }

    const periodLabel = getLivePeriodLabel(game.period);
    if (!periodLabel) {
        return timeLabel || 'LIVE';
    }

    if (!timeLabel || /live/i.test(timeLabel)) {
        return periodLabel;
    }

    return `${periodLabel} · ${timeLabel}`;
}

export function formatCurrentGameStatus(game: {
    game_number?: number;
    status?: string;
    time?: string;
    period?: number;
}) {
    const detailLabel = formatLiveGameDetail(game);

    if (detailLabel === 'LIVE' && game.status) {
        return `Game ${game.game_number} · ${game.status}`;
    }

    return `Game ${game.game_number} · ${detailLabel}`;
}
