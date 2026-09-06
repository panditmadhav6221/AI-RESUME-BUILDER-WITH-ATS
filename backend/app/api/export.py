from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.schemas.resume import ResumeData
from app.services.export_service import (
    generate_pdf,
    generate_docx,
    render_resume_html,
    render_resume_plain_text,
)

router = APIRouter(prefix="/api/export", tags=["export"])


@router.post("/pdf")
async def export_pdf(data: ResumeData):
    try:
        pdf_bytes = await generate_pdf(data)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=resume.pdf"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/text")
async def export_text(data: ResumeData):
    """Clean, copy-pasteable ATS-raw plain text for legacy ATS text boxes."""
    return {"text": render_resume_plain_text(data)}


@router.post("/docx")
async def export_docx(data: ResumeData):
    try:
        docx_bytes = generate_docx(data)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=resume.docx"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/html")
async def export_html(data: ResumeData):
    html = render_resume_html(data)
    return Response(content=html, media_type="text/html")
