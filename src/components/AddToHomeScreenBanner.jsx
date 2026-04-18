import React, { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    APP_DELAYS,
    HOME_SCREEN_BANNER_DISMISS_DAYS,
    STORAGE_KEYS,
    TIME_MS,
} from '@/constants/app';

/**
 * iOS-only "Add to Home Screen" nudge banner.
 *
 * Shows a bottom sheet on iOS Safari when:
 *  1. User agent is iOS (iPhone/iPad/iPod)
 *  2. App is NOT already running in standalone (home screen) mode
 *  3. User hasn't dismissed it in the configured cooldown window
 *
 * Android/Chrome gets the native install prompt instead — no banner needed.
 */

function isIosSafari() {
    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua);
    // Exclude Chrome/Firefox on iOS (they use different engine)
    const isSafari = /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua);
    return isIos && isSafari;
}

function isStandalone() {
    return window.navigator.standalone === true;
}

function wasDismissedRecently() {
    const ts = localStorage.getItem(STORAGE_KEYS.HOME_SCREEN_BANNER_DISMISSED);
    if (!ts) return false;
    const age = Date.now() - Number(ts);
    return age < HOME_SCREEN_BANNER_DISMISS_DAYS * TIME_MS.DAY;
}

export default function AddToHomeScreenBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Small delay so it doesn't pop immediately on load
        const timer = setTimeout(() => {
            if (isIosSafari() && !isStandalone() && !wasDismissedRecently()) {
                setVisible(true);
            }
        }, APP_DELAYS.HOME_SCREEN_BANNER_SHOW);
        return () => clearTimeout(timer);
    }, []);

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEYS.HOME_SCREEN_BANNER_DISMISSED, String(Date.now()));
        setVisible(false);
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="hs-banner"
                    initial={{ y: 120, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 120, opacity: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                    className="fixed bottom-4 left-3 right-3 z-50"
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3">
                        {/* App icon */}
                        <img
                            src="/icon.png"
                            alt="NBA Playoffs"
                            className="w-14 h-14 rounded-xl shadow flex-shrink-0"
                        />

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm leading-tight">
                                Add NBA Playoffs to Home Screen
                            </p>
                            <p className="text-xs text-gray-500 mt-1 leading-snug">
                                Tap{' '}
                                <span className="text-status-info inline-flex items-center gap-0.5 font-medium">
                                    <Share className="w-3 h-3" />
                                    {' '}Share
                                </span>
                                {' '}then{' '}
                                <span className="font-medium text-gray-700">
                                    "Add to Home Screen"
                                </span>{' '}
                                for the best experience.
                            </p>
                        </div>

                        {/* Dismiss */}
                        <button
                            onClick={dismiss}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Arrow pointing down toward the share button */}
                    <div className="flex justify-center mt-1">
                        <div className="w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45 shadow-sm" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
