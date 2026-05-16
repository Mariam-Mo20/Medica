from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from time import perf_counter

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import router as v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Migration: add missing columns to notifications table
            from sqlalchemy import inspect, text
            def migrate(conn_sync):
                inspector = inspect(conn_sync)
                if "notifications" in inspector.get_table_names():
                    cols = {c["name"] for c in inspector.get_columns("notifications")}
                    # Drop old columns that were replaced or renamed
                    for old_col in ["receiver_id", "patient_id"]:
                        if old_col in cols:
                            conn_sync.execute(text(f"ALTER TABLE notifications DROP COLUMN IF EXISTS {old_col}"))
                    # Refresh column list after drops
                    cols = {c["name"] for c in inspector.get_columns("notifications")}
                    for col, dtype in [
                        ("recipient_id", "INTEGER REFERENCES users(id)"),
                        ("sender_id", "INTEGER REFERENCES users(id)"),
                        ("notification_type", "VARCHAR(50) NOT NULL DEFAULT ''"),
                        ("title", "VARCHAR(255) NOT NULL DEFAULT ''"),
                        ("message", "TEXT"),
                        ("resource_type", "VARCHAR(50)"),
                        ("resource_id", "INTEGER"),
                        ("is_read", "BOOLEAN DEFAULT FALSE"),
                    ]:
                        if col not in cols:
                            conn_sync.execute(text(f"ALTER TABLE notifications ADD COLUMN {col} {dtype}"))
            await conn.run_sync(migrate)
            def migrate_medical(conn_sync):
                inspector = inspect(conn_sync)
                if "medical_records" in inspector.get_table_names():
                    cols = {c["name"] for c in inspector.get_columns("medical_records")}
                    if "doctor_id" in cols:
                        col_info = [c for c in inspector.get_columns("medical_records") if c["name"] == "doctor_id"][0]
                        if not col_info.get("nullable", True):
                            conn_sync.execute(text("ALTER TABLE medical_records ALTER COLUMN doctor_id DROP NOT NULL"))
            await conn.run_sync(migrate_medical)
            def migrate_prescriptions(conn_sync):
                inspector = inspect(conn_sync)
                if "prescriptions" in inspector.get_table_names():
                    cols = {c["name"] for c in inspector.get_columns("prescriptions")}
                    if "doctor_id" in cols:
                        col_info = [c for c in inspector.get_columns("prescriptions") if c["name"] == "doctor_id"][0]
                        if not col_info.get("nullable", True):
                            conn_sync.execute(text("ALTER TABLE prescriptions ALTER COLUMN doctor_id DROP NOT NULL"))
            await conn.run_sync(migrate_prescriptions)

            def ensure_perf_indexes(conn_sync):
                conn_sync.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)"
                ))
                conn_sync.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id)"
                ))
                conn_sync.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_tenants_id ON tenants (id)"
                ))
                conn_sync.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_patients_tenant_id ON patients (tenant_id)"
                ))
                conn_sync.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_appt_tenant_scheduled ON appointments (tenant_id, scheduled_at DESC)"
                ))
                conn_sync.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_appt_tenant_status_scheduled ON appointments (tenant_id, status, scheduled_at DESC)"
                ))
                conn_sync.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_patient_tenant_created ON patients (tenant_id, created_at DESC)"
                ))
            await conn.run_sync(ensure_perf_indexes)
    except Exception:
        pass

    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def request_timing_middleware(request: Request, call_next):
    started_at = perf_counter()
    response = await call_next(request)
    if settings.DEBUG:
        duration_ms = (perf_counter() - started_at) * 1000
        path = request.url.path
        method = request.method
        if path.startswith("/api/") or path == "/health":
            print(f"[perf][api] {method} {path} -> {response.status_code} in {duration_ms:.1f}ms")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc)},
    )


app.include_router(v1_router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.VERSION}
