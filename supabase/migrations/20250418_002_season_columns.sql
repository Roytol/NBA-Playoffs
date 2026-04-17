-- Migration 002: Season Columns
-- Status: ✅ ALREADY APPLIED (2025-04-18)
-- Description: Adds a `season` column to Prediction and Series tables
--              so rows can be archived when transitioning to a new season.

ALTER TABLE "Series" ADD COLUMN IF NOT EXISTS season TEXT;
ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS season TEXT;
