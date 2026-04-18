import { Series } from "@/lib/db";

export async function listSeries() {
    return Series.list();
}

export async function updateSeries(id, payload) {
    return Series.update(id, payload);
}
