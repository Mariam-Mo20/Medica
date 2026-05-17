# Medica

Medica is a multi-tenant clinic management web application for doctors and assistants, with patient records, appointments, prescriptions, invitations, and operational dashboards.

## Main Features

- Multi-tenant clinic onboarding (doctor creates clinic) and invitation-based assistant signup.
- JWT authentication with access and refresh tokens.
- Role-aware access control for doctor and assistant actions.
- Patient management with MRN generation and patient search.
- Appointment scheduling, status updates, and consultation flow.
- Medical records and linked prescriptions.
- Clinic-scoped medication suggestions from historical prescriptions.
- Notifications and dashboard summaries for day-to-day activity.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, React Router, Zustand, Tailwind CSS.
- Backend: FastAPI, SQLAlchemy (async), Pydantic, python-jose, bcrypt.
- Database: PostgreSQL (production via Supabase pooler) or SQLite (local default).
- Deploy: Render (backend), Vercel (frontend).
- CI: GitHub Actions (backend tests + frontend type-check).


## Local Setup

### Prerequisites

- Node.js 20+ (22 used in CI)
- Python 3.12+ (3.13 used in CI)
- npm

### 1) Clone and install dependencies

```bash
git clone <your-repo-url>
cd Medica

# Backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
pip install pytest pytest-asyncio aiosqlite httpx greenlet

# Frontend
cd frontend
npm install
cd ..
```

### 2) Configure environment

Create `backend/.env` from `backend/.env.example`.

Required variables:

- `DATABASE_URL`
- `DATABASE_URL_SYNC`
- `SECRET_KEY`
- `RESEND_API_KEY`
- `FRONTEND_URL`

Use placeholders only. Never commit real secrets.

## Run the App

### Backend

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend API base: `http://localhost:8000/api/v1`
Health endpoint: `http://localhost:8000/health`

### Frontend

```bash
cd frontend
npm run dev
```

Frontend app: `http://localhost:5173`

## Run Tests and Checks

### Backend tests

```bash
pytest backend/tests/test_endpoints.py -q
pytest backend/tests -v --tb=short
```

### Frontend type-check

```bash
cd frontend
npx tsc --noEmit
```

## Deployment Overview

- Backend is deployed to Render.
- Frontend is deployed to Vercel.
- Frontend rewrites `/api/*` to the Render backend host (`frontend/vercel.json`).
- See `docs/deployment.md` for setup, env vars, redeploy, and verification steps.

## Security Summary

- JWT access/refresh token flow with role checks on protected routes.
- Tenant-scoped data access in API handlers.
- Rate limiting on sensitive endpoints (`register`, `login`, `refresh`, invitation checks).
- Global exception responses avoid leaking internal error details.
- Sensitive values are env-driven; `.env` files are git-ignored.

See `docs/security.md` for full details and Phase 2 recommendations.
