import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import resume as repo
from app.schemas.resume import (
    JobApplicationCreate,
    JobApplicationUpdate,
)

router = APIRouter(prefix="/api/applications", tags=["applications"])

DATABASE_DOWN_DETAIL = (
    "Database is not available. Set DATABASE_URL to your Supabase Postgres URL, or "
    "run locally with the built-in SQLite fallback (see backend/.env.example)."
)

MUTABLE_FIELDS = {
    "companyName": "company_name",
    "roleTitle": "role_title",
    "location": "location",
    "salary": "salary",
    "status": "status",
    "dateApplied": "date_applied",
    "resumeId": "resume_id",
    "notes": "notes",
}


def _db_error(e: Exception) -> HTTPException:
    return HTTPException(status_code=503, detail=DATABASE_DOWN_DETAIL)


def _today() -> str:
    return datetime.date.today().isoformat()


async def _owned_resume_or_400(session: AsyncSession, user_id: str, resume_id: str | None) -> None:
    if not resume_id:
        return
    if await repo.get_resume_for_user(session, resume_id, user_id) is None:
        raise HTTPException(status_code=400, detail="Attached resume not found")


@router.get("")
async def list_applications(
    userId: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_session),
):
    try:
        return await repo.list_job_applications(session, userId)
    except SQLAlchemyError as e:
        raise _db_error(e)


@router.post("")
async def create_application(req: JobApplicationCreate, session: AsyncSession = Depends(get_session)):
    if not req.companyName.strip() or not req.roleTitle.strip():
        raise HTTPException(status_code=400, detail="Company name and role title are required")
    try:
        await _owned_resume_or_400(session, req.userId, req.resumeId)
        values = {
            "company_name": req.companyName.strip(),
            "role_title": req.roleTitle.strip(),
            "location": req.location.strip() if req.location else None,
            "salary": req.salary.strip() if req.salary else None,
            "status": req.status,
            "date_applied": req.dateApplied or _today(),
            "resume_id": req.resumeId or None,
            "notes": req.notes.strip() if req.notes else None,
        }
        app = await repo.create_job_application(session, req.userId, values)
    except SQLAlchemyError as e:
        raise _db_error(e)
    resume = await repo.get_resume_for_user(session, app.resume_id, req.userId) if app.resume_id else None
    return repo.serialize_job_application(app, resume.title if resume else None)


@router.put("/{application_id}")
async def update_application(
    application_id: str,
    req: JobApplicationUpdate,
    session: AsyncSession = Depends(get_session),
):
    patch = {column: value for field, column in MUTABLE_FIELDS.items() if (value := getattr(req, field)) is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update")
    try:
        await _owned_resume_or_400(session, req.userId, patch.get("resume_id"))
        app = await repo.update_job_application(session, application_id, req.userId, patch)
    except SQLAlchemyError as e:
        raise _db_error(e)
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found")
    resume = await repo.get_resume_for_user(session, app.resume_id, req.userId) if app.resume_id else None
    return repo.serialize_job_application(app, resume.title if resume else None)


@router.delete("/{application_id}")
async def delete_application(
    application_id: str,
    userId: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_session),
):
    try:
        deleted = await repo.delete_job_application(session, application_id, userId)
    except SQLAlchemyError as e:
        raise _db_error(e)
    if not deleted:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"deleted": application_id}
