/**
 * AuthContext — Supabase best-practice auth implementation.
 *
 * Auth state is driven entirely by supabase.auth.onAuthStateChange().
 * The INITIAL_SESSION event fires on mount directly from the localStorage
 * token cache — no network call, no spinner for already-logged-in users.
 *
 * Separation of concerns:
 *   - Supabase session  → who the user IS (handled by onAuthStateChange)
 *   - App user record   → app-level data (is_admin, points) fetched ONCE after session confirmed
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getCurrentUser, getSession, logoutUser, onAuthStateChange } from '@/services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // isLoadingAuth starts true and becomes false after INITIAL_SESSION fires.
    // For logged-in users this happens almost instantly (localStorage read).
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    // Fetch the app-level User record (is_admin, total_points, etc.)
    // Called only when we have a confirmed Supabase session.
    const loadAppUser = useCallback(async () => {
        try {
            const appUser = await getCurrentUser();
            setUser(appUser);
            setIsAuthenticated(true);
        } catch (err) {
            console.error('[Auth] Failed to load app user:', err);
            // Session exists but no app record — treat as unauthenticated
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoadingAuth(false);
        }
    }, []);

    // Clean, robust initialization pattern
    useEffect(() => {
        let isMounted = true;

        // 1. Explicitly initialize session state on mount
        // This is the official reliable way in React, completely bypassing
        // the flaky INITIAL_SESSION event from onAuthStateChange.
        getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error('[Auth] Initial session error:', error);
                if (isMounted) setIsLoadingAuth(false);
                return;
            }

            if (session) {
                loadAppUser().finally(() => {
                    if (isMounted) setIsLoadingAuth(false);
                });
            } else {
                if (isMounted) setIsLoadingAuth(false);
            }
        });

        // 2. Listen ONLY for subsequent active changes
        const { data: { subscription } } = onAuthStateChange(
            (event, session) => {
                if (!isMounted) return;

                if (event === 'SIGNED_IN') {
                    setIsLoadingAuth(true);
                    loadAppUser().finally(() => {
                        if (isMounted) setIsLoadingAuth(false);
                    });
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setIsAuthenticated(false);
                    setIsLoadingAuth(false);
                }
                // We completely ignore 'INITIAL_SESSION' here because it's inherently 
                // subject to race conditions in React 18. Step 1 guarantees initialization.
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [loadAppUser]);

    const logout = useCallback(async () => {
        await logoutUser();
        // SIGNED_OUT event above handles state cleanup.
    }, []);

    const value = {
        user,
        isAuthenticated,
        isLoadingAuth,
        // Keep authChecked as an alias so existing consumers don't break.
        authChecked: !isLoadingAuth,
        logout,
        // Expose refresh for cases where app user data needs manual reload.
        refreshUser: loadAppUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
