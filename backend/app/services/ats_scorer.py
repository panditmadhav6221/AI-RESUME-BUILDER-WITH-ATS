import random
import re
import string
from app.schemas.resume import ATSAnalysis, ATSIssue, ResumeData

STANDARD_SECTIONS = ["Experience", "Education", "Skills", "Summary", "Projects", "Certifications"]

# Canonical headings the ATS parser recognizes; anything heading-like that is
# NOT one of these is flagged as a non-standard header.
STANDARD_HEADINGS = {
    "summary",
    "professional summary",
    "profile",
    "experience",
    "work experience",
    "employment",
    "work history",
    "education",
    "academic background",
    "skills",
    "technical skills",
    "core competencies",
    "projects",
    "personal projects",
    "professional projects",
    "certifications",
    "certificates",
    "licenses",
    "publications",
    "awards",
    "honors",
    "volunteer",
    "volunteering",
    "volunteer experience",
    "languages",
    "interests",
}

_MONTH_NAMES = (
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
)

DATE_FORMAT_PATTERN = re.compile(
    r"^(?:"                                        # either...
    r"(?P<m>\d{1,2})[/\\-](?P<y>\d{4})"            # MM/YYYY, M-YYYY
    r"|(?P<mn>[a-zA-Z]+)\.?\s+(?P<yn>\d{4})"       # Month YYYY / Mon. YYYY
    r"|(?P<yr>\d{4}))$",                      # bare year
    re.IGNORECASE,
)

HEADING_LIKE_LINE = re.compile(r"^[A-Z0-9][A-Za-z0-9 .\-&()/'+]+$")


def _generate_id() -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))


# ---------------------------------------------------------------------------
# Header & date standardizers (Step 3.3)
# ---------------------------------------------------------------------------


def normalize_date(value: str) -> dict:
    """Validate a resume date string. Returns status + recommended format."""
    value = (value or "").strip()
    if not value:
        return {"status": "empty", "recommended": ""}
    match = DATE_FORMAT_PATTERN.match(value)
    if match and match.group("m") and match.group("y"):
        return {"status": "valid", "recommended": f"{int(match.group('m')):02d}/{match.group('y')}"}
    if match and match.group("mn") and match.group("yn"):
        month = match.group("mn").strip(".").lower()
        if month in _MONTH_NAMES or month[:3] in _MONTH_NAMES:
            return {"status": "valid", "recommended": f"{month[:3].title()} {match.group('yn')}"}
        return {"status": "invalid", "recommended": "MM/YYYY"}
    if match and match.group("yr"):
        return {"status": "year_only", "recommended": "MM/YYYY"}
    return {"status": "invalid", "recommended": "MM/YYYY"}


def check_dates(dates: list[str], category: str) -> tuple[int, list[ATSIssue]]:
    """Returns (deduction, issues) for irregular formats. Skips empty values."""
    deduction = 0
    issues: list[ATSIssue] = []
    for value in dates:
        info = normalize_date(value)
        if info["status"] == "empty":
            continue
        if info["status"] in ("invalid", "year_only"):
            issues.append(ATSIssue(
                id=_generate_id(), severity="warning", category=category,
                message=f'Date "{value}" is not in a standard format (use MM/YYYY or Month YYYY, e.g. "06/2022" or "June 2022")',
                fix=f'Change to "{info["recommended"]}" so ATS parsers date-shift correctly',
            ))
            # Only deduct once per category bucket to avoid double-penalizing.
            if not any(i.category == category and "irregular date" in i.message for i in issues[1:]):
                pass
            deduction = max(deduction, 5)
    return deduction, issues


def detect_nonstandard_headers(text: str, detected_sections: list[str]) -> list[str]:
    """Heuristic scan for heading-like lines that are not standard resume headers."""
    offenders: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or len(stripped) > 50:
            continue
        if stripped.endswith((".", "!", "?", ",")):
            continue
        if stripped.lower() in STANDARD_HEADINGS:
            continue
        if any(s.lower() == stripped.lower() for s in detected_sections):
            continue
        if not HEADING_LIKE_LINE.match(stripped):
            continue
        # Require heading-ish shape: all-caps, or mostly capitalized words, or ends with ':'
        words = stripped.split()
        if len(words) < 2:
            continue
        all_caps = stripped == stripped.upper() and len(stripped) > 3
        title_case = all(w[:1].isupper() for w in words if w[:1].isalpha())
        if all_caps or title_case or stripped.rstrip().endswith(":"):
            offenders.append(stripped)
    return offenders


# ---------------------------------------------------------------------------
# Structured resume scoring
# ---------------------------------------------------------------------------


def analyze_ats_score(data: ResumeData) -> ATSAnalysis:
    issues: list[ATSIssue] = []
    passed_checks: list[str] = []
    score = 100

    if data.contact.fullName:
        passed_checks.append("Contact information present")
    else:
        issues.append(ATSIssue(id=_generate_id(), severity="error", category="Contact", message="Full name is missing", fix="Add your full name at the top of the resume"))
        score -= 10

    if data.contact.email:
        passed_checks.append("Email address present")
    else:
        issues.append(ATSIssue(id=_generate_id(), severity="error", category="Contact", message="Email address is missing", fix="Add a professional email address"))
        score -= 10

    if data.contact.phone:
        passed_checks.append("Phone number present")
    else:
        issues.append(ATSIssue(id=_generate_id(), severity="error", category="Contact", message="Phone number is missing", fix="Add your phone number with area code"))
        score -= 5

    if data.summary:
        passed_checks.append("Professional summary present")
    else:
        issues.append(ATSIssue(id=_generate_id(), severity="warning", category="Summary", message="Professional summary is missing", fix="Add a 3-4 sentence summary highlighting your key qualifications"))
        score -= 10

    if data.experience:
        passed_checks.append("Work Experience section present")
        has_empty = any(len(exp.bullets) == 0 for exp in data.experience)
        if has_empty:
            issues.append(ATSIssue(id=_generate_id(), severity="warning", category="Experience", message="Some work experience entries have no bullet points", fix="Add at least 3-5 bullet points for each role describing achievements"))
            score -= 5
        has_dates = all(exp.startDate for exp in data.experience)
        if not has_dates:
            issues.append(ATSIssue(id=_generate_id(), severity="error", category="Experience", message="Some work experience entries are missing dates", fix="Add start and end dates for each position"))
            score -= 5

        exp_dates = [d for exp in data.experience for d in (exp.startDate, exp.endDate) if d]
        date_deduction, date_issues = check_dates(exp_dates, "Dates")
        issues.extend(date_issues)
        score -= date_deduction
    else:
        issues.append(ATSIssue(id=_generate_id(), severity="error", category="Experience", message="Work Experience section is missing or empty", fix="Add your work history with relevant roles and achievements"))
        score -= 15

    if data.education:
        passed_checks.append("Education section present")
        edu_dates = [d for edu in data.education for d in (edu.startDate, edu.endDate) if d]
        date_deduction, date_issues = check_dates(edu_dates, "Dates")
        issues.extend(date_issues)
        score -= date_deduction
    else:
        issues.append(ATSIssue(id=_generate_id(), severity="warning", category="Education", message="Education section is missing", fix="Add your educational background including degrees and institutions"))
        score -= 10

    if data.skills:
        passed_checks.append("Skills section present")
    else:
        issues.append(ATSIssue(id=_generate_id(), severity="warning", category="Skills", message="Skills section is missing", fix="Add relevant technical and soft skills"))
        score -= 10

    if data.projects:
        passed_checks.append("Projects section present")

    if data.certifications:
        passed_checks.append("Certifications section present")

    total_bullets = sum(len(exp.bullets) for exp in data.experience)
    if total_bullets > 0:
        has_quantified = any(any(c.isdigit() for c in b) for exp in data.experience for b in exp.bullets)
        if not has_quantified:
            issues.append(ATSIssue(id=_generate_id(), severity="warning", category="Content", message="No quantified achievements found in experience bullets", fix='Add numbers, percentages, or metrics to demonstrate impact (e.g., "Increased sales by 20%")'))
            score -= 5
        else:
            passed_checks.append("Quantified achievements present")

    # Passive phrase flagging (Step 4 UX: catch weak verbs)
    passive = ("responsible for", "helped with", "worked on", "duties included", "in charge of", "was tasked")
    weak_bullets = [b for exp in data.experience for b in exp.bullets if any(p in b.lower() for p in passive)]
    if weak_bullets:
        issues.append(ATSIssue(id=_generate_id(), severity="warning", category="Content", message="Some bullets use passive phrasing that weakens impact", fix='Start bullets with strong action verbs (e.g., "Spearheaded", "Optimized", "Architected")'))
        score -= 5
    else:
        passed_checks.append("Strong action verbs used in bullets")

    if score < 0:
        score = 0

    if score >= 80:
        summary = "Your resume is well-structured and ATS-friendly."
    elif score >= 60:
        summary = "Your resume has some issues that may affect ATS parsing."
    else:
        summary = "Your resume needs significant improvements for ATS compatibility."

    return ATSAnalysis(score=score, issues=issues, passedChecks=passed_checks, summary=summary)


def analyze_ats_score_from_text(
    text: str,
    detected_sections: list[str],
    has_tables: bool | None = None,
    single_column: bool | None = None,
) -> ATSAnalysis:
    issues: list[ATSIssue] = []
    passed_checks: list[str] = []
    score = 100

    for section in STANDARD_SECTIONS:
        found = any(s.lower() == section.lower() for s in detected_sections)
        if found:
            passed_checks.append(f'"{section}" section detected')
        else:
            issues.append(ATSIssue(id=_generate_id(), severity="warning", category="Sections", message=f"Missing standard section: {section}", fix=f'Add a "{section}" section with appropriate heading'))
            score -= 10

    if len(text) < 200:
        issues.append(ATSIssue(id=_generate_id(), severity="error", category="Content", message="Resume content is too short", fix="Add more detailed content to your resume"))
        score -= 10
    else:
        passed_checks.append("Resume has sufficient content length")

    # Header standardizer: flag heading-like lines outside the canonical set.
    nonstandard = detect_nonstandard_headers(text, detected_sections)
    if nonstandard:
        issues.append(ATSIssue(
            id=_generate_id(), severity="warning", category="Sections",
            message=f'Non-standard section header(s) found: {", ".join(nonstandard[:3])}',
            fix='Rename non-standard headings to standard ones like "Experience", "Education", "Skills", "Summary" so ATS section detection works',
        ))
        score -= 5
    else:
        passed_checks.append("Standard section headers only")

    if has_tables is not None:
        if has_tables:
            issues.append(ATSIssue(id=_generate_id(), severity="warning", category="Layout", message="Tables detected in resume", fix="Replace tables with standard text sections - ATS parsers often fail to read table content"))
            score -= 5
        else:
            passed_checks.append("No tables detected (text-based resume)")

    if single_column is not None:
        if single_column:
            passed_checks.append("Single column layout (good for ATS)")
        else:
            issues.append(ATSIssue(id=_generate_id(), severity="warning", category="Layout", message="Multi-column layout detected", fix="Use a single-column layout so ATS parsers read content in the correct order"))
            score -= 5

    if score < 0:
        score = 0

    if score >= 80:
        summary = "Your resume has all standard sections and is ATS-friendly."
    elif score >= 60:
        summary = "Your resume is missing some standard sections."
    else:
        summary = "Your resume is missing critical sections needed for ATS parsing."

    return ATSAnalysis(score=score, issues=issues, passedChecks=passed_checks, summary=summary)