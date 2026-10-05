from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ContactInfo(BaseModel):
    fullName: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str | None = None
    website: str | None = None


class WorkExperience(BaseModel):
    id: str = ""
    company: str = ""
    position: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    current: bool = False
    bullets: list[str] = []


class Education(BaseModel):
    id: str = ""
    institution: str = ""
    degree: str = ""
    field: str = ""
    startDate: str = ""
    endDate: str = ""
    gpa: str | None = None


class Skill(BaseModel):
    id: str = ""
    name: str = ""


class Project(BaseModel):
    id: str = ""
    name: str = ""
    description: str = ""
    url: str | None = None
    technologies: list[str] = []


class Certification(BaseModel):
    id: str = ""
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: str | None = None


class ResumeData(BaseModel):
    contact: ContactInfo = ContactInfo()
    summary: str = ""
    experience: list[WorkExperience] = []
    education: list[Education] = []
    skills: list[Skill] = []
    projects: list[Project] = []
    certifications: list[Certification] = []


class ATSIssue(BaseModel):
    id: str
    severity: str
    category: str
    message: str
    fix: str


class ATSAnalysis(BaseModel):
    score: int
    issues: list[ATSIssue]
    passedChecks: list[str]
    summary: str


class SkillMatch(BaseModel):
    name: str
    matched: bool
    category: str = "uncategorized"  # "hard" | "soft" | "uncategorized"


class JDAnalysis(BaseModel):
    matchedSkills: list[SkillMatch]
    missingSkills: list[SkillMatch]
    matchPercentage: int
    keywords: list[str]
    suggestions: list[str]


class ImproveBulletRequest(BaseModel):
    bullet: str
    role: str | None = None


class GenerateSummaryRequest(BaseModel):
    input: str
    targetRole: str | None = None


class SuggestSkillsRequest(BaseModel):
    targetRole: str
    currentSkills: list[str] = []


class TailorResumeRequest(BaseModel):
    resumeJson: dict
    jd: str


class AnalyzeJDRequest(BaseModel):
    jd: str
    resumeText: str = ""
    userId: str | None = None
    targetRole: str | None = None


class ATSScoreRequest(BaseModel):
    resumeData: ResumeData
    resumeId: str | None = None
    userId: str | None = None


# ---------------------------------------------------------------------------
# AI structured outputs (Structured Outputs / guardrails)
# ---------------------------------------------------------------------------


class PassivePhraseFlag(BaseModel):
    phrase: str
    suggestion: str
    position: int = 0


class ImproveBulletResult(BaseModel):
    original: str
    improved: str
    usedModel: str = ""
    flags: list[PassivePhraseFlag] = Field(default_factory=list)


class GenerateSummaryResult(BaseModel):
    summary: str
    usedModel: str = ""


class SuggestSkillsResult(BaseModel):
    skills: list[str]
    usedModel: str = ""


class JDExtraction(BaseModel):
    requiredSkills: list[str] = Field(default_factory=list)
    preferredSkills: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    hardSkills: list[str] = Field(default_factory=list)
    softSkills: list[str] = Field(default_factory=list)


class TailorResult(BaseModel):
    tailored: ResumeData
    guardrailWarnings: list[str] = Field(default_factory=list)
    usedModel: str = ""


# ---------------------------------------------------------------------------
# Resume CRUD / variants / keyword insertion request models
# ---------------------------------------------------------------------------


class SaveResumeRequest(BaseModel):
    userId: str
    title: str = "Untitled Resume"
    data: ResumeData
    template: str = "modern"
    targetRole: str | None = None


class UpdateResumeRequest(BaseModel):
    userId: str
    title: str | None = None
    data: ResumeData | None = None
    template: str | None = None
    score: int | None = None
    targetRole: str | None = None


class CloneResumeRequest(BaseModel):
    userId: str
    title: str = "Untitled Resume (copy)"
    targetRole: str | None = None


class InsertKeywordsRequest(BaseModel):
    userId: str
    keywords: list[str]
    targetSection: str = "skills"  # "skills" | "summary"


class PersistJdRequest(BaseModel):
    userId: str
    rawText: str
    targetRole: str | None = None
    parsedSkills: dict | None = None


# ---------------------------------------------------------------------------
# Cover Letter & Interview Prep Models
# ---------------------------------------------------------------------------


class GenerateCoverLetterRequest(BaseModel):
    resumeData: ResumeData
    jobDescription: str
    companyName: str | None = None
    targetRole: str | None = None
    tone: str = "professional"  # "professional" | "enthusiastic" | "executive"


class CoverLetterResult(BaseModel):
    salutation: str = "Dear Hiring Team,"
    opening: str = ""
    bodyParagraphs: list[str] = Field(default_factory=list)
    closing: str = ""
    signoff: str = "Sincerely,\n[Your Name]"
    fullText: str = ""
    usedModel: str = ""


class InterviewPrepRequest(BaseModel):
    resumeData: ResumeData
    jobDescription: str | None = None
    targetRole: str | None = None


class STARAnswer(BaseModel):
    situation: str = ""
    task: str = ""
    action: str = ""
    result: str = ""


class InterviewQuestion(BaseModel):
    id: str
    type: str = "behavioral"  # "behavioral" | "technical" | "leadership"
    question: str
    whyAsked: str = ""
    keyPointsToCover: list[str] = Field(default_factory=list)
    sampleStarAnswer: STARAnswer | None = None


class InterviewPrepResult(BaseModel):
    role: str = "Candidate"
    questions: list[InterviewQuestion] = Field(default_factory=list)
    generalTips: list[str] = Field(default_factory=list)
    usedModel: str = ""


# ---------------------------------------------------------------------------
# Raw Resume Parsing, Recruiter Audit & Outreach Models
# ---------------------------------------------------------------------------


class ParseRawResumeRequest(BaseModel):
    rawText: str


class RecruiterAuditRequest(BaseModel):
    resumeData: ResumeData
    targetRole: str | None = None


class RecruiterAuditResult(BaseModel):
    firstImpression: str = ""
    callbackProbability: int = 75  # 0 to 100
    strengths: list[str] = Field(default_factory=list)
    redFlags: list[str] = Field(default_factory=list)
    top3Fixes: list[str] = Field(default_factory=list)
    executiveVerdict: str = ""
    usedModel: str = ""


class GenerateOutreachRequest(BaseModel):
    resumeData: ResumeData
    targetRole: str
    companyName: str
    contactType: str = "hiring_manager"  # "hiring_manager" | "recruiter" | "alumni"
    jobDescription: str | None = None


class OutreachResult(BaseModel):
    connectionNote: str = ""  # < 300 chars
    coldEmailSubject: str = ""
    coldEmailBody: str = ""
    referralRequest: str = ""
    followUpNote: str = ""
    usedModel: str = ""


# ---------------------------------------------------------------------------
# Job Tracker (application pipeline) Models
# ---------------------------------------------------------------------------

ApplicationStatus = Literal["wishlist", "applied", "interview", "offer", "rejected"]


class JobApplicationCreate(BaseModel):
    userId: str
    companyName: str
    roleTitle: str
    location: str | None = None
    salary: str | None = None
    status: ApplicationStatus = "applied"
    dateApplied: str = ""
    resumeId: str | None = None
    notes: str | None = None


class JobApplicationUpdate(BaseModel):
    userId: str
    companyName: str | None = None
    roleTitle: str | None = None
    location: str | None = None
    salary: str | None = None
    status: ApplicationStatus | None = None
    dateApplied: str | None = None
    resumeId: str | None = None
    notes: str | None = None


class JobApplication(BaseModel):
    id: str
    companyName: str
    roleTitle: str
    location: str | None = None
    salary: str | None = None
    status: ApplicationStatus = "applied"
    dateApplied: str = ""
    resumeId: str | None = None
    resumeTitle: str | None = None
    notes: str | None = None
    createdAt: datetime | None = None
    updatedAt: datetime | None = None