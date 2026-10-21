# Backend (FastAPI)

Mints a signed ElevenLabs Conversational AI WebSocket URL so the API key never
reaches the browser. The Next.js dev server proxies `/api/signed-url` to this
service via a rewrite in `next.config.ts`.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Credentials

The backend loads, in order:

1. `../.env.local` (repo root — same file the frontend uses)
2. `backend/.env` (overrides the above if present)

So the existing root `.env.local` already works. Copy `backend/.env.example` to
`backend/.env` only if you want backend-specific overrides.

## Run

```bash
uvicorn main:app --reload --port 8000
```

Then in a separate terminal, start the frontend (`npm run dev`). Requests to
`http://localhost:3000/api/signed-url` are proxied here.
