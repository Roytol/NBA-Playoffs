# Database Migrations

Each file in this folder is a **single, named SQL migration** that runs exactly once.

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Already applied to the live DB |
| 🔴 | Not yet applied — needs to be run |

## Migration Log

| File | Description | Status |
|------|-------------|--------|
| `20250417_001_initial_schema.sql` | Leaderboard view + original scoring triggers | ✅ Applied |
| `20250418_002_season_columns.sql` | Adds `season` column to Series & Prediction | ✅ Applied |
| `20250418_003_settings_unique.sql` | UNIQUE constraint on `Settings.setting_name` | ✅ Applied |
| `20250418_004_dynamic_scoring_trigger.sql` | Scoring trigger reads points from Settings | ✅ Applied |
| `20250418_005_dynamic_awards_trigger.sql` | Awards trigger reads points from Settings | ✅ Applied |
| `20250418_006_seed_settings.sql` | Seeds `scoring_rules` and `active_season` | ✅ Applied |

## How to Apply a Migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **SQL Editor**
3. Paste the contents of the migration file
4. Click **Run**
5. Update the table above to ✅

## Rules for Writing New Migrations

- **Never edit an already-applied migration.** Create a new file instead.
- **File naming:** `YYYYMMDD_NNN_short_description.sql`
- **Always use `IF NOT EXISTS` / `CREATE OR REPLACE`** where possible so migrations are safe to retry.
- **One concern per file.** Don't combine unrelated changes.
