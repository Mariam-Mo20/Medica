from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
