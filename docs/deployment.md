# Deployment Guide

## Deployment Strategy

- Primary branch flow in this repo has used `dev` for active integration and validation.
- Deploy backend to Render and frontend to Vercel.
- Validate health and auth flow after each backend release.
- Promote to production workflow only after staging checks pass.

## Render Backend Setup

1. Create a Web Service from the repository `backend` directory.
2. Runtime: Python.
3. Build command:

```bash
pip install -r requirements.txt
```

4. Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

5. Set environment variables (see "Required Environment Variables").

Health endpoint:

- `GET /health`

## Vercel Frontend Setup

1. Create a Vercel project from repository `frontend` directory.
2. Build command:

```bash
npm run build
```

3. Output directory: `dist`
4. Ensure `frontend/vercel.json` rewrites are present:
   - `/api/(.*)` -> Render backend `/api/$1`
   - fallback rewrite to `/index.html` for SPA routing

## Required Environment Variables

Set these on backend runtime (Render) and locally in `backend/.env`:

- `DATABASE_URL`
- `DATABASE_URL_SYNC`
- `SECRET_KEY`
- `RESEND_API_KEY`
- `FRONTEND_URL`

Common backend defaults are defined in `backend/app/core/config.py`, but production values should always come from environment variables.

Use placeholders in documentation and config examples. Never commit real secret values.

## Staging / Production Flow

Suggested release sequence:

1. Merge changes into staging branch/environment (`dev`).
2. Deploy backend and frontend.
3. Run smoke tests:
   - health endpoint
   - login
   - protected endpoint
   - refresh flow
4. Run automated checks (`pytest`, frontend type-check).
5. Promote to production branch/environment (`main`) after sign-off.

## How to Redeploy

### Backend (Render)

- Trigger from Render dashboard or invoke a deploy hook URL.
- Wait for build + startup completion.

### Frontend (Vercel)

- Trigger from Vercel dashboard or `vercel --prod` from `frontend`.

## How to Verify Deployment

Backend checks:

```bash
curl -i https://<backend-host>/health
```

Expected: `200 OK` and JSON status payload.

Auth checks (example sequence):

1. `POST /api/v1/auth/login`
2. Use returned access token on `GET /api/v1/auth/me`
3. `POST /api/v1/auth/refresh`
4. Call `GET /api/v1/auth/me` again using refreshed access token

Quality checks:

- `npm run -s tsc --noEmit` (frontend)
- `pytest backend/tests/test_endpoints.py -q` (backend)
