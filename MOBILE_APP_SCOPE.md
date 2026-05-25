# Medica Mobile App Scope

## Purpose

Medica Mobile is a Flutter companion app for clinic operations on phones. The React app remains the primary web dashboard and admin interface.

## Scope Principles

- Use the existing Python FastAPI backend exactly as-is.
- Keep the same roles, tenant boundaries, data behavior, and core flows.
- Do not copy React desktop UI pixel-by-pixel.
- Build a mobile-first experience with the same product identity.

## Users and Roles

- Doctor
- Assistant

Role access and restrictions are enforced by backend permissions and reflected in mobile navigation/actions.

## In-Scope (v1)

- Authentication
  - login
  - token refresh
  - persistent session storage
  - logout
- Dashboard summary (mobile cards)
- Patients
  - list/search
  - create patient
  - patient detail
- Appointments
  - list and status filtering
  - create appointment
  - update status
- Visits/Consultation
  - add visit
  - consultation notes
  - prescriptions
  - prescription PDF/share for mobile print flow
- Notifications
  - list
  - mark as read
  - deep-link to relevant context
- Basic profile/clinic settings supported by current API
- Doctor admin essentials
  - staff list
  - invitation creation/listing

## Out of Scope (v1)

- Full desktop parity for advanced admin workflows
- New backend endpoints or schema changes
- New business features not present in current product
- Offline sync architecture

## Mobile Navigation

- Bottom navigation for primary areas:
  - Dashboard
  - Patients
  - Appointments
  - Notifications
  - More/Settings
- Drawer or "More" area for secondary routes (including administration for doctor role)

## Mobile Adaptation Rules

- Desktop tables -> list/card layouts
- Multi-column forms -> single-column forms
- Sidebar -> bottom nav + drawer
- Desktop modals -> bottom sheet or full-screen form
- Keep same actions and data fields; change only presentation for mobile usability

## Non-Functional Requirements

- Flutter + Riverpod
- Dio networking
- `flutter_secure_storage` for auth tokens
- Clear loading/empty/error states on each screen
- Clean modular structure for features, services, models, and shared widgets

## Acceptance Criteria

- Core flows run against current backend without contract changes
- Role-based behavior matches backend rules
- `flutter analyze` passes
- App launches with `flutter run` on emulator/device
