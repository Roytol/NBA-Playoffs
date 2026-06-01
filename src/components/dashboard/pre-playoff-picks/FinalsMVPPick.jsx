import React from "react";
import { format } from "date-fns";
import { Star, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPlayersForTeams } from "@/api/nbaApi";
import { PREDICTION_TYPES, SETTINGS_KEYS } from "@/constants/app";
import {
  createPrediction,
  listPredictionsByFilters,
  listSeries,
  listSettings,
  updatePrediction,
} from "@/services";

export default function FinalsMVPPick({ onSave, user }) {
  const [pick, setPick] = React.useState("");
  const [existingPick, setExistingPick] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [deadline, setDeadline] = React.useState(null);
  const [startDate, setStartDate] = React.useState(null);
  const [isDeadlinePassed, setIsDeadlinePassed] = React.useState(false);
  const [isBeforeStart, setIsBeforeStart] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [players, setPlayers] = React.useState([]);
  const [playerPoolLoading, setPlayerPoolLoading] = React.useState(true);
  const [playerPoolError, setPlayerPoolError] = React.useState(null);

  React.useEffect(() => {
    loadDeadline();
    loadExistingPick();
    loadFinalsPlayerPool();
  }, [user]);

  const loadDeadline = async () => {
    try {
      const settings = await listSettings();
      const mvpDeadline = settings.find(
        (s) => s.setting_name === SETTINGS_KEYS.MVP_PREDICTION_DEADLINE,
      );
      const mvpStart = settings.find(
        (s) => s.setting_name === SETTINGS_KEYS.MVP_PREDICTION_START,
      );
      const now = new Date();

      if (mvpStart) {
        const start = new Date(mvpStart.setting_value);
        setStartDate(start);
        setIsBeforeStart(start > now);
      }

      if (mvpDeadline) {
        const end = new Date(mvpDeadline.setting_value);
        setDeadline(end);
        setIsDeadlinePassed(end < now);
      }
    } catch (loadError) {
      console.error("Error loading deadline:", loadError);
    }
  };

  const loadExistingPick = async () => {
    try {
      if (!user) return;

      const picks = await listPredictionsByFilters({
        user_email: user.email,
        prediction_type: PREDICTION_TYPES.FINALS_MVP,
      });

      if (picks.length > 0) {
        setExistingPick(picks[0]);
        setPick(picks[0].winner);
      }
    } catch (loadError) {
      console.error("Error loading existing pick:", loadError);
    } finally {
      setLoading(false);
    }
  };

  const loadFinalsPlayerPool = async () => {
    setPlayerPoolLoading(true);
    setPlayerPoolError(null);

    try {
      const series = await listSeries();
      const finalsSeries =
        series.find((s) => s.round === "finals" && s.status === "active") ||
        series.find((s) => s.round === "finals" && !s.season) ||
        series.find((s) => s.round === "finals");

      if (!finalsSeries?.team1 || !finalsSeries?.team2) {
        setPlayers([]);
        setPlayerPoolError("Finals teams are not available yet.");
        return;
      }

      const playerPool = await getPlayersForTeams([
        finalsSeries.team1,
        finalsSeries.team2,
      ]);

      setPlayers(playerPool);
      if (playerPool.length === 0) {
        setPlayerPoolError("No players found for the Finals teams yet.");
      }
    } catch (loadError) {
      console.error("Error loading Finals player pool:", loadError);
      setPlayers([]);
      setPlayerPoolError("Failed to load Finals players. Please try again.");
    } finally {
      setPlayerPoolLoading(false);
    }
  };

  const submitPick = async () => {
    if (!user || !pick) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (existingPick) {
        await updatePrediction(existingPick.id, { winner: pick });
      } else {
        await createPrediction({
          prediction_type: PREDICTION_TYPES.FINALS_MVP,
          winner: pick,
          points_earned: 0,
          is_correct: false,
          user_email: user.email,
        });
      }

      if (onSave) onSave();
      await loadExistingPick();
    } catch (submitError) {
      console.error("Error submitting MVP pick:", submitError);
      setError("Failed to save MVP pick. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const playerOptions = React.useMemo(() => {
    if (!pick || players.some((player) => player.full_name === pick)) {
      return players;
    }

    return [{ id: `selected-${pick}`, full_name: pick }, ...players];
  }, [pick, players]);

  if (!user || isBeforeStart || (isDeadlinePassed && !existingPick))
    return null;

  return (
    <Card className="surface-status-info mb-6 border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-400">
          <Star className="text-status-info w-6 h-6" />
          Finals MVP Prediction
          {deadline && (
            <div className="text-sm font-normal text-muted-foreground ml-auto flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {isDeadlinePassed
                ? "Deadline passed"
                : `Deadline: ${format(deadline, "MMM d, yyyy 'at' h:mm a")}`}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <span>{error}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setError(null)}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {existingPick && isDeadlinePassed ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Your Finals MVP Prediction (3 points):
            </div>
            <div className="font-medium">{existingPick.winner}</div>
            <div className="text-sm text-muted-foreground">
              This prediction is now locked.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {existingPick && (
              <div className="text-sm text-muted-foreground">
                Current pick:{" "}
                <span className="font-medium">{existingPick.winner}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="font-medium">Finals MVP (3 points)</label>
              <Select
                value={pick}
                onValueChange={setPick}
                disabled={
                  isDeadlinePassed ||
                  loading ||
                  playerPoolLoading ||
                  playerOptions.length === 0
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      playerPoolLoading
                        ? "Loading Finals players..."
                        : "Select Finals MVP"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {playerOptions.map((player) => (
                    <SelectItem key={player.id} value={player.full_name}>
                      {player.label ?? player.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {playerPoolError && (
                <p className="text-status-danger text-sm">{playerPoolError}</p>
              )}
            </div>

            {!isDeadlinePassed && (
              <Button
                className="w-full"
                onClick={submitPick}
                disabled={isSubmitting || !pick || loading || playerPoolLoading}
              >
                {isSubmitting
                  ? "Saving..."
                  : existingPick
                    ? "Update MVP Pick"
                    : "Submit MVP Pick"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
