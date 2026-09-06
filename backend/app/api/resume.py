from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.resume_parser import parse_resume_file, detect_sections
from app.services.ats_scorer import analyze_ats_score_from_text

router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post("/parse")
async def parse_resume(file: UploadFile = File(...)):
    if not file.filename or not (file.filename.endswith(".pdf") or file.filename.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF or DOCX file.")

    contents = await file.read()
    try:
        text, sections, layout = parse_resume_file(contents, file.content_type or "")
        detected = detect_sections(text)
        analysis = analyze_ats_score_from_text(
            text, detected,
            has_tables=layout["hasTables"],
            single_column=layout["singleColumn"],
        )
        return {
            "text": text,
            "sections": sections,
            "detectedSections": detected,
            "layout": layout,
            "analysis": analysis.model_dump(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
