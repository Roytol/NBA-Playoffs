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
import { User, supabase } from '@/lib/db';

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
            const appUser = await User.me();
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

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                switch (event) {
                    case 'INITIAL_SESSION':
                        // Fires on mount from localStorage — almost instant.
                        if (session) {
                            await loadAppUser();
                        } else {
                            // No session → user is not logged in, stop loading.
                            setIsLoadingAuth(false);
                        }
                        break;

                    case 'SIGNED_IN':
                        // Fires after a successful login.
                        await loadAppUser();
                        break;

                    case 'SIGNED_OUT':
                        setUser(null);
                        setIsAuthenticated(false);
                        setIsLoadingAuth(false);
                        break;

                    // TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY:
                    // Supabase handles these silently. No UI change needed.
                    default:
                        break;
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [loadAppUser]);

    const logout = useCallback(async () => {
        await User.logout();
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
