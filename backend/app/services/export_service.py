"""Export service.

PDF is produced from an ATS-friendly, single-column HTML+CSS template using a
headless rendering pipeline:

1. WeasyPrint (Linux / Render, best CSS fidelity, selectable text)
2. Playwright + Chromium (fallback for macOS/Windows where system GTK libs
   for WeasyPrint are unavailable)

Both produce standard A4/Letter PDFs with 0.5" margins, web-safe fonts, and a
real text layer (no flattened canvases), which ATS parsers can read reliably.
"""

import io
import logging
from jinja2 import Template
from app.schemas.resume import ResumeData

logger = logging.getLogger("uvicorn.error")

# ATS-compliant template: single column, web-safe fonts, standard 0.55in margins,
# predictable line boxes (no absolute coordinates, no flex tables that ATS breaks on).
RESUME_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: Letter;
    margin: 0.55in 0.6in 0.55in 0.6in;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.35;
    color: #1a1a1a;
  }
  .header { text-align: center; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
  .name { font-size: 22pt; font-weight: 700; margin: 0 0 4px 0; letter-spacing: 0.5px; }
  .contact-row { font-size: 9pt; color: #3a3a3a; margin: 0; }
  .section { margin: 12px 0 6px 0; padding-bottom: 3px; border-bottom: 1px solid #999; }
  .section-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0; color: #111; }
  .summary { font-size: 10pt; margin: 0 0 6px 0; }
  .exp-item, .edu-item, .proj-item, .cert-item { margin-bottom: 8px; page-break-inside: avoid; }
  .line { display: block; }
  .company { font-size: 10.5pt; font-weight: 700; margin: 0; }
  .role-date { display: block; }
  .role { font-size: 10pt; font-style: italic; margin: 0; }
  .date { font-size: 9pt; color: #555; margin: 0; }
  .bullet { font-size: 10pt; margin: 1px 0 1px 12px; padding-left: 2px; }
  .degree { font-size: 10pt; margin: 0; }
  .skill-text { font-size: 10pt; margin: 0; }
  .proj-name { font-size: 10.5pt; font-weight: 700; margin: 0; display: block; }
  .proj-desc { font-size: 10pt; margin: 1px 0; }
  .proj-tech { font-size: 9pt; color: #555; margin: 0; }
  .cert-name { font-size: 10.5pt; font-weight: 700; margin: 0; display: block; }
  .cert-issuer { font-size: 9pt; color: #555; margin: 0; }
  .keep-together { page-break-inside: avoid; }
</style>
</head>
<body>
  <div class="header">
    <h1 class="name">{{ contact.fullName }}</h1>
    {% if contact.email or contact.phone or contact.location %}
    <p class="contact-row">{{ [contact.email, contact.phone, contact.location] | select | join(' | ') }}</p>
    {% endif %}
    {% if contact.linkedin or contact.website %}
    <p class="contact-row">{{ [contact.linkedin, contact.website] | select | join(' | ') }}</p>
    {% endif %}
  </div>

  {% if summary %}
  <div class="keep-together">
    <div class="section"><h2 class="section-title">Professional Summary</h2></div>
    <p class="summary">{{ summary }}</p>
  </div>
  {% endif %}

  {% if experience %}
  <div class="keep-together">
    <div class="section"><h2 class="section-title">Experience</h2></div>
    {% for exp in experience %}
    <div class="exp-item">
      <p class="company">{{ exp.company }}</p>
      <span class="role-date">
        <span class="role">{{ exp.position }}{% if exp.location %}{{ ' | ' + exp.location }}{% endif %}</span>
        <span class="date">{{ exp.startDate + ' - ' + ('Present' if exp.current else exp.endDate) }}</span>
      </span>
      {% for bullet in exp.bullets %}{% if bullet.strip() %}<p class="bullet">&bull; {{ bullet }}</p>{% endif %}{% endfor %}
    </div>
    {% endfor %}
  </div>
  {% endif %}

  {% if education %}
  <div class="keep-together">
    <div class="section"><h2 class="section-title">Education</h2></div>
    {% for edu in education %}
    <div class="edu-item">
      <p class="company">{{ edu.institution }}</p>
      <p class="degree">{{ edu.degree }}{% if edu.field %}{{ ' in ' + edu.field }}{% endif %}{% if edu.gpa %}{{ ' | GPA: ' + edu.gpa }}{% endif %}</p>
      {% if edu.startDate or edu.endDate %}<p class="date">{{ [edu.startDate, edu.endDate] | select | join(' - ') }}</p>{% endif %}
    </div>
    {% endfor %}
  </div>
  {% endif %}

  {% if skills %}
  <div class="keep-together">
    <div class="section"><h2 class="section-title">Skills</h2></div>
    <p class="skill-text">{{ skills | map(attribute='name') | join(', ') }}</p>
  </div>
  {% endif %}

  {% if projects %}
  <div class="keep-together">
    <div class="section"><h2 class="section-title">Projects</h2></div>
    {% for proj in projects %}
    <div class="proj-item">
      <span class="proj-name">{{ proj.name }}{% if proj.url %} &nbsp;<span style="font-weight:400;color:#2b5a9c">{{ proj.url }}</span>{% endif %}</span>
      {% if proj.description %}<p class="proj-desc">{{ proj.description }}</p>{% endif %}
      {% if proj.technologies %}<p class="proj-tech">Technologies: {{ proj.technologies | join(', ') }}</p>{% endif %}
    </div>
    {% endfor %}
  </div>
  {% endif %}

  {% if certifications %}
  <div class="keep-together">
    <div class="section"><h2 class="section-title">Certifications</h2></div>
    {% for cert in certifications %}
    <div class="cert-item">
      <span class="cert-name">{{ cert.name }}</span>
      <p class="cert-issuer">{{ [cert.issuer, cert.date] | select | join(' | ') }}</p>
    </div>
    {% endfor %}
  </div>
  {% endif %}
</body>
</html>"""


def render_resume_html(data: ResumeData) -> str:
    template = Template(RESUME_TEMPLATE)
    return template.render(**data.model_dump())


async def _pdf_with_weasyprint(html: str) -> bytes | None:
    try:
        from weasyprint import HTML

        return bytes(HTML(string=html).write_pdf())
    except Exception as e:  # noqa: BLE001
        logger.warning("WeasyPrint unavailable (%s); trying Playwright.", e)
        return None


async def _pdf_with_playwright(html: str) -> bytes:
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        try:
            page = await browser.new_page()
            await page.set_content(html, wait_until="load")
            pdf_bytes = await page.pdf(
                format="Letter",
                print_background=True,
                margin={"top": "0.55in", "bottom": "0.55in", "left": "0.6in", "right": "0.6in"},
            )
            return pdf_bytes
        finally:
            await browser.close()


async def generate_pdf(data: ResumeData) -> bytes:
    html = render_resume_html(data)

    pdf = await _pdf_with_weasyprint(html)
    if pdf is not None and pdf.startswith(b"%PDF"):
        return pdf

    try:
        return await _pdf_with_playwright(html)
    except Exception as e:  # noqa: BLE001
        logger.exception("All PDF renderers failed")
        raise RuntimeError(f"PDF rendering backend failed: {e}") from e


def render_resume_plain_text(data: ResumeData) -> str:
    """Clean, copy-pasteable plain text for legacy ATS text boxes."""
    lines: list[str] = []

    if data.contact.fullName:
        lines.append(data.contact.fullName)
    contact = " | ".join(
        x
        for x in [
            data.contact.email,
            data.contact.phone,
            data.contact.location,
            data.contact.linkedin,
            data.contact.website,
        ]
        if x
    )
    if contact:
        lines.append(contact)

    if data.summary:
        lines.append(f"\nSUMMARY\n{data.summary}")

    if data.experience:
        lines.append("\nEXPERIENCE")
        for exp in data.experience:
            header = " | ".join(x for x in [exp.company, exp.position, exp.location] if x)
            dates = f"{exp.startDate} - {'Present' if exp.current else exp.endDate}"
            lines.append(f"{header} ({dates})")
            for b in exp.bullets:
                if b.strip():
                    lines.append(f"- {b}")

    if data.education:
        lines.append("\nEDUCATION")
        for edu in data.education:
            degree = " ".join(x for x in [edu.degree, "in", edu.field] if x and x != "in")
            parts = [p for p in [edu.institution, degree or None, f"{edu.startDate} - {edu.endDate}"] if p]
            lines.append(" - ".join([edu.institution, degree]) if degree else edu.institution)

    if data.skills:
        lines.append("\nSKILLS")
        lines.append(", ".join(s.name for s in data.skills if s.name))

    if data.projects:
        lines.append("\nPROJECTS")
        for proj in data.projects:
            title = proj.name + (f" ({proj.url})" if proj.url else "")
            lines.append(title)
            if proj.description:
                lines.append(proj.description)
            if proj.technologies:
                lines.append(f"Technologies: {', '.join(proj.technologies)}")

    if data.certifications:
        lines.append("\nCERTIFICATIONS")
        for cert in data.certifications:
            lines.append(" - ".join(x for x in [cert.name, cert.issuer, cert.date] if x))

    return "\n".join(lines)


def generate_docx(data: ResumeData) -> bytes:
    from docx import Document
    from docx.shared import Pt

    doc = Document()

    if data.contact.fullName:
        doc.add_heading(data.contact.fullName, level=0).alignment = 1

    contact_parts = [p for p in [data.contact.email, data.contact.phone, data.contact.location] if p]
    if contact_parts:
        doc.add_paragraph(" | ".join(contact_parts)).alignment = 1

    links = [p for p in [data.contact.linkedin, data.contact.website] if p]
    if links:
        doc.add_paragraph(" | ".join(links)).alignment = 1

    def add_section(title: str):
        doc.add_heading(title, level=1)

    if data.summary:
        add_section("Professional Summary")
        doc.add_paragraph(data.summary)

    if data.experience:
        add_section("Experience")
        for exp in data.experience:
            p = doc.add_paragraph()
            run = p.add_run(exp.company)
            run.bold = True
            if exp.position:
                p.add_run(f"  |  {exp.position}").font.italic = True
            date_str = f"{exp.startDate} - {'Present' if exp.current else exp.endDate}"
            if exp.location or date_str.strip(" -"):
                sub = doc.add_paragraph(f"{exp.location}{' | ' if exp.location else ''}{date_str}")
                sub.runs[0].font.size = Pt(9)
            for bullet in exp.bullets:
                if bullet.strip():
                    doc.add_paragraph(bullet, style="List Bullet")

    if data.education:
        add_section("Education")
        for edu in data.education:
            p = doc.add_paragraph()
            p.add_run(edu.institution).bold = True
            gpa_str = f" | GPA: {edu.gpa}" if edu.gpa else ""
            doc.add_paragraph(f"{' '.join(x for x in [edu.degree, 'in', edu.field] if x)}{gpa_str} | {edu.startDate} - {edu.endDate}")

    if data.skills:
        add_section("Skills")
        doc.add_paragraph(", ".join(s.name for s in data.skills if s.name))

    if data.projects:
        add_section("Projects")
        for proj in data.projects:
            p = doc.add_paragraph()
            p.add_run(proj.name).bold = True
            if proj.url:
                p.add_run(f"  |  {proj.url}").font.size = Pt(9)
            if proj.description:
                doc.add_paragraph(proj.description)
            if proj.technologies:
                sub = doc.add_paragraph(f"Technologies: {', '.join(proj.technologies)}")
                sub.runs[0].font.size = Pt(9)

    if data.certifications:
        add_section("Certifications")
        for cert in data.certifications:
            p = doc.add_paragraph()
            p.add_run(cert.name).bold = True
            if cert.issuer or cert.date:
                doc.add_paragraph(" | ".join(x for x in [cert.issuer, cert.date] if x))

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()