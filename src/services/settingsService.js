import { Settings, supabase } from "@/lib/db";

export async function listSettings() {
    return Settings.list();
}

export async function getSettingValue(settingName) {
    const settings = await Settings.filter({ setting_name: settingName });
    return settings[0]?.setting_value;
}

export async function upsertSetting(setting_name, setting_value) {
    const { error } = await supabase
        .from("Settings")
        .upsert({ setting_name, setting_value }, { onConflict: "setting_name" });

    if (error) throw error;
    return { setting_name, setting_value };
}
