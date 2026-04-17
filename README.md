# 🏀 NBA Playoffs Prediction Game

A full-stack prediction game for the NBA Playoffs. Players predict series winners, game counts, the champion, and the Finals MVP — earning points based on accuracy. Built with React + Vite, backed by Supabase.

---

## Features

### For Players
- **Predict every series** — pick the winner and exact game count before each series deadline
- **Pre-playoff bonus picks** — predict the NBA Champion and Finals MVP before the playoffs begin
- **Live Dashboard** — see live scores and series progress in real time (Supabase Realtime)
- **Leaderboard** — ranked standings updated automatically via Postgres view
- **All Predictions** — view everyone's picks for series whose deadline has passed
- **Past Seasons** — leaderboard tabs for archived seasons

### For Admins
- **Series management** — add series, set deadlines, declare winners (auto-scores via Postgres trigger)
- **Scoring Rules** — edit point values per round from the UI, no SQL needed
- **Season Awards** — declare Champion & Finals MVP and trigger instant scoring
- **Season Transition** — archive current season, reset all player points, prepare for next year
- **Player Roster** — view all users, toggle admin role, delete accounts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 (native nested routes) |
| UI Components | shadcn/ui + Tailwind CSS |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password) |
| Realtime | Supabase Realtime WebSockets |
| Scoring | Postgres Triggers (server-side, tamper-proof) |
| Deployment | Vercel |

---

## Architecture

- **Serverless-first** — all business logic lives in Postgres triggers, not the client
- **Dynamic scoring** — point values per round are stored in the `Settings` table and read by triggers at runtime. Changing rules requires no SQL, only the Admin UI
- **Season archiving** — `Prediction` and `Series` rows are stamped with a `season` column on transition, preserving historical data for past-season leaderboards
- **Auth hardening** — `AuthContext` uses `useRef` to prevent stale closures that caused black-screen spinners during background token refreshes
- **Route guards** — declarative `<ProtectedRoute>` component using React Router `<Navigate>` for auth and admin gating

---

## Local Development

### Prerequisites
- Node.js 18+
- A Supabase project
- `libpq` (for running DB migrations): `brew install libpq`

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd "NBA Playoffs"
npm install

# 2. Create .env.local
cp .env.local.example .env.local
# Fill in your values (see Environment Variables below)

# 3. Run DB migrations
npm run migrate

# 4. Start dev server
npm run dev
```

### Environment Variables

Add these to your `.env.local`:

```bash
# Supabase project URL (from Supabase Dashboard > Settings > API)
VITE_SUPABASE_URL=https://<ref>.supabase.co

# Supabase anon key
VITE_SUPABASE_ANON_KEY=eyJ...

# BallDontLie API key (for live NBA scores)
VITE_BALLDONTLIE_API_KEY=your_key_here

# Direct Postgres connection string (for npm run migrate — use pooler URL)
SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

---

## Database Migrations

Migrations live in `supabase/migrations/`. Each file runs exactly once.

```bash
npm run migrate     # Apply all pending migrations
```

The runner auto-skips files marked `ALREADY APPLIED`. See [`supabase/migrations/README.md`](supabase/migrations/README.md) for the full migration log.

**When adding a new migration:**
1. Create a new file: `supabase/migrations/YYYYMMDD_NNN_description.sql`
2. Mark status as `🔴 NEEDS TO BE RUN`
3. Run `npm run migrate`
4. Update status to `✅ ALREADY APPLIED (date)`

---

## Scoring System (defaults — editable from Admin)

| Round | Winner pts | Exact games pts | Max pts |
|-------|-----------|----------------|---------|
| Play-In | 1 | — | 1 |
| First Round | 1 | +2 | 3 |
| Conference Semifinals | 2 | +2 | 4 |
| Conference Finals | 3 | +3 | 6 |
| NBA Finals | 4 | +4 | 8 |
| Champion Pick | 5 | — | 5 |
| Finals MVP Pick | 3 | — | 3 |

Scoring is handled entirely by Postgres triggers — clients cannot manipulate points.

---

## Deployment

The app is configured for Vercel. Push to main and Vercel auto-deploys.

Make sure to set all environment variables (except `SUPABASE_DB_URL`) in the Vercel dashboard under Project Settings > Environment Variables.
