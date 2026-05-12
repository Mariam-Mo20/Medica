from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True, index=True)
    receptionist_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, default=30)
    status = Column(String(50), default="scheduled", index=True)
    reason = Column(Text)
    notes = Column(Text)

    recurring_rule = Column(String(500))
    recurring_end_date = Column(DateTime(timezone=True))
    parent_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    series_id = Column(String(100), index=True)

    is_series_cancelled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant", backref="appointments")
    patient = relationship("Patient", backref="appointments")
    doctor = relationship("Doctor", backref="appointments")
    receptionist = relationship("User", backref="scheduled_appointments")
    parent = relationship("Appointment", remote_side=[id], backref="recurring_children")
