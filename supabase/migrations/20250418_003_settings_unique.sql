-- Migration 003: Unique Constraint on Settings
-- Status: ✅ ALREADY APPLIED (2025-04-18)
-- Description: Adds a UNIQUE constraint on Settings.setting_name so
--              the app can safely upsert settings without creating duplicates.

ALTER TABLE "Settings" DROP CONSTRAINT IF EXISTS settings_setting_name_key;
ALTER TABLE "Settings" ADD CONSTRAINT settings_setting_name_key UNIQUE (setting_name);
