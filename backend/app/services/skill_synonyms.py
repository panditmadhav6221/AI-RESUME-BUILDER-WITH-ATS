"""Semantic skill matching.

Provides alias/synonym resolution (e.g. "React" == "React.js", "K8s" == "Kubernetes")
and categorization of skills into hard (technologies/tools) vs soft (methodologies).
"""

import re

# canonical name -> aliases (all matched case-insensitively)
SKILL_CANONICAL: dict[str, set[str]] = {
    # Frontend
    "React": {"react", "react.js", "reactjs", "react.js/js"},
    "React Native": {"react native", "reactnative"},
    "Next.js": {"next.js", "nextjs", "next"},
    "Vue.js": {"vue", "vue.js", "vuejs"},
    "Angular": {"angular", "angularjs", "angular 2+"},
    "TypeScript": {"typescript", "ts"},
    "JavaScript": {"javascript", "js", "es6", "ecmascript"},
    "HTML": {"html", "html5"},
    "CSS": {"css", "css3", "sass", "scss", "less", "styled-components", "tailwind", "tailwindcss"},
    "Redux": {"redux", "redux-toolkit"},
    "GraphQL": {"graphql", "apollo", "apollo client"},
    "Webpack": {"webpack", "vite", "rollup"},
    "Flutter": {"flutter", "dart/flutter"},
    "Swift": {"swift", "swiftui"},
    # Backend
    "Python": {"python", "python3", "py"},
    "FastAPI": {"fastapi", "fast api"},
    "Django": {"django", "django rest framework", "drf"},
    "Flask": {"flask"},
    "Node.js": {"node", "node.js", "nodejs"},
    "Go": {"go", "golang"},
    "Rust": {"rust", "rustlang"},
    "Java": {"java", "jdk"},
    "Kotlin": {"kotlin"},
    "C++": {"c++", "cplusplus", "cpp"},
    "C#": {"c#", "csharp", ".net", "dotnet", "asp.net"},
    "PHP": {"php", "laravel", "symfony"},
    "Ruby": {"ruby", "rails", "ruby on rails"},
    "Express": {"express", "express.js", "expressjs"},
    "NestJS": {"nestjs", "nest js"},
    # Databases
    "PostgreSQL": {"postgresql", "postgres", "psql", "supabase postgres"},
    "MySQL": {"mysql"},
    "SQLite": {"sqlite", "sqlite3"},
    "MongoDB": {"mongodb", "mongo", "mongoose"},
    "Redis": {"redis"},
    "SQL": {"sql", "structured query language", "t-sql", "pl/sql"},
    "Elasticsearch": {"elasticsearch", "elastic"},
    "DynamoDB": {"dynamodb", "aws dynamodb"},
    "Supabase": {"supabase", "supabase auth", "supabase storage"},
    "Firebase": {"firebase", "firestore", "firebase cloud functions"},
    "Prisma": {"prisma", "prisma orm"},
    "SQLAlchemy": {"sqlalchemy", "sql alchemy"},
    # Cloud / DevOps
    "AWS": {
        "aws",
        "amazon web services",
        "ec2",
        "s3",
        "lambda",
        "amazon s3",
        "cloudwatch",
        "dynamodb",
        "ecs",
        "eks",
    },
    "GCP": {"gcp", "google cloud", "google cloud platform", "gce"},
    "Azure": {"azure", "microsoft azure"},
    "Docker": {"docker", "docker compose", "docker-compose"},
    "Kubernetes": {"kubernetes", "k8s", "k3s", "eks", "gke", "aks"},
    "CI/CD": {"ci/cd", "ci cd", "jenkins", "github actions", "gitlab ci", "circleci", "travis"},
    "Terraform": {"terraform", "iac", "infrastructure as code"},
    "Git": {"git", "github", "gitlab", "bitbucket"},
    "Nginx": {"nginx", "caddy", "reverse proxy"},
    "Linux": {"linux", "unix", "ubuntu", "centos", "redhat"},
    "Serverless": {"serverless", "lambda functions"},
    # Data / AI
    "pandas": {"pandas", "dataframes"},
    "NumPy": {"numpy", "np"},
    "Machine Learning": {"machine learning", "ml", "mlops"},
    "Deep Learning": {"deep learning", "dl", "cnn", "rnn", "transformers", "neural networks"},
    "TensorFlow": {"tensorflow", "tf", "keras"},
    "PyTorch": {"pytorch", "torch"},
    "LLMs": {"llm", "llms", "large language models", "gpt", "openai", "fine-tuning", "fine tuning"},
    "LangChain": {"langchain", "langchain4j"},
    "Prompt Engineering": {"prompt engineering", "prompt design"},
    "Airflow": {"airflow", "apache airflow"},
    "Spark": {"spark", "apache spark", "pyspark"},
    "Apache Kafka": {"kafka", "apache kafka"},
    "BigQuery": {"bigquery", "google bigquery"},
    "Snowflake": {"snowflake"},
    # Testing
    "Jest": {"jest"},
    "Playwright": {"playwright", "playwright test"},
    "pytest": {"pytest", "py test"},
    "JUnit": {"junit"},
    "Selenium": {"selenium"},
    "Cypress": {"cypress"},
    "TDD": {"tdd", "test driven development"},
    # Mobile
    "Expo": {"expo", "expo react native", "expo go"},
    # Other tools
    "Figma": {"figma"},
    "Jira": {"jira", "jira/atlassian"},
    "Agile": {"agile", "scrum", "kanban", "sprint planning", "agile methodology"},
    # Soft skills / methodologies
    "Communication": {"communication", "written communication", "verbal communication", "presentation skills"},
    "Team Leadership": {"leadership", "team leadership", "mentoring", "leading teams", "people management"},
    "Problem Solving": {"problem solving", "problem-solving", "analytical thinking", "critical thinking"},
    "Project Management": {"project management", "pm", "pmp", "project planning", "roadmapping"},
    "Stakeholder Management": {"stakeholder management", "stakeholder engagement", "stakeholders"},
    "Cross-functional Collaboration": {"cross-functional", "cross functional collaboration", "collaboration", "teamwork"},
    "Product Management": {"product management", "product strategy", "roadmap", "go-to-market"},
    "Time Management": {"time management", "prioritization", "prioritizing"},
    "Mentorship": {"mentorship", "coaching", "mentoring junior"},
    "Microservices": {"microservices", "micro-service", "microservice architecture", "soa"},
    "REST": {"rest", "restful", "rest api", "rest apis"},
    "Event-driven Architecture": {"event-driven", "event driven architecture", "event sourcing"},
    "OOP": {"oop", "object oriented", "object-oriented programming"},
    "System Design": {"system design", "systems design", "high-level design", "large scale systems"},
    "Unit Testing": {"unit testing", "unit tests"},
    "Code Review": {"code review", "code reviews"},
    "API Design": {"api design", "api development", "api integration"},
}

# Categorization of canonical names.
SOFT_SKILLS = {
    "Communication",
    "Team Leadership",
    "Problem Solving",
    "Project Management",
    "Stakeholder Management",
    "Cross-functional Collaboration",
    "Product Management",
    "Time Management",
    "Mentorship",
}

# Reverse lookup: every alias (lowercased) -> canonical name
_ALIAS_INDEX: dict[str, str] = {}
for _canonical, _aliases in SKILL_CANONICAL.items():
    for _alias in _aliases:
        _ALIAS_INDEX[_alias] = _canonical


def canonical_skill(name: str) -> str:
    """Return the canonical skill name for a given alias, falling back to the input."""
    key = name.strip().lower()
    if key in _ALIAS_INDEX:
        return _ALIAS_INDEX[key]
    return name.strip()


def categorize_skill(name: str) -> str:
    canonical = canonical_skill(name)
    if canonical in SOFT_SKILLS:
        return "soft"
    if canonical in SKILL_CANONICAL:
        return "hard"
    return "uncategorized"


def skill_aliases(name: str) -> list[str]:
    canonical = canonical_skill(name)
    return sorted(SKILL_CANONICAL.get(canonical, {canonical.lower()}))


def _word_bounded(pattern: str) -> re.Pattern:
    return re.compile(rf"(?<![A-Za-z0-9]){re.escape(pattern)}(?![A-Za-z0-9])", re.IGNORECASE)


def match_skill_in_text(skill: str, text: str) -> bool:
    """Check whether a skill (or any of its aliases) appears in the given text."""
    lower_text = text.lower()
    for alias in skill_aliases(skill):
        # Short aliases like "go" need word boundaries to avoid false positives.
        if len(alias) <= 3 and not any(c.isdigit() for c in alias):
            if _word_bounded(alias).search(lower_text):
                return True
        elif alias in lower_text:
            return True
    return False


def categorize_skill_batch(names: list[str]) -> dict[str, dict[str, str]]:
    """Return {raw_name: {"canonical": ..., "category": ...}} for a batch of names."""
    return {
        n: {"canonical": canonical_skill(n), "category": categorize_skill(n)}
        for n in names
    }


# A compact hint list used by the AI prompts so generations stay on-canonical names.
CANONICAL_SKILL_HINTS = "React, Next.js, Python, FastAPI, PostgreSQL, Kubernetes, Docker, AWS, TypeScript, GraphQL"