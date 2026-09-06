from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import resume as repo
from app.schemas.resume import (
    CloneResumeRequest,
    InsertKeywordsRequest,
    SaveResumeRequest,
    UpdateResumeRequest,
)

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

DATABASE_DOWN_DETAIL = (
    "Database is not available. Set DATABASE_URL to your Supabase Postgres URL, or "
    "run locally with the built-in SQLite fallback (see backend/.env.example)."
)


def _db_error(e: Exception) -> HTTPException:
    return HTTPException(status_code=503, detail=DATABASE_DOWN_DETAIL)


def _require_resume(resume: dict | None) -> dict:
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.post("")
async def save_resume(req: SaveResumeRequest, session: AsyncSession = Depends(get_session)):
    if not req.userId:
        raise HTTPException(status_code=400, detail="userId is required")
    try:
        doc = await repo.create_resume(
            session=session,
            user_id=req.userId,
            data=req.data.model_dump(),
            title=req.title,
            template=req.template,
            target_role=req.targetRole,
        )
    except SQLAlchemyError as e:
        raise _db_error(e)
    return repo.serialize_resume(doc, req.data.model_dump())


@router.get("")
async def get_user_resumes(
    userId: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_session),
):
    try:
        return await repo.list_resumes(session, userId)
    except SQLAlchemyError as e:
        raise _db_error(e)


@router.get("/{resume_id}")
async def get_single_resume(
    resume_id: str,
    userId: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_session),
):
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required to verify ownership")
    try:
        doc = await repo.get_resume_with_data(session, resume_id, userId)
    except SQLAlchemyError as e:
        raise _db_error(e)
    return _require_resume(doc)


@router.put("/{resume_id}")
async def update_single_resume(
    resume_id: str,
    req: UpdateResumeRequest,
    session: AsyncSession = Depends(get_session),
):
    if not req.userId:
        raise HTTPException(status_code=400, detail="userId is required to verify ownership")
    patch: dict = {}
    if req.title is not None:
        patch["title"] = req.title
    if req.template is not None:
        patch["template"] = req.template
    if req.score is not None:
        patch["score"] = req.score
    if req.targetRole is not None:
        patch["target_role"] = req.targetRole
    if req.data is not None:
        patch["data"] = req.data.model_dump()
    if not patch:
        raise HTTPException(status_code=400, detail="Nothing to update")
    try:
        doc = await repo.update_resume(session, resume_id, req.userId, patch)
    except SQLAlchemyError as e:
        raise _db_error(e)
    return _require_resume(doc)


@router.delete("/{resume_id}")
async def delete_single_resume(
    resume_id: str,
    userId: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_session),
):
    try:
        deleted = await repo.delete_resume(session, resume_id, userId)
    except SQLAlchemyError as e:
        raise _db_error(e)
    if not deleted:
        # Distinguish "not found" from "not owned" for security purposes without
        # leaking which resumes exist for other users.
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"deleted": resume_id}


@router.post("/{resume_id}/clone")
async def clone_resume(
    resume_id: str,
    req: CloneResumeRequest,
    session: AsyncSession = Depends(get_session),
):
    """Create a tailored variant of an existing resume (owned by the same user).

    The copy records `parent_id` so variants can be traced back to the source.
    """
    if not req.userId:
        raise HTTPException(status_code=400, detail="userId is required")
    source = await repo.get_resume_with_data(session, resume_id, req.userId)
    _require_resume(source)
    if not source.get("data"):
        raise HTTPException(status_code=400, detail="Source resume has no data to clone")
    try:
        clone = await repo.create_resume(
            session=session,
            user_id=req.userId,
            data=source["data"],
            title=req.title or f"{source['title']} (variant)",
            template=source.get("template", "modern"),
            target_role=req.targetRole or source.get("targetRole"),
            parent_id=source["id"],
        )
    except SQLAlchemyError as e:
        raise _db_error(e)
    return {**repo.serialize_resume(clone), "data": source["data"]}


@router.post("/{resume_id}/insert-keywords")
async def insert_keywords(
    resume_id: str,
    req: InsertKeywordsRequest,
    session: AsyncSession = Depends(get_session),
):
    """One-click insertion of missing JD keywords into a resume's skills/summary."""
    if not req.userId:
        raise HTTPException(status_code=400, detail="userId is required")
    doc = await repo.get_resume_with_data(session, resume_id, req.userId)
    _require_resume(doc)
    data = doc.get("data") or {}
    keywords = [k.strip() for k in req.keywords if k and k.strip()]

    if req.targetSection == "skills":
        existing = [s.get("name", "").strip().lower() for s in data.get("skills", [])]
        added = []
        for kw in keywords:
            if kw.lower() not in existing:
                data.setdefault("skills", []).append({"id": "", "name": kw})
                existing.append(kw.lower())
                added.append(kw)
    elif req.targetSection == "summary":
        added = [kw for kw in keywords if kw.lower() not in (data.get("summary") or "").lower()]
        if added:
            suffix = ", ".join(added)
            data["summary"] = f"{data.get('summary', '').rstrip()} Core strengths include: {suffix}."
    else:
        raise HTTPException(status_code=400, detail="targetSection must be 'skills' or 'summary'")

    if not added:
        return {**doc, "insertedKeywords": [], "message": "All keywords already present."}

    updated = await repo.update_resume(session, resume_id, req.userId, {"data": data})
    _require_resume(updated)
    return {**updated, "insertedKeywords": added, "message": f"Inserted {len(added)} keyword(s)."}