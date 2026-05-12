from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    medical_record_number = Column(String(50), nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(20))
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = relationship("Tenant", backref="patients")
    created_by_user = relationship("User", backref="registered_patients")

    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("tenant_id", "medical_record_number", name="uq_tenant_mrn"),
    )
