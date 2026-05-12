from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "doctor"
    phone: str | None = None
    invitation_token: str | None = None
    clinic_name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthUser(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    tenant_id: int
    tenant_slug: str | None = None
    tenant_name: str | None = None


class MeResponse(BaseModel):
    user: AuthUser
