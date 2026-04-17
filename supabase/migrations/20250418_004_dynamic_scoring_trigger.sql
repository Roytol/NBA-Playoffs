-- Migration 004: Dynamic Scoring Trigger
-- Status: ✅ ALREADY APPLIED (2025-04-18)
-- Description: Replaces the hardcoded scoring trigger with a dynamic version
--              that reads point values from the Settings table at runtime.
--              This means scoring rules can be changed from the Admin UI
--              without ever touching SQL again.

CREATE OR REPLACE FUNCTION calculate_prediction_points()
RETURNS TRIGGER AS $$
DECLARE
    pred RECORD;
    pts_to_add INT;
    pts_winner INT;
    pts_games INT;
    scoring_rules_raw TEXT;
    scoring_rules JSON;
    round_rules JSON;
BEGIN
    -- Dynamically fetch scoring rules from Settings table
    SELECT setting_value INTO scoring_rules_raw
    FROM "Settings"
    WHERE setting_name = 'scoring_rules'
    LIMIT 1;

    -- Parse the JSON
    scoring_rules := scoring_rules_raw::json;

    -- Extract points for this specific round
    round_rules := scoring_rules -> NEW.round;

    IF round_rules IS NULL THEN
        -- Fallback to safe defaults if round not found in config
        pts_winner := 1;
        pts_games  := 0;
    ELSE
        pts_winner := COALESCE((round_rules->>'winner')::INT, 1);
        pts_games  := COALESCE((round_rules->>'games')::INT, 0);
    END IF;

    -- Loop through all predictions matching this completed series
    -- NOTE: matches on series_id (the human-readable ID), not the UUID primary key
    FOR pred IN SELECT * FROM "Prediction" WHERE series_id = NEW.series_id LOOP
        pts_to_add := 0;

        IF pred.winner = NEW.winner THEN
            pts_to_add := pts_to_add + pts_winner;
            IF pts_games > 0 AND pred.games::INT = NEW.games THEN
                pts_to_add := pts_to_add + pts_games;
            END IF;
        END IF;

        UPDATE "Prediction"
            SET points_earned = pts_to_add, is_correct = (pts_to_add > 0)
            WHERE id = pred.id;

        IF pts_to_add > 0 THEN
            UPDATE "User"
                SET total_points = total_points + pts_to_add
                WHERE email = pred.user_email;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach to Series table (replaces previous version)
DROP TRIGGER IF EXISTS trg_calculate_series_points ON "Series";
CREATE TRIGGER trg_calculate_series_points
AFTER UPDATE ON "Series"
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION calculate_prediction_points();
