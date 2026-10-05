import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.resume import router as resume_router
from app.api.resumes import router as saved_resumes_router
from app.api.applications import router as applications_router
from app.api.ats import router as ats_router
from app.api.ai_routes import router as ai_router
from app.api.export import router as export_router
from app.database import init_db, close_db, check_db_connection

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(title="AI Resume Builder API", version="2.0.0", lifespan=lifespan)

# Allow the web frontend, Expo development clients, and the EAS-built app scheme.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *[o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()],
    ],
    allow_origin_regex=(
        r"^(exp://|(?:http://|https://)(?:localhost|127\.0\.0\.1)(?::\d+)?$|"
        r"com\.resumebuilder\.app://.*$)"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume_router)
app.include_router(saved_resumes_router)
app.include_router(applications_router)
app.include_router(ats_router)
app.include_router(ai_router)
app.include_router(export_router)


@app.get("/api/health")
async def health():
    db_ok = await check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unavailable",
        "provider": "postgres" if os.getenv("DATABASE_URL", "").startswith("postgres") else "sqlite",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)