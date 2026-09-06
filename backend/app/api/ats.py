from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import resume as repo
from app.schemas.resume import ATSScoreRequest
from app.services.ats_scorer import analyze_ats_score

router = APIRouter(prefix="/api/ats", tags=["ats"])


@router.post("/score")
async def score_resume(req: ATSScoreRequest, session: AsyncSession = Depends(get_session)):
    analysis = analyze_ats_score(req.resumeData)

    if req.resumeId:
        try:
            await repo.create_ats_scan(
                session=session,
                resume_id=req.resumeId,
                score=analysis.score,
                matched_keywords=analysis.passedChecks,
                missing_keywords=[i.message for i in analysis.issues if i.severity == "error"],
                suggestions=[i.fix for i in analysis.issues],
            )
        except Exception:
            pass  # Persistence error should not block returning the score.

    return analysis.model_dump()