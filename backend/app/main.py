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
                    # Drop old receiver_id column if it exists (was renamed to recipient_id)
                    if "receiver_id" in cols:
                        conn_sync.execute(text("ALTER TABLE notifications DROP COLUMN receiver_id"))
                    missing = []
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
