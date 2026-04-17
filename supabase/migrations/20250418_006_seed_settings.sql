-- Migration 006: Seed Default Settings
-- Status: ✅ ALREADY APPLIED (2025-04-18)
-- Description: Seeds the initial scoring_rules and active_season rows into
--              the Settings table. Uses ON CONFLICT DO NOTHING so it's safe
--              to re-run — it will never overwrite values you've already set.

-- Default point values per round (editable from Admin > Scoring Rules tab)
INSERT INTO "Settings" (setting_name, setting_value, description)
VALUES (
    'scoring_rules',
    '{
        "play_in":           {"winner": 1, "games": 0},
        "first_round":       {"winner": 1, "games": 2},
        "second_round":      {"winner": 2, "games": 2},
        "conference_finals": {"winner": 3, "games": 3},
        "finals":            {"winner": 4, "games": 4},
        "champion":          {"winner": 5, "games": null},
        "finals_mvp":        {"winner": 3, "games": null}
    }',
    'JSON point values per round. Edit via Admin > Scoring Rules tab.'
)
ON CONFLICT (setting_name) DO NOTHING;

-- Active season year (shown in sidebar, used for archiving on season transition)
INSERT INTO "Settings" (setting_name, setting_value, description)
VALUES (
    'active_season',
    '2025',
    'The current active NBA season. Change via Admin > Season Transition tab.'
)
ON CONFLICT (setting_name) DO NOTHING;
