# AI Resume Builder with ATS Optimization

A full-stack **website** to build professional, ATS-optimized resumes with AI-powered
content assistance. Build or upload a resume, get it scored against ATS rules, match it
against a job description, and export to PDF or DOCX — all from the browser.

## Project Structure

```
AI RESUME BUILDER WITH ATS/
├── frontend/    # Next.js web app (the website UI)
├── backend/     # Python FastAPI server (all business logic + API)
└── database/    # Supabase PostgreSQL: local dev compose + seed + docs
```

| Layer       | Folder       | Technology                                    |
|-------------|--------------|-----------------------------------------------|
| Website     | `frontend/`  | Next.js, React, TypeScript, Tailwind CSS      |
| Backend     | `backend/`   | Python FastAPI, OpenRouter API (free models)  |
| Database    | `database/`  | Supabase PostgreSQL (SQLAlchemy async)        |
| PDF Export  | `backend/`   | WeasyPrint / Playwright (Chromium)            |
| DOCX Export | `backend/`   | python-docx                                   |
| Parsing     | `backend/`   | pdfplumber (PDF), python-docx (DOCX)          |

## Getting Started

### 1. Database (Supabase PostgreSQL)

Required only for the server-side Save/Load feature. Set `DATABASE_URL` to your
Supabase connection string (see `database/README.md`). Everything else works
without it — the backend falls back to a local SQLite file.

For local development, either use the bundled Docker Postgres (same engine as
Supabase) or skip the database entirely:

```bash
cd database
docker compose up -d   # local Postgres + pgAdmin (Supabase stand-in)
```

### 2. Backend (Python FastAPI)

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env` (or copy `backend/.env.example`) and set your keys:

```
DATABASE_URL=sqlite+aiosqlite:///./resume_builder.db   # local; see database/README.md for Supabase
OPENROUTER_API_KEY=sk-or-...
```

Run the API server:

```bash
uvicorn main:app --reload --port 8000
```

API docs at [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Website (Next.js)

```bash
cd frontend
npm install
cp .env.example .env      # set NEXT_PUBLIC_API_URL to your backend
npm run dev               # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

### 4. Tests

```bash
cd backend
python -m pytest tests -q
```

## Features

- **Resume Builder** — Tabbed form with live preview, 3 distinct ATS-safe templates (modern / classic / minimal)
- **AI Content Assistant** (needs a FREE OpenRouter key from [openrouter.ai/keys](https://openrouter.ai/keys) — free models need $0 balance)
  - Generate / polish your professional summary
  - Improve any experience bullet with the wand icon
  - Suggest skills for a target role
  - Tailor your whole resume to a pasted job description (AI Tailor button)
- **ATS Score Analyzer** — Upload PDF/DOCX, get a 0–100 score with itemized fixes and real layout checks (table / multi-column detection)
- **JD Matcher** — Paste a job description, extract keywords via AI, see matched/missing skills; load your built resume text with one click
- **AI Career Toolkit** — Cover letter generator, interview STAR prep, recruiter cold-read audit, and cold outreach pitches
- **Job Tracker** — Kanban pipeline for applications (wishlist → applied → interview → offer / rejected)
- **Save / Load** — Auto-saves locally in the browser; server-side save/load/delete/clone for your saved resumes when `DATABASE_URL` points at Supabase (or the local SQLite fallback)
- **Export** — PDF (ATS-clean HTML rendering) or DOCX, downloaded straight from the browser

## API Endpoints

| Method | Path                              | Description                       |
|--------|-----------------------------------|-----------------------------------|
| POST   | `/api/resume/parse`               | Upload PDF/DOCX → structured text + layout analysis |
| POST   | `/api/ats/score`                  | Rule-based ATS scoring on structured resume data |
| POST   | `/api/ai/analyze-jd`              | Extract JD keywords + match against resume text |
| POST   | `/api/ai/improve-bullet`          | Rewrite bullet point with AI      |
| POST   | `/api/ai/generate-summary`        | Generate professional summary     |
| POST   | `/api/ai/suggest-skills`          | Suggest skills for a role         |
| POST   | `/api/ai/tailor-resume`           | Rewrite resume for a JD           |
| POST   | `/api/ai/generate-cover-letter`   | Generate a tailored cover letter  |
| POST   | `/api/ai/interview-prep`          | Generate interview questions + STAR answers |
| POST   | `/api/ai/parse-raw-resume`        | Auto-fill fields from pasted text |
| POST   | `/api/ai/recruiter-audit`         | 6-second cold-read recruiter scan |
| POST   | `/api/ai/generate-outreach`       | Generate cold outreach messages   |
| POST   | `/api/export/pdf`                 | Export resume as PDF              |
| POST   | `/api/export/docx`                | Export resume as DOCX             |
| POST   | `/api/export/text`                | Export resume as plain text       |
| POST   | `/api/export/html`                | Export resume as HTML             |
| GET    | `/api/health`                     | Health check                      |
| POST   | `/api/resumes`                    | Save resume (needs DATABASE_URL)  |
| GET    | `/api/resumes?userId=`            | List saved resumes                |
| GET    | `/api/resumes/{id}`               | Get one saved resume              |
| PUT    | `/api/resumes/{id}`               | Update saved resume               |
| DELETE | `/api/resumes/{id}`               | Delete saved resume               |
| POST   | `/api/resumes/{id}/clone`         | Clone resume as a variant         |
| POST   | `/api/resumes/{id}/insert-keywords` | Insert JD keywords into a resume |
| GET    | `/api/applications?userId=`       | List job applications             |
| POST   | `/api/applications`               | Create a job application          |
| PUT    | `/api/applications/{id}`          | Update a job application          |
| DELETE | `/api/applications/{id}`          | Delete a job application          |
