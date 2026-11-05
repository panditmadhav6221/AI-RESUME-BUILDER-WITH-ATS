from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.resume_parser import parse_resume_file, detect_sections
from app.services.ats_scorer import analyze_ats_score_from_text

router = APIRouter(prefix="/api/resume", tags=["resume"])


MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@router.post("/parse")
async def parse_resume(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF or DOCX file.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is too large. Please upload a file under 10MB.")
    try:
        text, sections, layout = parse_resume_file(contents, file.content_type or "", file.filename or "")
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
