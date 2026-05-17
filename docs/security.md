# Security

This document summarizes implemented security controls and next-step improvements.

## Security Measures Already Implemented

- JWT-based authentication with separate access and refresh tokens.
- Password hashing using bcrypt.
- Protected endpoints enforced via `get_current_user` dependency.
- Role-based authorization using `require_role(...)`.
- Tenant isolation using authenticated tenant context (`get_current_tenant`).
- Global exception response hardening to avoid leaking internal stack details.

## Secrets and Environment Handling

- Runtime secrets are loaded from environment variables (Pydantic settings).
- Example values are provided in `backend/.env.example`.
- `.env` files are git-ignored (root `.gitignore` includes `.env` and `**/.env`).
- Sensitive values should be set in deployment platform secret managers.

Important variables:

- `DATABASE_URL`
- `DATABASE_URL_SYNC`
- `SECRET_KEY`
- `RESEND_API_KEY`
- `FRONTEND_URL`

## Rate Limiting

In-memory request throttling is implemented in `backend/app/core/rate_limit.py` and currently applied to:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/invitations/check`

Current behavior:

- Client identity is derived from `x-forwarded-for` (if present) or remote IP.
- Exceeding limits returns HTTP `429`.

## Tenant Access Protection

- API handlers consistently scope queries by tenant.
- Auth middleware resolves current user from token.
- Tenant middleware resolves tenant from authenticated user.
- Tenant endpoints are constrained to current tenant context and doctor permissions where required.

## Error Handling Hardening

- Unhandled exceptions return a generic response payload:
  - `detail: "Internal server error"`
  - `message: "An unexpected error occurred"`
- Optional debug logging is available only when `DEBUG=true`.

## Remaining Optional Security Improvements

Phase 2 recommendations (planned, not yet applied):

- Move token transport from `localStorage` to secure HttpOnly cookies.
- Add refresh-token revocation and server-side session tracking.
- Add secure logout endpoints that revoke session tokens.
- Add CSRF protection for state-changing requests when cookie auth is adopted.
- Tighten CORS policy for credentialed cross-origin requests.
- Expand auth test coverage for login/refresh/logout/session-reuse scenarios.

Additional future hardening ideas:

- Replace in-memory limiter with distributed limiter (Redis) for horizontal scaling.
- Add audit logging for sensitive account and admin actions.
- Add automated secret scanning in CI.

## Critical Rule

Never commit real secrets, credentials, API keys, passwords, or tokens to the repository.
