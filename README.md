# AI Resume Builder with ATS Optimization

A full-stack web app to build professional, ATS-optimized resumes with AI-powered content assistance. Build or upload a resume, get scored against ATS rules, match against job descriptions, and export to PDF or DOCX.

## Project Structure

```
AI RESUME BUILDER WITH ATS/
├── backend/     # Python FastAPI server (all business logic + API)
├── mobile/      # Expo / React Native app (iOS + Android, EAS builds)
└── database/    # Supabase PostgreSQL: local dev compose + seed + docs
```

> A legacy `frontend/` (Next.js) also exists in this repo but is no longer the
> maintained UI — the Expo app in `mobile/` is the current frontend.

| Layer       | Folder       | Technology                                   |
|-------------|--------------|----------------------------------------------|
| Mobile      | `mobile/`    | Expo/React Native, TypeScript, EAS Build     |
| Backend     | `backend/`   | Python FastAPI, OpenRouter API (free models) |
| Database    | `database/`  | Supabase PostgreSQL (SQLAlchemy async)       |
| PDF Export  | `backend/`   | WeasyPrint / Playwright (Chromium)           |
| DOCX Export | `backend/`   | python-docx                                  |
| Parsing     | `backend/`   | pdfplumber (PDF), python-docx (DOCX)         |

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

### 3. Mobile app (Expo / EAS)

```bash
cd mobile
npm install
cp .env.example .env      # set EXPO_PUBLIC_API_URL to your backend
npx expo start            # dev in Expo Go
# or build a binary:
npx eas build --profile development
```

### 4. Tests

```bash
cd backend
python -m pytest tests -q
```

## Features

- **Resume Builder** â€” Tabbed form with live preview, 3 distinct ATS-safe templates (modern / classic / minimal)
- **AI Content Assistant** (needs a FREE OpenRouter key from [openrouter.ai/keys](https://openrouter.ai/keys) — free models need $0 balance)
  - Generate / polish your professional summary
  - Improve any experience bullet with the wand icon
  - Suggest skills for a target role
  - Tailor your whole resume to a pasted job description (AI Tailor button)
- **ATS Score Analyzer** â€” Upload PDF/DOCX, get a 0â€“100 score with itemized fixes and real layout checks (table / multi-column detection)
- **JD Matcher** â€” Paste a job description, extract keywords via AI, see matched/missing skills; load your built resume text with one click
- **Save / Load** â€” Auto-saves locally on-device; server-side save/load/delete/clone for your saved resumes when `DATABASE_URL` points at Supabase (or the local SQLite fallback)
- **Export** â€” PDF (ATS-clean HTML rendering) or DOCX, shared from the mobile app

## API Endpoints

| Method | Path                   | Description                       |
|--------|------------------------|-----------------------------------|
| POST   | `/api/resume/parse`    | Upload PDF/DOCX â†’ structured text + layout analysis |
| POST   | `/api/ats/score`       | Rule-based ATS scoring on structured resume data |
| POST   | `/api/ai/analyze-jd`   | Extract JD keywords + match against resume text |
| POST   | `/api/ai/improve-bullet` | Rewrite bullet point with AI    |
| POST   | `/api/ai/generate-summary` | Generate professional summary |
| POST   | `/api/ai/suggest-skills` | Suggest skills for a role       |
| POST   | `/api/ai/tailor-resume` | Rewrite resume for a JD          |
| POST   | `/api/export/pdf`      | Export resume as PDF              |
| POST   | `/api/export/docx`     | Export resume as DOCX             |
| GET    | `/api/health`          | Health check                      |
| POST   | `/api/resumes`         | Save resume (needs DATABASE_URL)  |
| GET    | `/api/resumes?userId=` | List saved resumes                |
| GET    | `/api/resumes/{id}`    | Get one saved resume              |
| PUT    | `/api/resumes/{id}`    | Update saved resume               |
| DELETE | `/api/resumes/{id}`    | Delete saved resume               |
