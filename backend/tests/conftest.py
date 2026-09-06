import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database import Base, get_session
from main import app


def _run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@pytest.fixture(scope="session")
def db_engine():
    """In-memory SQLite engine shared across the test session."""
    import app.models.resume  # noqa: F401  (register models on Base.metadata)

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=StaticPool)

    async def _create_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    _run(_create_tables())
    yield engine

    async def _dispose():
        await engine.dispose()

    _run(_dispose())


@pytest.fixture()
def client(db_engine):
    factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_session():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def make_resume_payload(name: str = "Jane Doe", skills=None) -> dict:
    return {
        "contact": {
            "fullName": name,
            "email": f"{name.split()[0].lower()}@example.com",
            "phone": "555-1234",
            "location": "Remote",
        },
        "summary": "Product manager with 3 years of experience.",
        "experience": [
            {
                "id": "exp1",
                "company": "Tech Co",
                "position": "Product Manager",
                "location": "",
                "startDate": "01/2021",
                "endDate": "01/2024",
                "current": False,
                "bullets": ["Shipped 5 major releases", "Led a team of 4"],
            }
        ],
        "education": [{"id": "edu1", "institution": "State U", "degree": "BA", "field": "Business", "startDate": "09/2017", "endDate": "05/2021"}],
        "skills": skills
        if skills is not None
        else [{"id": "sk1", "name": "SQL"}, {"id": "sk2", "name": "Figma"}],
        "projects": [],
        "certifications": [],
    }


def unique_user_id(prefix: str = "user") -> str:
    import uuid

    return f"{prefix}-{uuid.uuid4().hex[:8]}"