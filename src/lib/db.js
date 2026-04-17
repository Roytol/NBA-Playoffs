import { supabase } from './supabaseClient';

class BaseEntity {
    constructor(tableName) {
        this.tableName = tableName;
    }

    async list() {
        const { data, error } = await supabase.from(this.tableName).select('*');
        if (error) throw error;
        return data || [];
    }

    async get(id) {
        const pk = this.tableName === 'User' ? 'email' : 'id';
        const { data, error } = await supabase.from(this.tableName).select('*').eq(pk, id).maybeSingle();
        if (error) {
            console.error(`Failed to get ${this.tableName} id=${id}`, error);
            return null;
        }
        return data;
    }

    async filter(conditions) {
        let query = supabase.from(this.tableName).select('*');
        for (const [key, value] of Object.entries(conditions)) {
            query = query.eq(key, value);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async create(payload) {
        const { data, error } = await supabase.from(this.tableName).insert(payload).select();
        if (error) throw error;
        return data && data.length ? data[0] : null;
    }

    async update(id, payload) {
        const pk = this.tableName === 'User' ? 'email' : 'id';
        const { data, error } = await supabase.from(this.tableName).update(payload).eq(pk, id).select();
        if (error) throw error;
        return data && data.length ? data[0] : null;
    }

    async delete(id) {
        const pk = this.tableName === 'User' ? 'email' : 'id';
        const { error } = await supabase.from(this.tableName).delete().eq(pk, id);
        if (error) throw error;
        return true;
    }
}

export const Series = new BaseEntity('Series');
export const Prediction = new BaseEntity('Prediction');
export const Leaderboard = new BaseEntity('Leaderboard');
export const Settings = new BaseEntity('Settings');
export const ApiCache = new BaseEntity('api_cache');

class UserEntity extends BaseEntity {
    constructor() {
        super('User');
    }

    async me() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) throw new Error("Not logged in");
        
        const user = session.user;
        const email = user.email;

        // Ensure user exists in our custom User table as well
        let { data: userData } = await supabase.from('User').select('*').eq('email', email).maybeSingle();
        
        if (!userData) {
            // First time login, create them
            const newUserData = {
                email,
                full_name: user.user_metadata?.full_name || email,
                is_admin: false,
                total_points: 0
            };
            const { data: created } = await supabase.from('User').insert(newUserData).select();
            userData = created?.[0] || newUserData;
        }

        return userData;
    }

    async login() {
        window.location.href = '/login';
    }

    async logout() {
        await supabase.auth.signOut();
        window.location.reload();
    }
}

export const User = new UserEntity();

export { supabase };
