-- Migration 007: Fix resolve_season_awards trigger
-- Status: ✅ ALREADY APPLIED (2026-06-19)
-- Description: The original trigger filtered on `points_earned IS NULL`, but
--              the Prediction table defaults points_earned to 0 (not NULL).
--              This meant the trigger NEVER scored champion or MVP predictions.
--
--              Fix: Filter on `season IS NULL` (current-season rows) and make
--              the function fully idempotent by computing point deltas so it
--              can be safely re-run without double-counting.
--
--              MVP names are compared case-insensitively via LOWER() and also
--              TRIM()'d to guard against any trailing whitespace from the
--              dropdown values.

CREATE OR REPLACE FUNCTION resolve_season_awards()
RETURNS TRIGGER AS $$
DECLARE
    winners_json JSON;
    champ_winner TEXT;
    mvp_winner   TEXT;
    pred RECORD;
    scoring_rules_raw TEXT;
    scoring_rules JSON;
    pts_champion INT;
    pts_mvp INT;
    old_pts INT;
    new_pts INT;
    delta INT;
BEGIN
    IF NEW.setting_name = 'champion_mvp_winners' THEN
        winners_json := NEW.setting_value::json;
        champ_winner := TRIM(winners_json->>'champion');
        mvp_winner   := TRIM(winners_json->>'mvp');

        -- Dynamically load scoring rules
        SELECT setting_value INTO scoring_rules_raw
        FROM "Settings" WHERE setting_name = 'scoring_rules' LIMIT 1;

        scoring_rules := scoring_rules_raw::json;
        pts_champion  := COALESCE((scoring_rules->'champion'->>'winner')::INT, 5);
        pts_mvp       := COALESCE((scoring_rules->'finals_mvp'->>'winner')::INT, 3);

        -- =========================================================
        -- Award Champion predictions (current season only)
        -- =========================================================
        FOR pred IN SELECT * FROM "Prediction"
            WHERE prediction_type = 'champion' AND season IS NULL
        LOOP
            old_pts := COALESCE(pred.points_earned, 0);

            IF LOWER(TRIM(pred.winner)) = LOWER(champ_winner) THEN
                new_pts := pts_champion;
                UPDATE "Prediction" SET points_earned = new_pts, is_correct = true WHERE id = pred.id;
            ELSE
                new_pts := 0;
                UPDATE "Prediction" SET points_earned = 0, is_correct = false WHERE id = pred.id;
            END IF;

            delta := new_pts - old_pts;
            IF delta != 0 THEN
                UPDATE "User" SET total_points = total_points + delta WHERE email = pred.user_email;
            END IF;
        END LOOP;

        -- =========================================================
        -- Award MVP predictions (current season only)
        -- =========================================================
        FOR pred IN SELECT * FROM "Prediction"
            WHERE prediction_type = 'finals_mvp' AND season IS NULL
        LOOP
            old_pts := COALESCE(pred.points_earned, 0);

            IF LOWER(TRIM(pred.winner)) = LOWER(mvp_winner) THEN
                new_pts := pts_mvp;
                UPDATE "Prediction" SET points_earned = new_pts, is_correct = true WHERE id = pred.id;
            ELSE
                new_pts := 0;
                UPDATE "Prediction" SET points_earned = 0, is_correct = false WHERE id = pred.id;
            END IF;

            delta := new_pts - old_pts;
            IF delta != 0 THEN
                UPDATE "User" SET total_points = total_points + delta WHERE email = pred.user_email;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach to Settings table (replaces previous version)
DROP TRIGGER IF EXISTS trg_resolve_season_awards ON "Settings";
CREATE TRIGGER trg_resolve_season_awards
AFTER INSERT OR UPDATE ON "Settings"
FOR EACH ROW
WHEN (NEW.setting_name = 'champion_mvp_winners')
EXECUTE FUNCTION resolve_season_awards();

-- =========================================================
-- Re-fire the trigger by touching the existing winners row
-- so current predictions get scored immediately.
-- =========================================================
UPDATE "Settings"
SET setting_value = setting_value
WHERE setting_name = 'champion_mvp_winners';
