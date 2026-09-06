"""Regression tests for persisting ATS scans and job-description analyses.

Issue 5: /api/ats/score and /api/ai/analyze-jd now save rows to the ats_scans
and job_descriptions tables when the client opts in via resumeId/userId.
Persistence failure must never block the endpoint response.
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.services import ai_service
from conftest import unique_user_id

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _fetch(db_engine, sql: str):
    async_session = async_sessionmaker(db_engine, expire_on_commit=False)
    async with async_session() as session:
        return (await session.execute(text(sql))).fetchall()


def _no_jd_payload(user_id: str) -> dict:
    return {
        "contact": {"fullName": "Casey Kim", "email": "casey@example.com", "phone": ""},
        "summary": "",
        "experience": [],
        "education": [],
        "skills": [],
        "projects": [],
        "certifications": [],
    }


# ---------------------------------------------------------------------------
# ats_scans persistence
# ---------------------------------------------------------------------------


def test_ats_score_persists_scan_when_resume_id_given(client, db_engine):
    uid = unique_user_id("ats-scan")
    created = client.post("/api/resumes", json={"userId": uid, "title": "T", "data": _no_jd_payload(uid)})
    assert created.status_code == 200
    resume_id = created.json()["id"]

    res = client.post("/api/ats/score", json={"resumeData": _no_jd_payload(uid), "resumeId": resume_id})
    assert res.status_code == 200
    score = res.json()["score"]

    rows = _run(_fetch(db_engine, f"SELECT resume_id, score FROM ats_scans WHERE resume_id = '{resume_id}'"))
    assert len(rows) == 1
    assert rows[0][0] == resume_id
    assert rows[0][1] == score


def test_ats_score_without_resume_id_returns_score_without_persisting(client, db_engine):
    uid = unique_user_id("ats-nopersist")
    before = _run(_fetch(db_engine, "SELECT COUNT(*) FROM ats_scans"))[0][0]
    res = client.post("/api/ats/score", json={"resumeData": _no_jd_payload(uid)})
    assert res.status_code == 200
    assert "score" in res.json()
    after = _run(_fetch(db_engine, "SELECT COUNT(*) FROM ats_scans"))[0][0]
    assert after == before


# ---------------------------------------------------------------------------
# job_descriptions persistence
# ---------------------------------------------------------------------------


def test_analyze_jd_persists_job_description_when_user_id_given(client, db_engine, monkeypatch):
    async def fake_extract(jd: str):
        from app.schemas.resume import JDExtraction

        return (
            JDExtraction(
                requiredSkills=["Kubernetes", "Terraform"],
                preferredSkills=["CI/CD"],
                keywords=["Kubernetes", "Docker"],
                hardSkills=["Kubernetes", "Terraform"],
                softSkills=[],
            ),
            "fake-model",
        )

    monkeypatch.setattr(ai_service, "extract_jd_keywords", fake_extract)
    uid = unique_user_id("jd-scan")

    res = client.post(
        "/api/ai/analyze-jd",
        json={
            "jd": "Needs Kubernetes, Terraform and CI/CD experience.",
            "userId": uid,
            "targetRole": "DevOps Engineer",
        },
    )
    assert res.status_code == 200
    assert res.json()["matchPercentage"] >= 0

    rows = _run(_fetch(db_engine, f"SELECT user_id, target_role FROM job_descriptions WHERE user_id = '{uid}'"))
    assert len(rows) == 1
    assert rows[0][0] == uid
    assert rows[0][1] == "DevOps Engineer"


def test_analyze_jd_without_user_id_does_not_persist(client, db_engine, monkeypatch):
    async def fake_extract(jd: str):
        from app.schemas.resume import JDExtraction

        return (JDExtraction(requiredSkills=["Docker"], keywords=["Docker"]), "fake-model")

    monkeypatch.setattr(ai_service, "extract_jd_keywords", fake_extract)

    before = _run(_fetch(db_engine, "SELECT COUNT(*) FROM job_descriptions"))[0][0]
    res = client.post(
        "/api/ai/analyze-jd",
        json={"jd": "Docker experience needed.", "resumeText": "Wrote Dockerfiles"},
    )
    assert res.status_code == 200
    after = _run(_fetch(db_engine, "SELECT COUNT(*) FROM job_descriptions"))[0][0]
    assert after == before