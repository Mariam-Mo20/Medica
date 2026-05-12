from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    clinic_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    email = Column(String(255), nullable=True)
    role = Column(String(50), default="assistant")
    token = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(50), default="pending", index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    clinic = relationship("Tenant", backref="invitations")
    doctor = relationship("User", backref="sent_invitations")
