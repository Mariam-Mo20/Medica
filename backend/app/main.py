from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from time import perf_counter

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import router as v1_router


def _migrate_notifications_table(conn_sync):
    from sqlalchemy import inspect, text

    inspector = inspect(conn_sync)
    if "notifications" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("notifications")}
    for old_column in ["receiver_id", "patient_id"]:
        if old_column in columns:
            conn_sync.execute(text(f"ALTER TABLE notifications DROP COLUMN IF EXISTS {old_column}"))

    columns = {column["name"] for column in inspector.get_columns("notifications")}
    for column_name, column_type in [
        ("recipient_id", "INTEGER REFERENCES users(id)"),
        ("sender_id", "INTEGER REFERENCES users(id)"),
        ("notification_type", "VARCHAR(50) NOT NULL DEFAULT ''"),
        ("title", "VARCHAR(255) NOT NULL DEFAULT ''"),
        ("message", "TEXT"),
        ("resource_type", "VARCHAR(50)"),
        ("resource_id", "INTEGER"),
        ("is_read", "BOOLEAN DEFAULT FALSE"),
    ]:
        if column_name not in columns:
            conn_sync.execute(text(f"ALTER TABLE notifications ADD COLUMN {column_name} {column_type}"))


def _drop_doctor_id_not_null(conn_sync, table_name: str):
    from sqlalchemy import inspect, text

    inspector = inspect(conn_sync)
    if table_name not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if "doctor_id" not in columns:
        return

    doctor_id_info = [column for column in inspector.get_columns(table_name) if column["name"] == "doctor_id"][0]
    if not doctor_id_info.get("nullable", True):
        conn_sync.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN doctor_id DROP NOT NULL"))


def _ensure_perf_indexes(conn_sync):
    from sqlalchemy import text

    for statement in [
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
        "CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_tenants_id ON tenants (id)",
        "CREATE INDEX IF NOT EXISTS idx_patients_tenant_id ON patients (tenant_id)",
        "CREATE INDEX IF NOT EXISTS idx_appt_tenant_scheduled ON appointments (tenant_id, scheduled_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_appt_tenant_status_scheduled ON appointments (tenant_id, status, scheduled_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_patient_tenant_created ON patients (tenant_id, created_at DESC)",
    ]:
        conn_sync.execute(text(statement))


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_migrate_notifications_table)
            await conn.run_sync(lambda conn_sync: _drop_doctor_id_not_null(conn_sync, "medical_records"))
            await conn.run_sync(lambda conn_sync: _drop_doctor_id_not_null(conn_sync, "prescriptions"))
            await conn.run_sync(_ensure_perf_indexes)
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
