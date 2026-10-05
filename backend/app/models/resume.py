import datetime
import uuid
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete

from app.database import Base

# Generic JSON that becomes JSONB on PostgreSQL (Supabase), JSON on SQLite.
JSONColumn = JSON().with_variant(JSONB, "postgresql")

RESUMES_TABLE = "resumes"
RESUME_DATA_TABLE = "resume_data"
ATS_SCANS_TABLE = "ats_scans"
JOB_DESCRIPTIONS_TABLE = "job_descriptions"
JOB_APPLICATIONS_TABLE = "job_applications"

APPLICATION_STATUSES = ("wishlist", "applied", "interview", "offer", "rejected")


def _new_id() -> str:
    return str(uuid.uuid4())


class Resume(Base):
    __tablename__ = RESUMES_TABLE

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="Untitled Resume")
    target_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    template: Mapped[str] = mapped_column(String(50), nullable=False, default="modern")
    # When a resume is created from a clone/variant, parent_id points at the source resume.
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ResumeData(Base):
    __tablename__ = RESUME_DATA_TABLE

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    resume_id: Mapped[str] = mapped_column(
        String(36), ForeignKey(f"{RESUMES_TABLE}.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    # Structured JSONB payload: contact, summary, experience, education, skills, projects,
    # certifications - mirroring the ResumeData Pydantic schema.
    data: Mapped[dict[str, Any]] = mapped_column(JSONColumn, nullable=False, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AtsScan(Base):
    __tablename__ = ATS_SCANS_TABLE

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    resume_id: Mapped[str] = mapped_column(
        String(36), ForeignKey(f"{RESUMES_TABLE}.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    matched_keywords: Mapped[list[Any]] = mapped_column(JSONColumn, nullable=False, default=list)
    missing_keywords: Mapped[list[Any]] = mapped_column(JSONColumn, nullable=False, default=list)
    suggestions: Mapped[list[str]] = mapped_column(JSONColumn, nullable=False, default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class JobDescription(Base):
    __tablename__ = JOB_DESCRIPTIONS_TABLE

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_role: Mapped[str | None] = mapped_column(String(200), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    parsed_skills: Mapped[dict[str, Any]] = mapped_column(JSONColumn, nullable=False, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class JobApplication(Base):
    """A single tracked job application in the user's pipeline (Kanban board)."""

    __tablename__ = JOB_APPLICATIONS_TABLE

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role_title: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    salary: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="wishlist", index=True)
    date_applied: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    # Optional link to a tailored resume variant. NULL when the resume is deleted.
    resume_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey(f"{RESUMES_TABLE}.id", ondelete="SET NULL"), nullable=True, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ---------------------------------------------------------------------------
# Repository helpers (async, session-based so ownership is enforced per call)
# ---------------------------------------------------------------------------


def serialize_resume(resume: Resume, data: dict | None = None) -> dict:
    return {
        "id": resume.id,
        "title": resume.title,
        "targetRole": resume.target_role,
        "template": resume.template,
        "parentId": resume.parent_id,
        "score": resume.score,
        "data": data,
        "createdAt": resume.created_at,
        "updatedAt": resume.updated_at,
    }


async def create_resume(
    session: AsyncSession,
    user_id: str,
    data: dict,
    title: str = "Untitled Resume",
    template: str = "modern",
    target_role: str | None = None,
    parent_id: str | None = None,
) -> Resume:
    resume = Resume(user_id=user_id, title=title, template=template, target_role=target_role, parent_id=parent_id)
    session.add(resume)
    await session.flush()
    session.add(ResumeData(resume_id=resume.id, data=data))
    await session.commit()
    await session.refresh(resume)
    return resume


async def get_resume_for_user(session: AsyncSession, resume_id: str, user_id: str) -> Resume | None:
    result = await session.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_resume_data(session: AsyncSession, resume_id: str) -> dict | None:
    result = await session.execute(select(ResumeData).where(ResumeData.resume_id == resume_id))
    doc = result.scalar_one_or_none()
    return doc.data if doc else None


async def get_resume_with_data(session: AsyncSession, resume_id: str, user_id: str) -> dict | None:
    resume = await get_resume_for_user(session, resume_id, user_id)
    if resume is None:
        return None
    data = await get_resume_data(session, resume_id)
    return serialize_resume(resume, data)


async def list_resumes(session: AsyncSession, user_id: str) -> list[dict]:
    result = await session.execute(
        select(Resume)
        .where(Resume.user_id == user_id)
        .order_by(Resume.updated_at.desc())
    )
    resumes = result.scalars().all()
    return [serialize_resume(r) for r in resumes]


async def update_resume(session: AsyncSession, resume_id: str, user_id: str, patch: dict) -> dict | None:
    resume = await get_resume_for_user(session, resume_id, user_id)
    if resume is None:
        return None

    for key in ("title", "template", "score", "target_role"):
        if key in patch and patch[key] is not None:
            setattr(resume, key, patch[key])

    if "data" in patch and patch["data"] is not None:
        result = await session.execute(select(ResumeData).where(ResumeData.resume_id == resume_id))
        row = result.scalar_one_or_none()
        if row is None:
            session.add(ResumeData(resume_id=resume_id, data=patch["data"]))
        else:
            row.data = patch["data"]

    await session.commit()
    return await get_resume_with_data(session, resume_id, user_id)


async def delete_resume(session: AsyncSession, resume_id: str, user_id: str) -> bool:
    resume = await get_resume_for_user(session, resume_id, user_id)
    if resume is None:
        return False
    await session.execute(sa_delete(Resume).where(Resume.id == resume_id))
    await session.commit()
    return True


async def create_ats_scan(
    session: AsyncSession,
    resume_id: str,
    score: int,
    matched_keywords: list,
    missing_keywords: list,
    suggestions: list[str],
) -> AtsScan:
    scan = AtsScan(
        resume_id=resume_id,
        score=score,
        matched_keywords=matched_keywords,
        missing_keywords=missing_keywords,
        suggestions=suggestions,
    )
    session.add(scan)
    await session.commit()
    await session.refresh(scan)
    return scan


async def list_ats_scans_for_resume(session: AsyncSession, resume_id: str) -> list[AtsScan]:
    result = await session.execute(select(AtsScan).where(AtsScan.resume_id == resume_id).order_by(AtsScan.created_at.desc()))
    return list(result.scalars().all())


async def save_job_description(
    session: AsyncSession,
    user_id: str,
    raw_text: str,
    parsed_skills: dict | None = None,
    target_role: str | None = None,
) -> JobDescription:
    jd = JobDescription(user_id=user_id, raw_text=raw_text, parsed_skills=parsed_skills or {}, target_role=target_role)
    session.add(jd)
    await session.commit()
    await session.refresh(jd)
    return jd


# ---------------------------------------------------------------------------
# Job application (tracker) repository helpers
# ---------------------------------------------------------------------------


def serialize_job_application(app: JobApplication, resume_title: str | None = None) -> dict:
    return {
        "id": app.id,
        "companyName": app.company_name,
        "roleTitle": app.role_title,
        "location": app.location,
        "salary": app.salary,
        "status": app.status,
        "dateApplied": app.date_applied,
        "resumeId": app.resume_id,
        "resumeTitle": resume_title,
        "notes": app.notes,
        "createdAt": app.created_at,
        "updatedAt": app.updated_at,
    }


async def _resume_titles(session: AsyncSession, user_id: str, ids: set[str]) -> dict[str, str]:
    if not ids:
        return {}
    result = await session.execute(
        select(Resume.id, Resume.title).where(Resume.user_id == user_id, Resume.id.in_(ids))
    )
    return {row[0]: row[1] for row in result.all()}


async def list_job_applications(session: AsyncSession, user_id: str) -> list[dict]:
    result = await session.execute(
        select(JobApplication).where(JobApplication.user_id == user_id).order_by(JobApplication.created_at.desc())
    )
    rows = list(result.scalars().all())
    titles = await _resume_titles(session, user_id, {r.resume_id for r in rows if r.resume_id})
    return [serialize_job_application(r, titles.get(r.resume_id or "")) for r in rows]


async def get_job_application(session: AsyncSession, application_id: str, user_id: str) -> JobApplication | None:
    result = await session.execute(
        select(JobApplication).where(JobApplication.id == application_id, JobApplication.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_job_application(session: AsyncSession, user_id: str, values: dict) -> JobApplication:
    app = JobApplication(user_id=user_id, **values)
    session.add(app)
    await session.commit()
    await session.refresh(app)
    return app


async def update_job_application(
    session: AsyncSession, application_id: str, user_id: str, patch: dict
) -> JobApplication | None:
    app = await get_job_application(session, application_id, user_id)
    if app is None:
        return None
    for key, value in patch.items():
        if value is not None:
            setattr(app, key, value)
    await session.commit()
    await session.refresh(app)
    return app


async def delete_job_application(session: AsyncSession, application_id: str, user_id: str) -> bool:
    app = await get_job_application(session, application_id, user_id)
    if app is None:
        return False
    await session.execute(sa_delete(JobApplication).where(JobApplication.id == application_id))
    await session.commit()
    return True