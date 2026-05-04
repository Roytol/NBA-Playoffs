function sortPredictionsNewestFirst(predictions) {
  return [...predictions].sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at || 0) -
      new Date(a.updated_at || a.created_at || 0),
  );
}

function isSeriesPredictionEligible(series) {
  return !!series && series.games != null && series.games !== 0;
}

function isExactSeriesPick(prediction, series) {
  return (
    !!series &&
    prediction.winner === series.winner &&
    Number(prediction.games) === Number(series.games)
  );
}

function buildCompletedSeriesMap(seriesList = []) {
  return new Map(
    seriesList
      .filter((series) => series.status === "completed")
      .map((series) => [series.series_id || series.id, series]),
  );
}

export function buildLeaderboardStreaks(
  predictions = [],
  seriesList = [],
  thresholds = {},
) {
  const { hot = 2, cold = 2 } = thresholds;
  const completedSeriesById = buildCompletedSeriesMap(seriesList);
  const predictionsByUser = {};

  for (const prediction of predictions) {
    const completedSeries = completedSeriesById.get(prediction.series_id);
    if (!isSeriesPredictionEligible(completedSeries)) continue;

    if (!predictionsByUser[prediction.user_email]) {
      predictionsByUser[prediction.user_email] = [];
    }
    predictionsByUser[prediction.user_email].push(prediction);
  }

  const streaksByUser = {};

  for (const [email, userPredictions] of Object.entries(predictionsByUser)) {
    const sortedPredictions = sortPredictionsNewestFirst(userPredictions);

    let hotStreak = 0;
    for (const prediction of sortedPredictions) {
      const completedSeries = completedSeriesById.get(prediction.series_id);
      if (!isExactSeriesPick(prediction, completedSeries)) break;
      hotStreak++;
    }

    let coldStreak = 0;
    for (const prediction of sortedPredictions) {
      if ((prediction.points_earned || 0) > 0) break;
      coldStreak++;
    }

    if (hotStreak >= hot || coldStreak >= cold) {
      streaksByUser[email] = {
        hot: hotStreak,
        cold: coldStreak,
      };
    }
  }

  return streaksByUser;
}
