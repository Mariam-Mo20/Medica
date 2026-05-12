from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    medication_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(100), nullable=False)
    duration = Column(String(100))
    instructions = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", backref="prescriptions")
    medical_record = relationship("MedicalRecord", backref="prescriptions")
    doctor = relationship("Doctor", backref="prescriptions")
