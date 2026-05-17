# Architecture

## High-Level Architecture

Medica is a split frontend/backend web application:

- Frontend (React + Vite) serves the SPA UI.
- Backend (FastAPI) exposes REST APIs under `/api/v1`.
- Database is accessed through SQLAlchemy async sessions.
- Authentication uses JWT bearer tokens (access + refresh).
- Multi-tenant isolation is enforced per request using authenticated user tenant context.

Current deployment shape:

- Frontend on Vercel.
- Backend on Render.
- Frontend `/api/*` requests are rewritten to backend host (`frontend/vercel.json`).

## Frontend Structure

Main layout and routing live in `frontend/src/App.tsx` and `frontend/src/components/Layout.tsx`.

Key folders:

- `frontend/src/pages`: route-level pages (login, signup, dashboard, patients, appointments, consultation, notifications, administration, settings).
- `frontend/src/components`: shared UI pieces and guards (including `AuthGuard.tsx`).
- `frontend/src/lib`: API client and utility helpers (`api.ts`, cache/date helpers).
- `frontend/src/store`: Zustand auth store (`authStore.ts`).
- `frontend/src/types`: shared TypeScript types.

Auth state is currently bootstrapped from `localStorage` and verified with `/auth/me`.

## Backend Structure

Backend entrypoint is `backend/app/main.py`.

Key folders:

- `backend/app/api/v1`: REST endpoint modules grouped by domain.
- `backend/app/models`: SQLAlchemy ORM models.
- `backend/app/schemas`: Pydantic request/response schemas.
- `backend/app/middleware`: auth and tenant dependencies.
- `backend/app/services`: domain service logic (dashboard, patients, appointments).
- `backend/app/core`: config, DB setup, security helpers, rate limiting.

The API router is assembled in `backend/app/api/v1/__init__.py` with base prefix `/api/v1`.

## Auth Flow

1. Client calls `/api/v1/auth/register` or `/api/v1/auth/login`.
2. Backend validates input, user credentials/invitation context, and returns access + refresh JWTs.
3. Frontend stores tokens (current implementation: `localStorage`).
4. Protected requests send `Authorization: Bearer <access_token>`.
5. Backend `get_current_user` decodes token and loads user; `get_current_tenant` resolves tenant.
6. On access token expiry, frontend calls `/api/v1/auth/refresh` with refresh token.

## Role / Permission Flow

- Roles currently used: `doctor`, `assistant`.
- Role checks use `require_role(...)` in endpoint dependencies.
- Typical constraints:
  - Doctors and assistants can access core care operations.
  - Doctor-only endpoints include user/admin-like operations and invitation management.
- Tenant-level constraints use `current_user.tenant_id` and `get_current_tenant`.

## Database / Models Overview

Core models:

- `Tenant`: clinic/workspace identity and settings.
- `User`: account identity, role, tenant membership.
- `Doctor`: doctor profile tied to a user.
- `Patient`: demographic and MRN data scoped to tenant.
- `Appointment`: scheduling and status lifecycle.
- `MedicalRecord`: visit-level clinical notes.
- `Prescription`: medications tied to a medical record.
- `Invitation`: assistant onboarding tokens and status.
- `Notification`: user-targeted clinic notifications.

Important relationships:

- One tenant has many users/patients/appointments/records/prescriptions.
- One user may have one doctor profile.
- Patient -> appointments -> medical records -> prescriptions flow links care data.

## Request Flow Examples

### Example A: Login and protected request

1. `POST /api/v1/auth/login` with email/password.
2. Receive `access_token` and `refresh_token`.
3. `GET /api/v1/auth/me` with bearer token.
4. API resolves user + tenant, returns auth user payload.

### Example B: Patient listing with tenant isolation

1. `GET /api/v1/patients?limit=20` with bearer token.
2. `require_role("doctor", "assistant")` checks role.
3. Query filters by `current_user.tenant_id`.
4. Response returns only same-tenant patients.

### Example C: Invitation-based signup

1. Doctor creates invitation via `POST /api/v1/invitations`.
2. Assistant checks token via `GET /api/v1/invitations/check?token=...`.
3. Assistant registers with `invitation_token` in `/api/v1/auth/register`.
4. Invitation status updates to accepted.
