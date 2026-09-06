from app.services.ats_scorer import analyze_ats_score, analyze_ats_score_from_text
from app.schemas.resume import ResumeData


def test_perfect_resume_scores_high():
    data = ResumeData(
        contact={"fullName": "John Doe", "email": "john@example.com", "phone": "1234567890"},
        summary="Experienced software engineer with 5 years of backend development.",
        experience=[
            {
                "company": "Acme",
                "position": "Engineer",
                "startDate": "2020",
                "endDate": "2023",
                "bullets": ["Built a service used by 10k users", "Improved response time by 30%"],
            }
        ],
        education=[{"institution": "MIT", "degree": "BS", "field": "CS"}],
        skills=[{"name": "Python"}, {"name": "FastAPI"}],
    )
    result = analyze_ats_score(data)
    assert result.score >= 90
    assert any("Quantified achievements present" in c for c in result.passedChecks)


def test_empty_resume_scores_low():
    result = analyze_ats_score(ResumeData())
    assert result.score < 60
    assert len(result.issues) > 0


def test_text_scoring_with_layout_flags():
    text = "Summary\nExperienced developer.\nExperience\nWorked at Acme.\nEducation\nMIT.\nSkills\nPython.\nProjects\nThing.\nCertifications\nNone.\n" * 3
    detected = ["Summary", "Experience", "Education", "Skills", "Projects", "Certifications"]
    clean = analyze_ats_score_from_text(text, detected, has_tables=False, single_column=True)
    assert any("No tables detected" in c for c in clean.passedChecks)
    assert any("Single column layout" in c for c in clean.passedChecks)

    table = analyze_ats_score_from_text(text, detected, has_tables=True, single_column=False)
    assert any("Tables detected" in i.message for i in table.issues)
    assert any("Multi-column layout detected" in i.message for i in table.issues)


def test_text_scoring_without_layout_info_omits_claims():
    text = "Summary\nExperienced developer.\nExperience\nWorked at Acme.\nEducation\nMIT.\nSkills\nPython.\nProjects\nThing.\nCertifications\nNone.\n" * 3
    detected = ["Summary", "Experience", "Education", "Skills", "Projects", "Certifications"]
    result = analyze_ats_score_from_text(text, detected)
    assert not any("No tables detected" in c for c in result.passedChecks)
    assert not any("Single column layout" in c for c in result.passedChecks)