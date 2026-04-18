import { User } from "@/lib/db";

export async function getCurrentUser() {
    return User.me();
}

export async function listUsers() {
    return User.list();
}

export async function redirectToLogin() {
    return User.login();
}

export async function logoutUser() {
    return User.logout();
}
