from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    diagnosis = Column(Text)
    symptoms = Column(Text)
    visit_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant", backref="medical_records")
    patient = relationship("Patient", backref="medical_records")
    appointment = relationship("Appointment", backref="medical_records")
    doctor = relationship("Doctor", backref="medical_records")
