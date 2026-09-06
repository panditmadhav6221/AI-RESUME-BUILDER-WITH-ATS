export interface ContactInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string | null;
  website?: string | null;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa?: string | null;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url?: string | null;
  technologies: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string | null;
}

export interface ResumeData {
  contact: ContactInfo;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
}

export interface ResumeMeta {
  id: string;
  title: string;
  targetRole?: string | null;
  template: string;
  parentId?: string | null;
  score?: number | null;
  data: ResumeData | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PassivePhraseFlag {
  phrase: string;
  suggestion: string;
  position: number;
}

export interface ImproveBulletResult {
  original: string;
  improved: string;
  usedModel: string;
  flags: PassivePhraseFlag[];
}

export interface GenerateSummaryResult {
  summary: string;
  usedModel: string;
}

export interface SuggestSkillsResult {
  skills: string[];
  usedModel: string;
}

export interface TailorResult {
  tailored: ResumeData;
  guardrailWarnings: string[];
  usedModel: string;
}

export interface SkillMatch {
  name: string;
  matched: boolean;
  category: string;
}

export interface JDAnalysis {
  matchedSkills: SkillMatch[];
  missingSkills: SkillMatch[];
  matchPercentage: number;
  keywords: string[];
  suggestions: string[];
}

export interface ATSIssue {
  id: string;
  severity: string;
  category: string;
  message: string;
  fix: string;
}

export interface ATSAnalysis {
  score: number;
  issues: ATSIssue[];
  passedChecks: string[];
  summary: string;
}

export interface InsertKeywordsResult extends ResumeMeta {
  insertedKeywords: string[];
  message: string;
}

export interface CoverLetterResult {
  salutation: string;
  opening: string;
  bodyParagraphs: string[];
  closing: string;
  signoff: string;
  fullText: string;
  usedModel: string;
}

export interface STARAnswer {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface InterviewQuestion {
  id: string;
  type: "behavioral" | "technical" | "leadership";
  question: string;
  whyAsked: string;
  keyPointsToCover: string[];
  sampleStarAnswer?: STARAnswer | null;
}

export interface InterviewPrepResult {
  role: string;
  questions: InterviewQuestion[];
  generalTips: string[];
  usedModel: string;
}

export type ApplicationStatus = "wishlist" | "applied" | "interview" | "offer" | "rejected";

export interface JobApplication {
  id: string;
  companyName: string;
  roleTitle: string;
  location?: string;
  salary?: string;
  status: ApplicationStatus;
  dateApplied: string;
  resumeId?: string;
  resumeTitle?: string;
  notes?: string;
}

export interface RecruiterAuditResult {
  firstImpression: string;
  callbackProbability: number;
  strengths: string[];
  redFlags: string[];
  top3Fixes: string[];
  executiveVerdict: string;
  usedModel: string;
}

export interface OutreachResult {
  connectionNote: string;
  coldEmailSubject: string;
  coldEmailBody: string;
  referralRequest: string;
  followUpNote: string;
  usedModel: string;
}

export function emptyResumeData(): ResumeData {
  return {
    contact: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedin: null,
      website: null,
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}

export function nextId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}