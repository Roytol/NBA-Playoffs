import { Prediction } from "@/lib/db";

export async function listPredictions() {
    return Prediction.list();
}

export async function listPredictionsForUser(userEmail) {
    if (!userEmail) return [];
    return Prediction.filter({ user_email: userEmail });
}

export async function listPredictionsByFilters(filters) {
    return Prediction.filter(filters);
}

export async function createPrediction(payload) {
    return Prediction.create(payload);
}

export async function updatePrediction(id, payload) {
    return Prediction.update(id, payload);
}
