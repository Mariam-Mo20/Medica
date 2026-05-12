from fastapi import APIRouter

from app.api.v1 import auth, tenants, users, patients, doctors, appointments, medical_records, prescriptions, dashboard, invitations

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(patients.router, prefix="/patients", tags=["Patients"])
router.include_router(doctors.router, prefix="/doctors", tags=["Doctors"])
router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
router.include_router(medical_records.router, prefix="/medical-records", tags=["Medical Records"])
router.include_router(prescriptions.router, prefix="/prescriptions", tags=["Prescriptions"])
router.include_router(invitations.router, prefix="/invitations", tags=["Invitations"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])

