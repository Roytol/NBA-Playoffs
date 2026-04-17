#!/usr/bin/env node
/**
 * migrate.js — Applies all pending Supabase migrations via psql
 * 
 * Setup (one-time):
 *   Add to your .env.local: SUPABASE_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
 *   (The connection string is already in your .env.local, just uncomment line 1)
 *
 * Run:
 *   npm run migrate
 */

import { execSync } from "child_process";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (dotenv not required)
const envPath = join(__dirname, ".env.local");
const env = {};
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const [key, ...rest] = trimmed.split("=");
    env[key.trim()] = rest.join("=").trim();
});

const DB_URL = env.SUPABASE_DB_URL;
if (!DB_URL) {
    console.error(`
❌  Missing SUPABASE_DB_URL in .env.local

    Add this line to your .env.local file:
    SUPABASE_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres

    Your connection string is already in .env.local (line 1) — just uncomment it
    and rename the variable to SUPABASE_DB_URL.
`);
    process.exit(1);
}

// Find psql
let psql;
try {
    psql = execSync("which psql 2>/dev/null || find /opt/homebrew -name psql 2>/dev/null | head -1", { encoding: "utf-8" }).trim();
} catch {}
if (!psql) {
    console.error("❌  psql not found. Run: brew install libpq && brew link libpq --force");
    process.exit(1);
}

const MIGRATIONS_DIR = join(__dirname, "supabase", "migrations");
const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();

console.log(`\n🗄️  NBA Playoffs — Database Migrations`);
console.log(`   psql: ${psql}`);
console.log(`   dir:  supabase/migrations/`);
console.log(`   files: ${files.length}\n`);

let ran = 0;
let skipped = 0;

for (const file of files) {
    const filePath = join(MIGRATIONS_DIR, file);
    const sql = readFileSync(filePath, "utf-8");

    if (sql.includes("ALREADY APPLIED")) {
        console.log(`⏭️  SKIP  ${file}`);
        skipped++;
        continue;
    }

    process.stdout.write(`▶️  RUN   ${file} ... `);
    try {
        execSync(`"${psql}" "${DB_URL}" -f "${filePath}"`, {
            stdio: ["pipe", "pipe", "pipe"],
            encoding: "utf-8",
        });
        console.log("✅");
        ran++;
    } catch (err) {
        console.log("❌ FAILED");
        console.error(`\n   ${err.stderr || err.message}\n`);
        process.exit(1);
    }
}

console.log(`\n✅  Done. Ran ${ran} migration(s), skipped ${skipped}.\n`);
