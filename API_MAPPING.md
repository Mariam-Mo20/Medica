# Medica Mobile API Mapping

This document maps Flutter mobile feature flows to existing backend endpoints. No endpoint changes are introduced.

## Base

- Base path: `/api/v1`
- Auth: Bearer token in `Authorization` header
- On `401`: attempt refresh and retry once, then logout if refresh fails

## Auth

- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `GET /auth/me`

## Invitations

- `GET /invitations/check?token=...`
- `POST /invitations/`
- `GET /invitations/`
- `DELETE /invitations/{invitation_id}`

## Patients

- `GET /patients/`
- `GET /patients/search?q=...`
- `POST /patients/`
- `GET /patients/{patient_id}`
- `PUT /patients/{patient_id}`

## Appointments

- `GET /appointments/`
- `POST /appointments/`
- `GET /appointments/{appointment_id}`
- `PUT /appointments/{appointment_id}`
- `PATCH /appointments/{appointment_id}/status`
- `DELETE /appointments/{appointment_id}`

## Medical Records

- `POST /medical-records/`
- `GET /medical-records/patient/{patient_id}`
- `GET /medical-records/{record_id}`
- `PUT /medical-records/{record_id}`

## Prescriptions

- `POST /prescriptions/medical-record/{record_id}`
- `GET /prescriptions/medical-record/{record_id}`
- `PUT /prescriptions/{prescription_id}`
- `GET /prescriptions/suggestions?q=...&limit=...`

## Notifications

- `GET /notifications/`
- `PATCH /notifications/{notification_id}/read`
- `POST /notifications/share-appointment/{appointment_id}`

## Dashboard

- `GET /dashboard/`

## Users / Tenants

- `GET /users/`
- `PUT /users/{user_id}`
- `GET /tenants/`
- `GET /tenants/{tenant_id}`
- `PUT /tenants/{tenant_id}`

## Contract and Role Notes

- Backend is source of truth for role permissions and tenant isolation.
- Mobile UI should hide or disable unavailable actions, but backend enforcement remains authoritative.
- Request field names and payload shapes should match current frontend/backend contracts.

## Error Handling Expectations

- `400`: validation/domain input errors
- `401`: auth failure or expired token
- `403`: permission denied
- `404`: resource not found or out-of-tenant access
- `409`: appointment conflict/duplicate constraints
- `429`: rate limited
- `500`: unexpected server error
