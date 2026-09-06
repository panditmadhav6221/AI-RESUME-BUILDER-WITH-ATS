import asyncio

from app.services.export_service import (
    generate_pdf,
    generate_docx,
    render_resume_html,
    render_resume_plain_text,
)
from app.schemas.resume import ResumeData


def sample_data() -> ResumeData:
    return ResumeData(
        contact={"fullName": "Jane Doe", "email": "jane@example.com", "phone": "555-1234"},
        summary="Product manager with 3 years of experience.",
        experience=[
            {
                "company": "Tech Co",
                "position": "PM",
                "startDate": "2021",
                "endDate": "2024",
                "bullets": ["Shipped 5 major releases", "Led a team of 4"],
            }
        ],
        education=[{"institution": "State U", "degree": "BA", "field": "Business"}],
        skills=[{"name": "SQL"}, {"name": "Figma"}],
    )


def test_html_export_contains_content():
    html = render_resume_html(sample_data())
    assert "Jane Doe" in html
    assert "Tech Co" in html
    assert "Professional Summary" in html
    # ATS-friendly: single-column layout, no tables.
    assert "<table" not in html


def test_pdf_export_generates_pdf_bytes():
    pdf = asyncio.run(generate_pdf(sample_data()))
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000


def test_docx_export_generates_docx_bytes():
    docx = generate_docx(sample_data())
    assert docx.startswith(b"PK")
    assert len(docx) > 1000


def test_plain_text_export():
    text = render_resume_plain_text(sample_data())
    assert "Jane Doe" in text
    assert "EXPERIENCE" in text
    assert "SKILLS" in text