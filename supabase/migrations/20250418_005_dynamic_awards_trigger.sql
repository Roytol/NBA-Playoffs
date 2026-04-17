-- Migration 005: Dynamic Awards Trigger
-- Status: ✅ ALREADY APPLIED (2025-04-18)
-- Description: Updates the champion/MVP award trigger to also read point
--              values from the Settings table dynamically (instead of
--              hardcoded 5 and 3 points).

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
BEGIN
    IF NEW.setting_name = 'champion_mvp_winners' THEN
        winners_json := NEW.setting_value::json;
        champ_winner := winners_json->>'champion';
        mvp_winner   := winners_json->>'mvp';

        -- Dynamically load scoring rules
        SELECT setting_value INTO scoring_rules_raw
        FROM "Settings" WHERE setting_name = 'scoring_rules' LIMIT 1;

        scoring_rules := scoring_rules_raw::json;
        pts_champion  := COALESCE((scoring_rules->'champion'->>'winner')::INT, 5);
        pts_mvp       := COALESCE((scoring_rules->'finals_mvp'->>'winner')::INT, 3);

        -- Award Champion predictions (only score if not already scored)
        FOR pred IN SELECT * FROM "Prediction"
            WHERE prediction_type = 'champion' AND points_earned IS NULL
        LOOP
            IF pred.winner = champ_winner THEN
                UPDATE "Prediction" SET points_earned = pts_champion, is_correct = true WHERE id = pred.id;
                UPDATE "User" SET total_points = total_points + pts_champion WHERE email = pred.user_email;
            ELSE
                UPDATE "Prediction" SET points_earned = 0, is_correct = false WHERE id = pred.id;
            END IF;
        END LOOP;

        -- Award MVP predictions (only score if not already scored)
        FOR pred IN SELECT * FROM "Prediction"
            WHERE prediction_type = 'finals_mvp' AND points_earned IS NULL
        LOOP
            IF LOWER(pred.winner) = LOWER(mvp_winner) THEN
                UPDATE "Prediction" SET points_earned = pts_mvp, is_correct = true WHERE id = pred.id;
                UPDATE "User" SET total_points = total_points + pts_mvp WHERE email = pred.user_email;
            ELSE
                UPDATE "Prediction" SET points_earned = 0, is_correct = false WHERE id = pred.id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach to Settings table
DROP TRIGGER IF EXISTS trg_resolve_season_awards ON "Settings";
CREATE TRIGGER trg_resolve_season_awards
AFTER INSERT OR UPDATE ON "Settings"
FOR EACH ROW
WHEN (NEW.setting_name = 'champion_mvp_winners')
EXECUTE FUNCTION resolve_season_awards();
