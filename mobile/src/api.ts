import { Platform } from "react-native";
import { fetch as expoFetch } from "expo/fetch";

import type {
  ATSAnalysis,
  CoverLetterResult,
  GenerateSummaryResult,
  ImproveBulletResult,
  InsertKeywordsResult,
  InterviewPrepResult,
  JDAnalysis,
  OutreachResult,
  RecruiterAuditResult,
  ResumeData,
  ResumeMeta,
  SuggestSkillsResult,
  TailorResult,
} from "./types";

function getLocalDevHost(): string {
  // Android emulators reach the host machine via 10.0.2.2; iOS simulators and
  // physical devices use localhost (or EXPO_PUBLIC_API_URL).
  return Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
}

// Inlined by Expo CLI at build time (must be referenced with dot notation).
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? getLocalDevHost()).replace(/\/+$/, "");
export const API = `${API_BASE}/api`;

export function apiDoc(): string {
  return Platform.OS === "android" && API_BASE.includes("10.0.2.2")
    ? "Emulator → host backend. Set EXPO_PUBLIC_API_URL in .env for a device."
    : `Backend: ${API_BASE}`;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : detail;
    } catch {
      // non-JSON error response
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const resumesApi = {
  list: (userId: string) => json<ResumeMeta[]>(`/resumes?userId=${encodeURIComponent(userId)}`),
  get: (userId: string, id: string) => json<ResumeMeta>(`/resumes/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`),
  save: (userId: string, title: string, data: ResumeData, template = "modern", targetRole?: string | null) =>
    json<ResumeMeta>("/resumes", {
      method: "POST",
      body: JSON.stringify({ userId, title, data, template, targetRole: targetRole ?? null }),
    }),
  update: (userId: string, id: string, patch: { title?: string; data?: ResumeData; score?: number | null; targetRole?: string | null }) =>
    json<ResumeMeta>(`/resumes/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ userId, ...patch }),
    }),
  remove: (userId: string, id: string) =>
    json<{ deleted: string }>(`/resumes/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, { method: "DELETE" }),
  clone: (userId: string, id: string, title?: string, targetRole?: string | null) =>
    json<ResumeMeta & { data: ResumeData }>(`/resumes/${encodeURIComponent(id)}/clone`, {
      method: "POST",
      body: JSON.stringify({ userId, title, targetRole: targetRole ?? null }),
    }),
  insertKeywords: (userId: string, id: string, keywords: string[], targetSection: "skills" | "summary") =>
    json<InsertKeywordsResult>(`/resumes/${encodeURIComponent(id)}/insert-keywords`, {
      method: "POST",
      body: JSON.stringify({ userId, keywords, targetSection }),
    }),
};

export const aiApi = {
  improveBullet: (bullet: string, role?: string | null) =>
    json<ImproveBulletResult>("/ai/improve-bullet", { method: "POST", body: JSON.stringify({ bullet, role }) }),
  generateSummary: (input: string, targetRole?: string | null) =>
    json<GenerateSummaryResult>("/ai/generate-summary", { method: "POST", body: JSON.stringify({ input, targetRole }) }),
  suggestSkills: (targetRole: string, currentSkills: string[] = []) =>
    json<SuggestSkillsResult>("/ai/suggest-skills", { method: "POST", body: JSON.stringify({ targetRole, currentSkills }) }),
  tailorResume: (resumeData: ResumeData, jd: string) =>
    json<TailorResult>("/ai/tailor-resume", { method: "POST", body: JSON.stringify({ resumeJson: resumeData, jd }) }),
  analyzeJd: (jd: string, resumeText: string = "") =>
    json<JDAnalysis>("/ai/analyze-jd", { method: "POST", body: JSON.stringify({ jd, resumeText }) }),
  generateCoverLetter: (
    resumeData: ResumeData,
    jobDescription: string,
    companyName?: string | null,
    targetRole?: string | null,
    tone: string = "professional",
  ) =>
    json<CoverLetterResult>("/ai/generate-cover-letter", {
      method: "POST",
      body: JSON.stringify({
        resumeData,
        jobDescription,
        companyName: companyName ?? null,
        targetRole: targetRole ?? null,
        tone,
      }),
    }),
  interviewPrep: (
    resumeData: ResumeData,
    jobDescription?: string | null,
    targetRole?: string | null,
  ) =>
    json<InterviewPrepResult>("/ai/interview-prep", {
      method: "POST",
      body: JSON.stringify({
        resumeData,
        jobDescription: jobDescription ?? null,
        targetRole: targetRole ?? null,
      }),
    }),
  parseRawResume: (rawText: string) =>
    json<ResumeData>("/ai/parse-raw-resume", {
      method: "POST",
      body: JSON.stringify({ rawText }),
    }),
  recruiterAudit: (resumeData: ResumeData, targetRole?: string | null) =>
    json<RecruiterAuditResult>("/ai/recruiter-audit", {
      method: "POST",
      body: JSON.stringify({ resumeData, targetRole: targetRole ?? null }),
    }),
  generateOutreach: (
    resumeData: ResumeData,
    companyName: string,
    targetRole: string,
    contactType: string = "hiring_manager",
    jobDescription?: string | null,
  ) =>
    json<OutreachResult>("/ai/generate-outreach", {
      method: "POST",
      body: JSON.stringify({
        resumeData,
        companyName,
        targetRole,
        contactType,
        jobDescription: jobDescription ?? null,
      }),
    }),
};

export const atsApi = {
  score: (resumeData: ResumeData) => json<ATSAnalysis>("/ats/score", { method: "POST", body: JSON.stringify({ resumeData }) }),
};

export const exportApi = {
  text: (data: ResumeData) => json<{ text: string }>("/export/text", { method: "POST", body: JSON.stringify(data) }),
  async pdfBytes(data: ResumeData): Promise<Uint8Array> {
    const res = await expoFetch(`${API}/export/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`PDF export failed (HTTP ${res.status})`);
    }
    return res.bytes();
  },
};