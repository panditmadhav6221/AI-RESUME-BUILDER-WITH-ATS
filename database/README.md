# Database — Supabase (PostgreSQL)

Supabase is a hosted Postgres service. It replaces the old MongoDB-local setup:
same relational database for production (Supabase) and for local development
(the bundled Docker Postgres, or the built-in SQLite fallback in the backend).

## Structure

```
database/
├── docker-compose.yml   # local Postgres + pgAdmin (dev stand-in for Supabase)
└── seed.py              # create tables + insert sample resume / job description
```

> The authoritative schema lives in the backend as SQLAlchemy models:
> `backend/app/models/resume.py`. Tables are auto-created on startup
> (`init_db` in `backend/app/database.py`), so no separate migration step is
> required for the MVP.

## Production connection (Supabase)

1. Create a free project at https://supabase.com → **Project Settings → Database**
2. Copy the connection string and paste it into `backend/.env`:

```
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<host>.supabase.com:6543/postgres?sslmode=require
```

3. Run the backend once — the four tables are created automatically:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verify with `GET /api/health` → `{"status":"ok","database":"connected","provider":"postgresql"}`.

## Local development (Docker Postgres — same DB engine Supabase runs)

```bash
cd database
docker compose up -d
```

- Postgres   → `localhost:5432`  (database `resume_builder`, user/password `postgres`/`postgres`)
- pgAdmin UI → http://localhost:8081 (login: `admin@resume-builder.local` / `admin`)

Then point the backend at it (in `backend/.env`):

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/resume_builder
```

### No Docker? Use the SQLite fallback

Leave `DATABASE_URL` unset (or set `DATABASE_URL=sqlite+aiosqlite:///./resume_builder.db`).
Everything works locally; swap the URL for Supabase when deploying.

## Seed sample data

Idempotent — creates the tables and inserts a sample resume + job description
for the `demo-user` account (skips if the user already has resumes).

```bash
# against local Postgres (default)
python database/seed.py

# against Supabase
DATABASE_URL="postgresql+asyncpg://postgres:<password>@<host>.supabase.com:6543/postgres?sslmode=require" \
  python database/seed.py
```

## Data model (then ↔ now)

| Old MongoDB collection | New Postgres table (SQLAlchemy model)                        |
|------------------------|---------------------------------------------------------------|
| `resumes`              | `resumes` (`Resume` — id, user_id, title, target_role, template, parent_id, score) |
| — (embedded in resume) | `resume_data` (`ResumeData` — resume_id FK, `data` JSONB)      |
| `resume_versions`      | `ats_scans` (`AtsScan` — resume_id FK, score, matched/missing keywords, suggestions) |
| —                       | `job_descriptions` (`JobDescription` — user_id, raw_text, parsed_skills JSONB) |

The `TEXT`/JSON resume body maps to the `JSONB` column on Postgres
(`JSON` on SQLite), and resume variants (AI-tailored copies) are tracked via
`parent_id` on `resumes` instead of a separate version-history collection.