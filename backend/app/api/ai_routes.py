import json
from fastapi import APIRouter, Depends, HTTPException
from openai import AuthenticationError, RateLimitError, APIStatusError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import resume as repo
from app.schemas.resume import (
    ImproveBulletRequest,
    GenerateSummaryRequest,
    SuggestSkillsRequest,
    TailorResumeRequest,
    AnalyzeJDRequest,
    JDAnalysis,
    SkillMatch,
    GenerateCoverLetterRequest,
    InterviewPrepRequest,
    ParseRawResumeRequest,
    RecruiterAuditRequest,
    GenerateOutreachRequest,
)
from app.services import ai_service
from app.services.skill_synonyms import (
    canonical_skill,
    categorize_skill,
    match_skill_in_text,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _ai_error(e: Exception) -> HTTPException:
    if isinstance(e, AuthenticationError):
        return HTTPException(
            status_code=401,
            detail="Invalid or missing OPENROUTER_API_KEY. Get a free key at https://openrouter.ai/keys and add it to backend/.env.",
        )
    if isinstance(e, RateLimitError):
        code = getattr(e, "code", None) or (e.body or {}).get("code", "") if isinstance(e.body, dict) else getattr(e, "code", None)
        if code == "insufficient_quota" or "no credits" in str(getattr(e, "body", "")).lower():
            return HTTPException(
                status_code=402,
                detail="No credits on your OpenRouter account. Free models work with $0 balance, or add credits at https://openrouter.ai/settings/credits",
            )
        return HTTPException(status_code=429, detail="AI rate limit reached. Please try again in a moment.")
    if isinstance(e, APIStatusError):
        return HTTPException(status_code=e.status_code, detail=f"AI service error: {e.message}")
    if isinstance(e, json.JSONDecodeError):
        return HTTPException(status_code=502, detail="AI returned invalid JSON. Please try again.")
    return HTTPException(status_code=500, detail=f"AI service error: {e}")


@router.post("/improve-bullet")
async def improve_bullet(req: ImproveBulletRequest):
    if not req.bullet:
        raise HTTPException(status_code=400, detail="Bullet point text is required")
    try:
        result = await ai_service.improve_bullet_point(req.bullet, req.role)
    except Exception as e:
        raise _ai_error(e)
    return result.model_dump()


@router.post("/generate-summary")
async def generate_summary(req: GenerateSummaryRequest):
    if not req.input:
        raise HTTPException(status_code=400, detail="Input text is required")
    try:
        result = await ai_service.generate_summary(req.input, req.targetRole)
    except Exception as e:
        raise _ai_error(e)
    return result.model_dump()


@router.post("/suggest-skills")
async def suggest_skills(req: SuggestSkillsRequest):
    if not req.targetRole:
        raise HTTPException(status_code=400, detail="Target role is required")
    try:
        result = await ai_service.suggest_skills(req.targetRole, req.currentSkills)
    except Exception as e:
        raise _ai_error(e)
    return result.model_dump()


@router.post("/tailor-resume")
async def tailor_resume(req: TailorResumeRequest):
    if not req.resumeJson or not req.jd:
        raise HTTPException(status_code=400, detail="Resume and job description are required")
    try:
        result = await ai_service.tailor_full_resume(req.resumeJson, req.jd)
    except Exception as e:
        raise _ai_error(e)
    return result.model_dump()


@router.post("/analyze-jd")
async def analyze_jd(req: AnalyzeJDRequest, session: AsyncSession = Depends(get_session)):
    if not req.jd:
        raise HTTPException(status_code=400, detail="Job description is required")

    try:
        extraction, _used = await ai_service.extract_jd_keywords(req.jd)
    except Exception as e:
        raise _ai_error(e)

    if req.userId:
        try:
            await repo.save_job_description(
                session=session,
                user_id=req.userId,
                raw_text=req.jd,
                parsed_skills=extraction.model_dump(),
                target_role=req.targetRole,
            )
        except Exception:
            pass  # Persistence error should not block returning the analysis.

    # Dedupe while preserving order, then semantically match against the resume.
    all_skills: list[str] = []
    for s in extraction.requiredSkills + extraction.preferredSkills:
        key = canonical_skill(s).lower()
        if all(key != canonical_skill(x).lower() for x in all_skills):
            all_skills.append(s)

    resume_text = (req.resumeText or "").lower()
    matched_skills: list[SkillMatch] = []
    missing_skills: list[SkillMatch] = []

    for skill in all_skills:
        matched = match_skill_in_text(skill, resume_text) if resume_text else False
        canonical = canonical_skill(skill)
        category = categorize_skill(canonical)
        item = SkillMatch(name=skill, matched=matched, category=category)
        (matched_skills if matched else missing_skills).append(item)

    total = max(len(all_skills), 1)
    match_pct = round((len(matched_skills) / total) * 100)

    from app.services.skill_synonyms import CANONICAL_SKILL_HINTS

    suggestions = [
        f'Click "Add" to insert "{s.name}" into your Skills section if you have experience with it.'
        for s in missing_skills[:5]
    ]
    if not missing_skills and all_skills:
        suggestions.append("Your resume covers the JD keywords. Keep the wording ATS-friendly.")

    analysis = JDAnalysis(
        matchedSkills=matched_skills,
        missingSkills=missing_skills,
        matchPercentage=match_pct,
        keywords=list(dict.fromkeys(extraction.keywords + extraction.hardSkills + extraction.softSkills)),
        suggestions=suggestions,
    )
    return analysis.model_dump()


@router.post("/generate-cover-letter")
async def generate_cover_letter(req: GenerateCoverLetterRequest):
    if not req.jobDescription:
        raise HTTPException(status_code=400, detail="Job description is required")
    try:
        result = await ai_service.generate_cover_letter(
            resume=req.resumeData,
            jd=req.jobDescription,
            company=req.companyName,
            role=req.targetRole,
            tone=req.tone,
        )
    except Exception as e:
        raise _ai_error(e)
    return result.model_dump()


@router.post("/interview-prep")
async def interview_prep(req: InterviewPrepRequest):
    try:
        result = await ai_service.generate_interview_prep(
            resume=req.resumeData,
            jd=req.jobDescription,
            role=req.targetRole,
        )
    except Exception as e:
        raise _ai_error(e)
    return result.model_dump()


@router.post("/parse-raw-resume")
async def parse_raw_resume(req: ParseRawResumeRequest):
    if not req.rawText or not req.rawText.strip():
        raise HTTPException(status_code=400, detail="Raw resume text is required")
    try:
        parsed_resume, _used = await ai_service.parse_raw_resume_text(req.rawText)
    except Exception as e:
        raise _ai_error(e)
    return parsed_resume.model_dump()


@router.post("/recruiter-audit")
async def recruiter_audit(req: RecruiterAuditRequest):
    try:
        result = await ai_service.generate_recruiter_audit(
            resume=req.resumeData,
            target_role=req.targetRole,
        )
    except Exception as e:
        raise _ai_error(e)
    return result.model_dump()


@router.post("/generate-outreach")
async def generate_outreach(req: GenerateOutreachRequest):
    if not req.companyName or not req.targetRole:
        raise HTTPException(status_code=400, detail="Company name and target role are required")
    try:
        result = await ai_service.generate_outreach_messages(
            resume=req.resumeData,
            company=req.companyName,
            role=req.targetRole,
            contact_type=req.contactType,
            jd=req.jobDescription,
        )
    except Exception as e:
        raise _ai_error(e)
    return result.model_dump()