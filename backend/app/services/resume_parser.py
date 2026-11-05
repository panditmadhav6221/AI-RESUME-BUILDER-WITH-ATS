import io
import re
import pdfplumber
from docx import Document


SECTION_HEADINGS = [
    "summary", "professional summary", "profile",
    "experience", "work experience", "employment", "work history",
    "education", "academic background",
    "skills", "technical skills", "core competencies",
    "projects", "personal projects", "professional projects",
    "certifications", "certificates", "licenses",
    "publications", "awards", "honors",
    "volunteer", "volunteering", "volunteer experience",
    "languages", "interests",
]


def _detect_file_kind(file_bytes: bytes, mime_type: str, filename: str) -> str | None:
    """Detect PDF/DOCX from the filename, MIME type, or file signature.

    Browsers are inconsistent about MIME types (Windows often sends
    "application/octet-stream" for DOCX), so we never rely on it alone.
    """
    name = (filename or "").lower()
    mime = (mime_type or "").lower()

    if name.endswith(".pdf") or "pdf" in mime or b"%PDF" in file_bytes[:1024]:
        return "pdf"
    if name.endswith(".docx") or "wordprocessingml" in mime or file_bytes[:2] == b"PK":
        return "docx"
    return None


def parse_resume_file(
    file_bytes: bytes,
    mime_type: str = "",
    filename: str = "",
) -> tuple[str, dict[str, str], dict]:
    kind = _detect_file_kind(file_bytes, mime_type, filename)
    layout: dict = {"hasTables": False, "singleColumn": None}

    if kind == "pdf":
        try:
            text, layout = _parse_pdf(file_bytes)
        except Exception as exc:
            raise ValueError("Could not read this PDF file. Please make sure it is a valid PDF.") from exc
    elif kind == "docx":
        try:
            text = _parse_docx(file_bytes)
        except Exception as exc:
            raise ValueError("Could not read this DOCX file. Please make sure it is a valid Word document.") from exc
    else:
        raise ValueError("Unsupported file type. Please upload a PDF or DOCX file.")

    sections = extract_sections(text)
    return text, sections, layout


def _parse_pdf(file_bytes: bytes) -> tuple[str, dict]:
    text = ""
    has_tables = False
    x_starts: list[float] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
            if page.find_tables():
                has_tables = True
            words = page.extract_words()
            x_starts.extend(w["x0"] for w in words)

    single_column = None
    if x_starts:
        ordered = sorted(x_starts)
        median = ordered[len(ordered) // 2]
        far_from_median = sum(1 for x in x_starts if abs(x - median) > 40)
        single_column = (far_from_median / len(x_starts)) < 0.05

    return text, {"hasTables": has_tables, "singleColumn": single_column}


def _parse_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    text = "\n".join(p.text for p in doc.paragraphs)
    return text


def extract_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    lines = text.split("\n")
    current_section = "header"
    current_content: list[str] = []

    for line in lines:
        trimmed = line.strip()
        if not trimmed:
            continue

        heading_match = None
        lower = trimmed.lower()
        for h in SECTION_HEADINGS:
            if lower == h:
                heading_match = h
                break
            if lower.startswith(h):
                remainder = lower[len(h):]
                if remainder and remainder[0] in " :,;|-—\t":
                    heading_match = h
                    break

        if heading_match:
            if current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = heading_match
            current_content = []
        else:
            current_content.append(trimmed)

    if current_content:
        key = current_section
        if key in sections:
            sections[key] += "\n" + "\n".join(current_content)
        else:
            sections[key] = "\n".join(current_content).strip()

    return sections


def detect_sections(text: str) -> list[str]:
    detected = []
    lower_text = text.lower()
    for heading in SECTION_HEADINGS:
        if re.search(rf"\b{re.escape(heading)}\b", lower_text):
            formatted = heading[0].upper() + heading[1:]
            if formatted not in detected:
                detected.append(formatted)
    return detected
