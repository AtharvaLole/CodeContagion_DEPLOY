# CodeContagion

CodeContagion is a hackathon-ready cyber game platform with two core modes:

- `Debug Arena`: fix broken code under pressure, with solo and duo modes.
- `Misinfo Sim`: contain misinformation spread in solo and multiplayer rooms.

This repo uses a clean split between frontend and backend:

- `apps/frontend`: React + Vite + TypeScript UI
- `apps/backend`: Express + TypeScript API and real-time server foundation
- `apps/ai-apis`: FastAPI service for AI-backed game endpoints

## Phase 0 Status

Phase 0 sets up the local development environment and working project structure for Windows without Docker.

### Current goals

- Get both apps running locally
- Keep frontend and backend separate
- Prepare env files for Supabase, Upstash, Groq, and Piston
- Create a stable starting point for Phase 1

## Workspace structure

```text
apps/
  backend/
  frontend/
```

## Run commands

Install all dependencies from the repo root:

```powershell
npm install
```

Run frontend:

```powershell
npm run dev:frontend
```

Run backend:

```powershell
npm run dev:backend
```

Run AI APIs:

```powershell
cd apps/ai-apis
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```

## Supabase leaderboard storage

Leaderboard score history is intended to live in Supabase.

Before using persistent ranking, run this SQL in your Supabase SQL editor:

```text
supabase/leaderboard-schema.sql
```

This creates:

- `leaderboard_profiles`
- `score_events`

## Next

After Phase 0 verification, we will start Phase 1 and convert the imported Lovable UI into a production-ready frontend structure.

## Production notes

- The sample env file at `.env.example` now uses placeholders only. Never commit real keys.
- Frontend static hosting includes SPA rewrites in `apps/frontend/public/_redirects`.
- Basic browser-facing security headers for static hosts live in `apps/frontend/public/_headers`.
- Backend and AI health endpoints stay public, but detailed runtime diagnostics are reduced in production mode.
- AI API docs are enabled by default in development and disabled by default in production. Set `ENABLE_API_DOCS=true` if you need them live.

## Free hosting

There is no truly unlimited free production stack with zero tradeoffs. The closest practical setup is:

- Frontend: Cloudflare Pages or the included Render static service
- Backend API: Render free web service
- AI API: Render free web service
- Database/Auth: Supabase free tier

If you want a one-click Render blueprint for all app services from this repo, use `render.yaml` at the root. You still need to set your environment variables in the Render dashboard before the deploy will work correctly.
