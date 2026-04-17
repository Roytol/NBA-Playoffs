-- Advanced Architecture Options (Phases 2-4)
-- Paste this entire script into the Supabase SQL Editor and click "Run".

-------------------------------------------------------------------------------
-- 1. DROP OBSOLETE LEADERBOARD TABLE
-------------------------------------------------------------------------------
-- Safely drop the manual Leaderboard table to replace it with a dynamic View.
DROP TABLE IF EXISTS "Leaderboard" CASCADE;

-------------------------------------------------------------------------------
-- 2. CREATE DYNAMIC LEADERBOARD VIEW
-------------------------------------------------------------------------------
-- The new Leaderboard is entirely virtual and completely auto-syncs with the User table
CREATE OR REPLACE VIEW "Leaderboard" AS 
SELECT 
    email AS player_id, 
    full_name AS player_name, 
    total_points, 
    NOW() AS last_updated 
FROM "User" 
ORDER BY total_points DESC;

-------------------------------------------------------------------------------
-- 3. SERIES POINTS AUTOMATION TRIGGER
-------------------------------------------------------------------------------
-- Calculates points behind the scenes securely when a series is marked 'completed'
CREATE OR REPLACE FUNCTION calculate_prediction_points() 
RETURNS TRIGGER AS $$
DECLARE
    pred RECORD;
    pts_to_add INT;
    pts_winner INT;
    pts_games INT;
BEGIN
    -- Determine base points by round based on official rules
    IF NEW.round = 'play_in' THEN pts_winner := 1; pts_games := 0;
    ELSIF NEW.round = 'first_round' THEN pts_winner := 1; pts_games := 2;
    ELSIF NEW.round = 'second_round' THEN pts_winner := 2; pts_games := 2;
    ELSIF NEW.round = 'conference_finals' THEN pts_winner := 3; pts_games := 3;
    ELSIF NEW.round = 'finals' THEN pts_winner := 4; pts_games := 4;
    ELSE pts_winner := 1; pts_games := 0;
    END IF;

    -- Loop through all predictions matching this completed series
    FOR pred IN SELECT * FROM "Prediction" WHERE series_id = NEW.id::text LOOP
        pts_to_add := 0;
        
        -- Did they guess the winner correctly?
        IF pred.predicted_winner = NEW.winner THEN
            pts_to_add := pts_to_add + pts_winner;
            -- Did they guess the exact games?
            IF pred.predicted_games = NEW.games THEN
                pts_to_add := pts_to_add + pts_games;
            END IF;
        END IF;

        IF pts_to_add > 0 THEN
            -- Update the prediction securely
            UPDATE "Prediction" SET points_earned = pts_to_add WHERE id = pred.id;
            
            -- Add points directly and natively to User total!
            UPDATE "User" SET total_points = total_points + pts_to_add WHERE email = pred.user_email;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the execution trigger to Series table
DROP TRIGGER IF EXISTS trg_calculate_series_points ON "Series";
CREATE TRIGGER trg_calculate_series_points
AFTER UPDATE ON "Series"
FOR EACH ROW 
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION calculate_prediction_points();


-------------------------------------------------------------------------------
-- 4. AWARD RESOLUTION AUTOMATION TRIGGER
-------------------------------------------------------------------------------
-- Instantly awards the massive 5 and 3 point bonuses when Admin finalizes the season
CREATE OR REPLACE FUNCTION resolve_season_awards() 
RETURNS TRIGGER AS $$
DECLARE
    winners_json JSON;
    champ_winner TEXT;
    mvp_winner TEXT;
    pred RECORD;
BEGIN
    IF NEW.setting_name = 'champion_mvp_winners' THEN
        winners_json := NEW.setting_value::json;
        champ_winner := winners_json->>'champion';
        mvp_winner := winners_json->>'mvp';
        
        -- Award Champion predictions
        FOR pred IN SELECT * FROM "Prediction" WHERE prediction_type = 'champion' AND points_earned IS NULL LOOP
            IF pred.predicted_winner = champ_winner THEN
                UPDATE "Prediction" SET points_earned = 5 WHERE id = pred.id;
                UPDATE "User" SET total_points = total_points + 5 WHERE email = pred.user_email;
            ELSE
                UPDATE "Prediction" SET points_earned = 0 WHERE id = pred.id;
            END IF;
        END LOOP;
        
        -- Award MVP predictions
        FOR pred IN SELECT * FROM "Prediction" WHERE prediction_type = 'finals_mvp' AND points_earned IS NULL LOOP
            IF pred.predicted_winner = mvp_winner THEN
                UPDATE "Prediction" SET points_earned = 3 WHERE id = pred.id;
                UPDATE "User" SET total_points = total_points + 3 WHERE email = pred.user_email;
            ELSE
                UPDATE "Prediction" SET points_earned = 0 WHERE id = pred.id;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the execution trigger to Settings table
DROP TRIGGER IF EXISTS trg_resolve_season_awards ON "Settings";
CREATE TRIGGER trg_resolve_season_awards
AFTER INSERT OR UPDATE ON "Settings"
FOR EACH ROW 
WHEN (NEW.setting_name = 'champion_mvp_winners')
EXECUTE FUNCTION resolve_season_awards();
