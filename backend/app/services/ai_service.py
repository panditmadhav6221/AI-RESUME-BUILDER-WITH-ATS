"""OpenRouter AI integration with structured outputs and guardrails.

- All AI endpoints parse & validate responses against Pydantic schemas.
- Model fallback chain: if the primary (often :free) model 429s / times out / 5xx,
  the next configured model is tried automatically.
- Anti-hallucination guardrails for /tailor-resume.
- Google XYZ formula + passive-phrase flagging for /improve-bullet.
"""

import asyncio
import json
import os
import re
from typing import Any, TypeVar

from openai import (
    APITimeoutError,
    APIStatusError,
    AsyncOpenAI,
    AuthenticationError,
    RateLimitError,
)
from pydantic import BaseModel, ValidationError

from app.schemas.resume import (
    CoverLetterResult,
    GenerateSummaryResult,
    ImproveBulletResult,
    InterviewPrepResult,
    InterviewQuestion,
    JDExtraction,
    OutreachResult,
    PassivePhraseFlag,
    RecruiterAuditResult,
    ResumeData,
    STARAnswer,
    SuggestSkillsResult,
    TailorResult,
)

T = TypeVar("T", bound=BaseModel)

client = AsyncOpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY", ""),
    base_url="https://openrouter.ai/api/v1",
    timeout=60.0,
    max_retries=0,
    default_headers={
        "HTTP-Referer": os.getenv("APP_URL", "https://localhost:3000"),
        "X-Title": "AI Resume Builder",
    },
)

PRIMARY_MODEL = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-chat-v3-0324:free")
DEFAULT_FALLBACKS = "meta-llama/llama-3.3-70b-instruct:free,google/gemini-2.0-flash-lite-preview-02-05:free"
raw_fallbacks = os.getenv("OPENROUTER_MODEL_FALLBACKS", DEFAULT_FALLBACKS)
FALLBACK_MODELS = [m.strip() for m in raw_fallbacks.split(",") if m.strip()]
MODELS = [PRIMARY_MODEL, *[m for m in FALLBACK_MODELS if m != PRIMARY_MODEL]]

# ---------------------------------------------------------------------------
# Low-level transport (kept separate so tests can monkeypatch it)
# ---------------------------------------------------------------------------


async def _per_model_completion(model: str, system: str, prompt: str, max_tokens: int = 4096, json_mode: bool = False):
    kwargs: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


async def _run_text(system: str, prompt: str, max_tokens: int = 4096) -> tuple[str, str]:
    """Call models in order; return (text, model_used). Raises on total failure."""
    last_error: Exception | None = None
    for i, model in enumerate(MODELS):
        try:
            text = await _per_model_completion(model, system, prompt, max_tokens=max_tokens)
            if text.strip():
                return text, model
            last_error = RuntimeError(f"Empty completion from {model}")
        except AuthenticationError:
            raise
        except (RateLimitError, APITimeoutError, APIStatusError, Exception) as e:  # noqa: PERF203
            last_error = e
            if i < len(MODELS) - 1:
                await asyncio.sleep(min(0.5 * (i + 1), 3))
    if isinstance(last_error, AuthenticationError):
        raise last_error
    raise last_error or RuntimeError("No AI model available")


def _extract_json(text: str) -> Any:
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip()
    cleaned = re.sub(r"```", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise


async def _run_json(system: str, prompt: str, model: type[T]) -> tuple[T, str]:
    """Request JSON, parse, then validate via Pydantic. Tries fallback models."""
    errors: list[str] = []
    for i, m in enumerate(MODELS):
        try:
            text = await _per_model_completion(m, system, prompt, max_tokens=4096, json_mode=True)
            data = _extract_json(text)
            return model.model_validate(data), m
        except AuthenticationError:
            raise
        except (RateLimitError, APITimeoutError, APIStatusError) as e:
            errors.append(f"{m}: {e}")
            if i < len(MODELS) - 1:
                await asyncio.sleep(min(0.5 * (i + 1), 3))
        except (json.JSONDecodeError, ValidationError, ValueError) as e:
            errors.append(f"{m}: schema/parse error ({e})")
            # Fall back to plain-text retry on the same model before switching.
            try:
                text = await _per_model_completion(m, system, prompt, max_tokens=4096, json_mode=False)
                data = _extract_json(text)
                return model.model_validate(data), m
            except (json.JSONDecodeError, ValidationError, ValueError):
                pass
    raise RuntimeError("AI returned no valid structured output: " + "; ".join(errors[:3]))


# ---------------------------------------------------------------------------
# Passive phrase detection + action verbs (Google XYZ formula)
# ---------------------------------------------------------------------------

PASSIVE_PHRASES: list[tuple[str, str]] = [
    ("responsible for", "Spearheaded"),
    ("helped with", "Drove"),
    ("worked on", "Delivered"),
    ("work on", "Build"),
    ("was responsible for", "Owned"),
    ("assisted with", "Supported"),
    ("in charge of", "Led"),
    ("duties included", "Executed"),
    ("tasked with", "Championed"),
    ("had to", "Achieved"),
    ("involved in", "Contributed to"),
    ("handled", "Managed"),
    ("made sure", "Ensured"),
    ("was tasked", "Owned"),
]

STRONG_ACTION_VERBS = (
    "Spearheaded, Optimized, Architected, Engineered, Led, Delivered, Drove, Built, "
    "Designed, Implemented, Launched, Scaled, Streamlined, Automated, Accelerated, "
    "Owned, Championed, Executed"
)


def flag_passive_phrases(bullet: str, role: str | None = None) -> list[PassivePhraseFlag]:
    flags: list[PassivePhraseFlag] = []
    lower = bullet.lower()
    for phrase, verb in PASSIVE_PHRASES:
        idx = lower.find(phrase)
        if idx != -1:
            flags.append(
                PassivePhraseFlag(
                    phrase=lower[idx : idx + len(phrase)],
                    suggestion=verb,
                    position=idx,
                )
            )
    return flags


# ---------------------------------------------------------------------------
# /api/ai/improve-bullet
# ---------------------------------------------------------------------------

IMPROVE_SYSTEM = """You are an expert resume coach and ATS optimization specialist.

Rewrite the given resume bullet point to follow the Google XYZ formula:

  "Accomplished [X] as measured by [Y], by doing [Z]"

Rules:
- Start with a strong action verb (avoid 'responsible for', 'helped with', 'worked on').
- Keep factual claims; NEVER invent metrics, numbers, tools, or technologies the user did not state.
- If the original bullet has no metric, phrase the "as measured by [Y]" part as the natural,
  believable outcome implied by the original text, or omit the metric rather than fabricate one.
- Output valid JSON only, using exactly these keys:
  {"improved": "<rewritten bullet>", "flags": [{"phrase": "<detected weak/passive phrase>",
   "suggestion": "<strong verb>"}], "note": "<short explanation, or empty string>"}
- "flags" must be empty when no weak phrases were present. Never include any text outside the JSON."""


async def improve_bullet_point(bullet: str, role: str | None = None) -> ImproveBulletResult:
    flags = flag_passive_phrases(bullet, role)
    prompt = f'Rewrite this resume bullet point following the Google XYZ formula. Preserve all client facts.\n\nBullet: "{bullet}"'
    if role:
        prompt += f"\n\nTarget role: {role}"
    prompt += "\n\nStrong action verbs to consider: " + STRONG_ACTION_VERBS

    try:
        parsed, used = await _run_json(IMPROVE_SYSTEM, prompt, _BulletSchema)
    except Exception:
        # Graceful local degradation when the model chain is unavailable.
        return ImproveBulletResult(
            original=bullet,
            improved=improve_bullet_point_locally(bullet, role),
            usedModel="local-fallback",
            flags=flags,
        )

    improved = (parsed.improved or "").strip()
    if not improved:
        raise RuntimeError("AI returned an empty rewritten bullet")

    # Merge locally detected flags with AI-reported flags (dedupe by phrase).
    merged: dict[str, PassivePhraseFlag] = {}
    for f in flags:
        merged[f.phrase] = f
    for f in parsed.flags:
        if f.phrase and f.phrase not in merged:
            merged[f.phrase] = PassivePhraseFlag(phrase=f.phrase, suggestion=f.suggestion or "Rewrite with a strong action verb")
    result = ImproveBulletResult(original=bullet, improved=improved, usedModel=used, flags=list(merged.values()))
    return result


class _BulletSchema(BaseModel):
    improved: str
    flags: list[PassivePhraseFlag] = []
    note: str = ""


# ---------------------------------------------------------------------------
# /api/ai/generate-summary
# ---------------------------------------------------------------------------

SUMMARY_SYSTEM = """You are an expert resume writer. Write a concise, achievement-oriented
professional summary (3-4 sentences). Use only facts present in the input. Do not invent
title history, employers, credentials, or metrics. Output valid JSON with key "summary"."""


async def generate_summary(raw_input: str, target_role: str | None = None) -> GenerateSummaryResult:
    prompt = f'Write a professional summary strictly based on this input:\n\n"{raw_input}"'
    if target_role:
        prompt += f"\n\nTarget role: {target_role}"
    prompt += '\n\nReturn JSON: {"summary": "<3-4 sentences>"}'
    parsed, used = await _run_json(SUMMARY_SYSTEM, prompt, _SummarySchema)
    if not parsed.summary.strip():
        raise RuntimeError("AI returned an empty summary")
    return GenerateSummaryResult(summary=parsed.summary.strip(), usedModel=used)


class _SummarySchema(BaseModel):
    summary: str


# ---------------------------------------------------------------------------
# /api/ai/suggest-skills
# ---------------------------------------------------------------------------

SKILLS_SYSTEM = """You are a career advisor. Return relevant skills for a role as a JSON object
with key "skills" (array of strings). Prefer canonical names and short, commonly searched
skill labels so ATS keyword matching works. Do not invent certifications."""


async def suggest_skills(target_role: str, current_skills: list[str] | None = None) -> SuggestSkillsResult:
    prompt = f'Suggest 10-15 relevant skills for a "{target_role}" position.'
    if current_skills:
        prompt += f"\n\nCurrent skills already listed (include/refine these if relevant): {', '.join(current_skills)}"
    prompt += '\n\nReturn JSON: {"skills": ["..."],'
    parsed, used = await _run_json(SKILLS_SYSTEM, prompt, _SkillsSchema)
    return SuggestSkillsResult(skills=[s for s in parsed.skills if s.strip()], usedModel=used)


class _SkillsSchema(BaseModel):
    skills: list[str] = []


# ---------------------------------------------------------------------------
# /api/ai/analyze-jd
# ---------------------------------------------------------------------------

JD_SYSTEM = """You are an ATS keyword-extraction specialist. Analyze the job description and
return a JSON object with exactly these keys:
  "requiredSkills": [..], "preferredSkills": [..], "keywords": [..],
  "hardSkills": [..], "softSkills": [..]
Split skills into hard (technologies, frameworks, tools, platforms) and soft
(methodologies, leadership, communication, agile, project management). Use canonical,
short skill labels."""


async def extract_jd_keywords(jd: str) -> tuple[JDExtraction, str]:
    parsed, used = await _run_json(JD_SYSTEM, f'Analyze this job description:\n\n"{jd}"', JDExtraction)
    return parsed, used


# ---------------------------------------------------------------------------
# /api/ai/tailor-resume  (anti-hallucination enforced)
# ---------------------------------------------------------------------------

TAILOR_SYSTEM = """You are an expert resume writer tailoring an existing resume to a job description.

STRICT RULES (violations are disqualifying):
1. DO NOT invent, add, or imply any technology, tool, framework, certification, company,
   school, degree, title, metric, or project that is NOT already present in the resume JSON.
2. You may only REPHRASE and REORDER the user's existing experience bullets, summary,
   projects, and skills to emphasize keywords from the job description.
3. Only surface a JD keyword as a skill if that skill already exists in the resume, or is an
   exact synonym (e.g. "React.js" -> "React", "K8s" -> "Kubernetes") of an existing skill.
4. Never change companies, positions, dates, institutions, degrees, or certifications.
5. Output valid JSON matching this exact shape and mirroring the input's key names:
   {
     "summary": "<rewritten summary or empty string>",
     "experience": [{"id": "<same as input>", "company": "<unchanged>", "position": "<unchanged>",
                     "location": "<same>", "startDate": "<same>", "endDate": "<same>",
                     "current": <same>, "bullets": ["<rephrased bullets only>"]}],
     "skills": [{"id": "<same-optional>", "name": "<existing or synonym only>"}]
   }
Return ONLY the JSON."""


async def tailor_full_resume(resume_json: dict, jd: str) -> TailorResult:
    original = ResumeData.model_validate(resume_json)

    original_companies = {e.company.strip().lower() for e in original.experience if e.company.strip()}
    original_institutions = {e.institution.strip().lower() for e in original.education if e.institution.strip()}
    original_skill_names = {s.name.strip().lower() for s in original.skills if s.name.strip()}
    _ = original_institutions

    prompt = f"""Tailor this resume to the job description below.

RESUME JSON:
{json.dumps(resume_json, indent=2, ensure_ascii=False)}

JOB DESCRIPTION:
"{jd}"
"""
    parsed, used = await _run_json(TAILOR_SYSTEM, prompt, _TailorSchema)

    warnings: list[str] = []
    # Factual entity layer is NEVER rewritten: restore contact, education, projects, certifications.
    tailored = original.model_copy(deep=True)
    tailored.summary = (parsed.summary or original.summary or "").strip() or original.summary

    # --- Experience: keep companies/positions/dates; only accept rephrased bullets ---
    orig_by_id = {e.id: e for e in original.experience}
    rebuilt_experience = []
    for ai_exp in parsed.experience:
        src = orig_by_id.get(ai_exp.id)
        if src is not None:
            if ai_exp.company.strip().lower() and ai_exp.company.strip().lower() not in original_companies:
                warnings.append(f'Removed fabricated company "{ai_exp.company}" from experience')
                ai_exp.company = src.company
            src.company = ai_exp.company
            if ai_exp.position:
                src.position = ai_exp.position
            src.bullets = [b for b in ai_exp.bullets if b.strip()] or src.bullets
            rebuilt_experience.append(src)
        else:
            # Model returned an entry with no id — only accept if company matches an original.
            if ai_exp.company.strip().lower() in original_companies:
                src = next((e for e in original.experience if e.company.strip().lower() == ai_exp.company.strip().lower()), None)
                if src is not None and ai_exp.bullets:
                    src.bullets = [b for b in ai_exp.bullets if b.strip()]
                    rebuilt_experience.append(src)
            else:
                warnings.append(f'Ignored invented experience entry "{ai_exp.company}"')
    # Preserve any original experiences the model dropped.
    used_src_ids = {e.id for e in rebuilt_experience}
    for e in original.experience:
        if e.id not in used_src_ids and e not in rebuilt_experience:
            rebuilt_experience.append(e)
    tailored.experience = rebuilt_experience

    # --- Skills: keep original only; the model may reorder or rename to synonyms ---
    accepted_skills = []
    for s in parsed.skills:
        name = s.name.strip()
        if not name:
            continue
        if name.lower() in original_skill_names or any(
            alias == name.lower() for alias in original_skill_names
        ):
            accepted_skills.append(s)
        else:
            warnings.append(f'Dropped skill "{name}" not present in the original resume (anti-hallucination)')

    final_skills: list[Any] = []
    seen: set[tuple[str, str]] = set()
    for s in list(original.skills) + accepted_skills:
        key = (s.id, s.name.strip().lower())
        if key not in seen:
            seen.add(key)
            final_skills.append(s)
    if len(final_skills) < len(original.skills):
        final_skills = list(original.skills)
    tailored.skills = final_skills

    return TailorResult(tailored=tailored, guardrailWarnings=warnings, usedModel=used)


class _TailorExperienceSchema(BaseModel):
    id: str = ""
    company: str = ""
    position: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    current: bool = False
    bullets: list[str] = []


class _TailorSkillSchema(BaseModel):
    id: str = ""
    name: str = ""


class _TailorSchema(BaseModel):
    summary: str = ""
    experience: list[_TailorExperienceSchema] = []
    skills: list[_TailorSkillSchema] = []


# ---------------------------------------------------------------------------
# Cover Letter Generator
# ---------------------------------------------------------------------------

COVER_LETTER_SYSTEM = """You are an elite executive career coach and cover letter writer.
Write a personalized, high-converting cover letter that bridges the candidate's verified achievements with the company's job requirements.
Return a valid JSON object matching this schema:
{
  "salutation": "Dear [Hiring Manager / Team Name],",
  "opening": "<Engaging hook stating candidate's value proposition and excitement for the role>",
  "bodyParagraphs": ["<Paragraph 1: Core achievements aligned with JD requirements>", "<Paragraph 2: Strategic problem solving and leadership/technical impact>"],
  "closing": "<Call to action requesting an interview to discuss how candidate will drive results>",
  "signoff": "Sincerely,\\n[Candidate Full Name]"
}
Do not invent experiences or facts not present in the candidate's resume."""


async def generate_cover_letter(
    resume: ResumeData,
    jd: str,
    company: str | None = None,
    role: str | None = None,
    tone: str = "professional",
) -> CoverLetterResult:
    target_role = role or (resume.experience[0].position if resume.experience else "Professional")
    company_name = company or "the Hiring Team"
    prompt = f"""Candidate Name: {resume.contact.fullName}
Target Role: {target_role}
Company: {company_name}
Tone: {tone}

Candidate Resume Summary:
{resume.summary}

Candidate Experience:
{json.dumps([e.model_dump() for e in resume.experience], indent=2)}

Candidate Skills:
{', '.join(s.name for s in resume.skills)}

Target Job Description:
{jd}

Generate a concise, impactful cover letter tailored to this specific job description."""

    parsed, used = await _run_json(COVER_LETTER_SYSTEM, prompt, _CoverLetterSchema)
    candidate_name = resume.contact.fullName or "Candidate"
    signoff = parsed.signoff.replace("[Candidate Full Name]", candidate_name)
    full_text = (
        f"{parsed.salutation}\n\n{parsed.opening}\n\n"
        + "\n\n".join(parsed.bodyParagraphs)
        + f"\n\n{parsed.closing}\n\n{signoff}"
    )
    return CoverLetterResult(
        salutation=parsed.salutation,
        opening=parsed.opening,
        bodyParagraphs=parsed.bodyParagraphs,
        closing=parsed.closing,
        signoff=signoff,
        fullText=full_text,
        usedModel=used,
    )


class _CoverLetterSchema(BaseModel):
    salutation: str = "Dear Hiring Manager,"
    opening: str = ""
    bodyParagraphs: list[str] = []
    closing: str = ""
    signoff: str = "Sincerely,"


# ---------------------------------------------------------------------------
# AI Interview Prep (STAR Method)
# ---------------------------------------------------------------------------

INTERVIEW_PREP_SYSTEM = """You are an executive hiring manager and technical interviewer.
Based on the candidate's resume and target job requirements, generate a targeted interview preparation guide.
Include:
- 3 Behavioral Questions tailored to the candidate's actual projects/roles with complete STAR (Situation, Task, Action, Result) model answers.
- 3 Technical/Domain Questions relevant to the role and tools on the resume.
- 3 Actionable tips for the candidate to stand out.
Return a valid JSON object matching this schema:
{
  "role": "<Target Role>",
  "questions": [
    {
      "id": "q1",
      "type": "behavioral",
      "question": "<Behavioral question>",
      "whyAsked": "<Why recruiters ask this>",
      "keyPointsToCover": ["Point 1", "Point 2"],
      "sampleStarAnswer": {
        "situation": "<Context from resume>",
        "task": "<Goal/Challenge>",
        "action": "<Specific steps taken>",
        "result": "<Quantified impact>"
      }
    }
  ],
  "generalTips": ["Tip 1", "Tip 2", "Tip 3"]
}"""


async def generate_interview_prep(
    resume: ResumeData,
    jd: str | None = None,
    role: str | None = None,
) -> InterviewPrepResult:
    target_role = role or (resume.experience[0].position if resume.experience else "Professional")
    prompt = f"""Candidate: {resume.contact.fullName}
Target Role: {target_role}

Candidate Experience & Projects:
{json.dumps([e.model_dump() for e in resume.experience], indent=2)}
Projects: {json.dumps([p.model_dump() for p in resume.projects], indent=2)}
Skills: {', '.join(s.name for s in resume.skills)}

Target Job Description (if provided):
{jd or "Standard industry requirements for " + target_role}

Generate the interview preparation guide with realistic STAR answers based on their resume."""

    parsed, used = await _run_json(INTERVIEW_PREP_SYSTEM, prompt, InterviewPrepResult)
    parsed.usedModel = used
    return parsed


# ---------------------------------------------------------------------------
# Raw Resume / LinkedIn Text Parser
# ---------------------------------------------------------------------------

PARSE_RESUME_SYSTEM = """You are an expert resume parsing specialist. Parse the provided raw resume or LinkedIn profile text into structured ResumeData JSON.
Extract:
- contact: fullName, email, phone, location, linkedin, website
- summary: professional summary string
- experience: array of { id, company, position, location, startDate, endDate, current, bullets: [string] }
- education: array of { id, institution, degree, field, startDate, endDate, gpa }
- skills: array of { id, name }
- projects: array of { id, name, description, url, technologies: [string] }
- certifications: array of { id, name, issuer, date, url }

Normalize dates to MM/YYYY format where possible (e.g. "06/2021"). Ensure bullets start with action verbs."""


async def parse_raw_resume_text(raw_text: str) -> tuple[ResumeData, str]:
    prompt = f"Parse this resume or LinkedIn text into structured ResumeData JSON:\n\n{raw_text}"
    parsed, used = await _run_json(PARSE_RESUME_SYSTEM, prompt, ResumeData)
    # Assign unique IDs if missing
    import random
    import string

    def _rand_id(p: str) -> str:
        return f"{p}-{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"

    for exp in parsed.experience:
        if not exp.id:
            exp.id = _rand_id("exp")
    for edu in parsed.education:
        if not edu.id:
            edu.id = _rand_id("edu")
    for sk in parsed.skills:
        if not sk.id:
            sk.id = _rand_id("sk")
    for pr in parsed.projects:
        if not pr.id:
            pr.id = _rand_id("pr")
    for cr in parsed.certifications:
        if not cr.id:
            cr.id = _rand_id("cr")

    return parsed, used


# ---------------------------------------------------------------------------
# Recruiter 6-Second Cold Read & Red Flag Audit
# ---------------------------------------------------------------------------

RECRUITER_AUDIT_SYSTEM = """You are a senior executive tech recruiter who has reviewed 50,000+ resumes.
Perform a 6-second scan on this candidate's resume and deliver a candid, highly actionable audit.
Return a valid JSON matching this schema:
{
  "firstImpression": "<What catches the recruiter's eye in the first 6 seconds>",
  "callbackProbability": <Integer score 0 to 100 representing probability of getting an interview callback>,
  "strengths": ["<Strength 1>", "<Strength 2>", "<Strength 3>"],
  "redFlags": ["<Red Flag 1 (e.g. passive verbs, unquantified bullets, buzzwords, dense formatting)>", "<Red Flag 2>"],
  "top3Fixes": ["<Immediate actionable fix 1 to double callback rate>", "<Immediate actionable fix 2>", "<Immediate actionable fix 3>"],
  "executiveVerdict": "<1-2 sentence overall hiring manager verdict>"
}"""


async def generate_recruiter_audit(
    resume: ResumeData,
    target_role: str | None = None,
) -> RecruiterAuditResult:
    role_str = target_role or (resume.experience[0].position if resume.experience else "Professional")
    prompt = f"""Candidate: {resume.contact.fullName}
Target Role: {role_str}

Resume Content:
Summary: {resume.summary}
Experience: {json.dumps([e.model_dump() for e in resume.experience], indent=2)}
Education: {json.dumps([e.model_dump() for e in resume.education], indent=2)}
Skills: {', '.join(s.name for s in resume.skills)}

Conduct a brutally honest 6-second recruiter cold read audit."""

    parsed, used = await _run_json(RECRUITER_AUDIT_SYSTEM, prompt, RecruiterAuditResult)
    parsed.usedModel = used
    return parsed


# ---------------------------------------------------------------------------
# LinkedIn Outreach & Cold Networking Generator
# ---------------------------------------------------------------------------

OUTREACH_SYSTEM = """You are an elite career networking coach.
Generate 4 highly persuasive, non-spammy networking messages to help the candidate connect with decision makers and bypass ATS filters.
Return a valid JSON matching this schema:
{
  "connectionNote": "<Personalized LinkedIn connection note STRICTLY UNDER 280 CHARACTERS including spaces>",
  "coldEmailSubject": "<High-open-rate subject line with specific hook>",
  "coldEmailBody": "<Concise 3-paragraph cold email focusing on value proposition and a low-friction question>",
  "referralRequest": "<Warm, polite message requesting an internal referral from an alumni or peer>",
  "followUpNote": "<Short, polite 4-day follow-up message if no response received>"
}
Do not exceed 280 characters for the connectionNote!"""


async def generate_outreach_messages(
    resume: ResumeData,
    company: str,
    role: str,
    contact_type: str = "hiring_manager",
    jd: str | None = None,
) -> OutreachResult:
    prompt = f"""Candidate Name: {resume.contact.fullName}
Target Company: {company}
Target Role: {role}
Target Contact Type: {contact_type}

Candidate Top Highlights:
Summary: {resume.summary}
Key Experience: {resume.experience[0].company if resume.experience else ""} ({resume.experience[0].position if resume.experience else ""})
Top Bullets: {resume.experience[0].bullets[:2] if resume.experience else []}
Skills: {', '.join(s.name for s in resume.skills[:6])}

Target Job Details:
{jd or "Looking for a top tier " + role + " to join " + company}

Generate compelling, high-converting networking messages."""

    parsed, used = await _run_json(OUTREACH_SYSTEM, prompt, OutreachResult)
    parsed.usedModel = used
    return parsed



# ---------------------------------------------------------------------------
# Local degrade path (used when every model/network path fails)
# ---------------------------------------------------------------------------


def improve_bullet_point_locally(bullet: str, role: str | None = None) -> str:
    """Instant, no-network fallback: strip passive phrases and prefix a strong verb."""
    out = bullet.strip()
    low = out.lower()
    for phrase, verb in PASSIVE_PHRASES:
        idx = low.find(phrase)
        if idx != -1:
            out = f"{out[:idx].rstrip()} {verb} ".strip() + out[idx + len(phrase):].lstrip()
            if out and out[0].islower():
                out = out[0].upper() + out[1:]
            return out.strip()
    return out