# API Reference

Base URL (local): `http://localhost:8000/api/v1`

Docs UI (if backend is running): `http://localhost:8000/docs`

## Auth Requirements

- Public endpoints: login/register/refresh and invitation check.
- Most other endpoints require `Authorization: Bearer <access_token>`.
- Role enforcement is dependency-based (`doctor`, `assistant`, or doctor-only).
- Tenant isolation is enforced server-side using authenticated user tenant context.

## Main API Groups

- `auth`
- `tenants`
- `users`
- `patients`
- `doctors`
- `appointments`
- `medical-records`
- `prescriptions`
- `invitations`
- `dashboard`
- `notifications`

## Important Endpoints

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

Login request example:

```json
{
  "email": "doctor@example.com",
  "password": "<PASSWORD>"
}
```

Token response example:

```json
{
  "access_token": "<JWT_ACCESS_TOKEN>",
  "refresh_token": "<JWT_REFRESH_TOKEN>",
  "token_type": "bearer"
}
```

`GET /auth/me` response example:

```json
{
  "user": {
    "id": 1,
    "email": "doctor@example.com",
    "full_name": "Dr. Demo",
    "role": "doctor",
    "tenant_id": 10,
    "tenant_slug": "demo-clinic",
    "tenant_name": "Demo Clinic"
  }
}
```

### Patients

- `POST /patients/` (doctor or assistant)
- `GET /patients/` (doctor or assistant)
- `GET /patients/search?q=<term>`
- `GET /patients/{patient_id}`
- `PUT /patients/{patient_id}`

### Appointments

- `POST /appointments/`
- `GET /appointments/`
- `GET /appointments/{appointment_id}`
- `PUT /appointments/{appointment_id}`
- `PATCH /appointments/{appointment_id}/status`
- `DELETE /appointments/{appointment_id}`

### Medical Records and Prescriptions

- `POST /medical-records/`
- `GET /medical-records/patient/{patient_id}`
- `GET /medical-records/{record_id}`
- `PUT /medical-records/{record_id}`
- `POST /prescriptions/medical-record/{record_id}`
- `GET /prescriptions/medical-record/{record_id}`
- `PUT /prescriptions/{prescription_id}`
- `GET /prescriptions/suggestions?query=<text>`

### Invitations and Notifications

- `GET /invitations/check?token=<token>`
- `POST /invitations/` (doctor-only)
- `GET /invitations/` (doctor-only)
- `DELETE /invitations/{invitation_id}` (doctor-only)
- `GET /notifications/`
- `PATCH /notifications/{notification_id}/read`
- `POST /notifications/share-appointment/{appointment_id}`

### Administration / Supporting

- `GET /dashboard/`
- `POST /users/` (doctor-only)
- `GET /users/`
- `GET /users/{user_id}`
- `PUT /users/{user_id}`
- `GET /tenants/` (returns current tenant context)
- `GET /tenants/{tenant_id}`
- `PUT /tenants/{tenant_id}` (doctor-only, current tenant only)

## Error Handling Notes

- Validation errors return HTTP 422 (FastAPI standard shape).
- Auth errors commonly return:
  - 401 for invalid/missing/expired token or bad credentials.
  - 403 for insufficient role permissions.
- Not found returns 404 for missing resources or cross-tenant access attempts.
- Rate-limited endpoints return 429.
- Unhandled exceptions are normalized to:

```json
{
  "detail": "Internal server error",
  "message": "An unexpected error occurred"
}
```
