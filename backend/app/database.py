import os
import logging
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

logger = logging.getLogger("uvicorn.error")

# Production (Supabase PostgreSQL) uses DATABASE_URL, e.g.:
#   postgresql+asyncpg://postgres:password@host:5432/postgres
# For local development / tests, fall back to a file-based async SQLite DB.
DEFAULT_DATABASE_URL = "sqlite+aiosqlite:///./resume_builder.db"

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


class Base(DeclarativeBase):
    pass


def is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


def configure_database(url: str | None = None) -> None:
    """(Re)configure the engine. Exposed so tests can point at an in-memory SQLite."""
    global _engine, _session_factory
    url = url or os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

    kwargs: dict = {"pool_pre_ping": True}
    if is_sqlite(url):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10

    _engine = create_async_engine(url, echo=False, **kwargs)
    _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


def get_engine() -> AsyncEngine:
    if _engine is None:
        configure_database()
    assert _engine is not None
    return _engine


async def get_session():
    """FastAPI dependency that yields an async SQLAlchemy session."""
    if _session_factory is None:
        configure_database()
    assert _session_factory is not None
    async with _session_factory() as session:
        yield session


async def init_db() -> None:
    """Create tables + indexes if they do not exist. Safe to run on every boot."""
    from app.models import resume  # noqa: F401  (registers models on Base.metadata)

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def check_db_connection() -> bool:
    """Lightweight connectivity probe used by /api/health."""
    from sqlalchemy import text

    engine = get_engine()
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        logger.exception("Database connectivity check failed")
        return False


async def close_db() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None