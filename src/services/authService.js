import { supabase } from "@/lib/db";

export async function signInWithPassword(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword({ email, password, full_name }) {
    return supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name },
        },
    });
}

export async function getSession() {
    return supabase.auth.getSession();
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}
