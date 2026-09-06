import asyncio

import httpx
import pytest
from openai import RateLimitError

from app.schemas.resume import ResumeData
from app.services import ai_service
from app.services.skill_synonyms import (
    canonical_skill,
    categorize_skill,
    match_skill_in_text,
)
from app.services.ats_scorer import normalize_date, detect_nonstandard_headers


def run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ---------------------------------------------------------------------------
# Skill semantics
# ---------------------------------------------------------------------------


def test_synonym_canonicalization():
    assert canonical_skill("React.js") == "React"
    assert canonical_skill("K8s") == "Kubernetes"
    assert canonical_skill("Postgres") == "PostgreSQL"


def test_skill_categorization():
    assert categorize_skill("React") == "hard"
    assert categorize_skill("Kubernetes") == "hard"
    assert categorize_skill("Communication") == "soft"
    assert categorize_skill("Something Random 123") == "uncategorized"


def test_match_skill_in_text_with_alias():
    text = "I used React.js and K8s at work."
    assert match_skill_in_text("React", text)
    assert match_skill_in_text("Kubernetes", text)
    assert match_skill_in_text("PostgreSQL", "Postgres is my main db")
    assert not match_skill_in_text("PostgreSQL", "MongoDB is my main db")



# ---------------------------------------------------------------------------
# ATS date & header checks
# ---------------------------------------------------------------------------


def test_date_format_standardizer():
    assert normalize_date("06/2022")["status"] == "valid"
    assert normalize_date("June 2022")["status"] == "valid"
    assert normalize_date("2022")["status"] == "year_only"
    assert normalize_date("June22")["status"] == "invalid"
    assert normalize_date("")["status"] == "empty"


def test_nonstandard_header_detection():
    offenders = detect_nonstandard_headers(
        "SUMMARY\nExperienced.\nTEACHING EXPERIENCE\nTaught classes.\nMy Hobbies\nRunning.",
        ["Summary"],
    )
    assert "TEACHING EXPERIENCE" in offenders
    assert "My Hobbies" in offenders
    assert "SUMMARY" not in offenders


# ---------------------------------------------------------------------------
# AI structured output + guardrails (model is mocked)
# ---------------------------------------------------------------------------


def test_improve_bullet_structured_output_and_flags(monkeypatch):
    improved_text = "Achieved a 20% reduction in support tickets by automating triage workflows."

    async def fake_completion(model, system, prompt, max_tokens=4096, json_mode=False):
        return f'{{"improved": "{improved_text}", "flags": [{{"phrase": "worked on", "suggestion": "Delivered"}}], "note": "ok"}}'

    monkeypatch.setattr(ai_service, "_per_model_completion", fake_completion)

    result = run(ai_service.improve_bullet_point("Worked on support tickets", "Support Engineer"))
    assert result.improved == improved_text
    assert result.usedModel != ""
    # Local passive-phrase detection should flag the weak phrase too.
    assert any("worked on" in f.phrase for f in result.flags)


def test_improve_bullet_local_fallback(monkeypatch):
    async def failing_completion(model, system, prompt, max_tokens=4096, json_mode=False):
        raise RuntimeError("all networks down")

    monkeypatch.setattr(ai_service, "_per_model_completion", failing_completion)

    result = run(ai_service.improve_bullet_point("Responsible for support tickets", "Support Engineer"))
    assert result.usedModel == "local-fallback"
    assert "responsible for" not in result.improved.lower()


def test_tailor_resume_anti_hallucination(monkeypatch):
    resume_in = ResumeData(
        contact={"fullName": "Jane Doe", "email": "jane@example.com"},
        summary="Ops engineer.",
        experience=[
            {
                "id": "e1",
                "company": "Acme Inc",
                "position": "Engineer",
                "location": "Remote",
                "startDate": "01/2021",
                "endDate": "01/2024",
                "bullets": ["Reduced incidents"],
            }
        ],
        education=[{"id": "ed1", "institution": "State University", "degree": "BS", "field": "CS"}],
        skills=[{"name": "Python"}, {"name": "AWS"}],
        projects=[{"id": "p1", "name": "Monitoring", "description": "Built dashboards", "technologies": ["Grafana"]}],
        certifications=[{"id": "c1", "name": "AWS SA", "issuer": "AWS", "date": "2023"}],
    )

    # Model hallucinates a company + a new skill; both must be rejected.
    async def fake_completion(model, system, prompt, max_tokens=4096, json_mode=False):
        return '{"summary": "Ops engineer with 5 years experience.", "experience": [{"id": "e1", "company": "FakeCorp", "position": "Principal", "startDate": "01/2021", "endDate": "01/2024", "current": false, "bullets": ["Cut incidents by 40%"]}], "skills": [{"name": "Kubernetes"}]}'

    monkeypatch.setattr(ai_service, "_per_model_completion", fake_completion)

    result = run(ai_service.tailor_full_resume(resume_in.model_dump(), "Senior DevOps, Kubernetes, incident management"))

    tailored = result.tailored
    # Contact / education / projects / certs never rewritten.
    assert tailored.contact.fullName == "Jane Doe"
    assert tailored.education[0].institution == "State University"
    assert tailored.projects[0].name == "Monitoring"
    # Fabricated company rejected, original restored.
    assert tailored.experience[0].company == "Acme Inc"
    assert any("FakeCorp" in w for w in result.guardrailWarnings)
    # Fabricated skill rejected.
    assert all(s.name != "Kubernetes" for s in tailored.skills)
    assert any("Kubernetes" in w for w in result.guardrailWarnings)


def test_model_fallback_chain(monkeypatch):
    calls: list[str] = []

    def build_err():
        return RateLimitError(
            message="rate limited",
            response=httpx.Response(429, request=httpx.Request("POST", "http://x")),
            body={},
        )

    async def flaky_completion(model, system, prompt, max_tokens=4096, json_mode=False):
        calls.append(model)
        if model == "primary-model":
            raise build_err()
        return '{"summary": "ok summary from fallback."}'

    monkeypatch.setattr(ai_service, "MODELS", ["primary-model", "fallback-model"])
    monkeypatch.setattr(ai_service, "_per_model_completion", flaky_completion)

    result = run(ai_service.generate_summary("raw input", None))
    assert calls == ["primary-model", "fallback-model"]
    assert result.summary == "ok summary from fallback."
    assert result.usedModel == "fallback-model"