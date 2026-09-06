"""Create the Postgres/Supabase schema and insert a sample resume + job description.

Substitutes for the old MongoDB seed: instead of creating Mongo collections and
indexes, it runs the SQLAlchemy DDL (same tables the backend creates on startup)
and loads demo data through the same repository functions the API uses.

Usage:
    python database/seed.py

Defaults to the local Postgres from docker-compose.yml. Point it anywhere with
the DATABASE_URL style Supabase uses:

    DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/resume_builder
    python database/seed.py
"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy.ext.asyncio import async_sessionmaker  # noqa: E402

DEMO_USER = "demo-user"

SAMPLE_RESUME_DATA = {
    "contact": {
        "fullName": "Jane Doe",
        "email": "jane.doe@example.com",
        "phone": "555-1234",
        "location": "San Francisco, CA",
        "linkedin": "https://linkedin.com/in/janedoe",
        "website": None,
    },
    "summary": "Software engineer with 4 years of experience shipping reliable, well-tested web services.",
    "experience": [
        {
            "id": "exp1",
            "company": "Tech Co",
            "position": "Software Engineer",
            "location": "Remote",
            "startDate": "06/2021",
            "endDate": "01/2024",
            "current": False,
            "bullets": ["Cut API latency 30% by caching", "Led a team of 3 to ship a payments feature"],
        }
    ],
    "education": [{"id": "edu1", "institution": "State University", "degree": "BS", "field": "Computer Science", "startDate": "09/2017", "endDate": "05/2021", "gpa": "3.6"}],
    "skills": [{"id": "sk1", "name": "Python"}, {"id": "sk2", "name": "PostgreSQL"}, {"id": "sk3", "name": "Docker"}],
    "projects": [],
    "certifications": [],
}

SAMPLE_JOB_DESCRIPTION = """Job Title: Senior DevOps Engineer

We are looking for a Senior DevOps Engineer to automate our cloud infrastructure.

Requirements:
- 5+ years with Kubernetes, Docker and CI/CD pipelines (GitHub Actions)
- Strong Terraform and AWS experience
- PostgreSQL administration and performance tuning
- Comfortable with Python scripting and incident management

Nice to have: OpenTelemetry, ArgoCD, SRE practices.
"""


async def main() -> None:
    from app.database import configure_database, close_db, init_db, get_engine
    from app.models.resume import create_resume, list_resumes, save_job_description

    default_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/resume_builder"
    url = os.getenv("DATABASE_URL", default_url)
    print(f"Connecting to {url.split('@')[-1]} ...")

    configure_database(url)
    await init_db()  # CREATE TABLE IF NOT EXISTS — same DDL the API uses on boot.

    async_session = async_sessionmaker(get_engine(), expire_on_commit=False)
    async with async_session() as session:
        existing = await list_resumes(session, DEMO_USER)
        if existing:
            print(f"  {DEMO_USER} already has {len(existing)} resume(s) — skipping sample data.")
        else:
            await create_resume(
                session,
                user_id=DEMO_USER,
                data=SAMPLE_RESUME_DATA,
                title="Jane Doe - Software Engineer",
                template="modern",
                target_role="Software Engineer",
            )
            await save_job_description(
                session,
                user_id=DEMO_USER,
                raw_text=SAMPLE_JOB_DESCRIPTION,
                target_role="Senior DevOps Engineer",
            )
            print(f"  Created sample resume + job description for {DEMO_USER}.")

        print(f"  Resumes on record: {len(await list_resumes(session, DEMO_USER))}")

    await close_db()
    print("Schema applied successfully.")

    print("\nTables: users -> resumes, resume_data, ats_scans, job_descriptions")
    print("(The app auto-creates these on startup too - init_db in backend/app/database.py)")


if __name__ == "__main__":
    asyncio.run(main())