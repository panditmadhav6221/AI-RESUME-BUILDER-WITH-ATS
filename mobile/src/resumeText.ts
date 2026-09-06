import type { ResumeData } from "./types";

// Heuristics tuned to the backend export template: US Letter, 10pt, ~0.55/0.6in margins.
const LINE_CHARS = 95;
const LINES_PER_PAGE = 46;

function lineCount(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / LINE_CHARS));
}

/**
 * Estimates how many A4/Letter pages the resume would occupy when exported,
 * and where the first page boundary falls in the plain-text preview.
 */
export function estimatePages(text: string): { pages: number; pageOneEndIndex: number } {
  const lines = text.split("\n");
  let totalLines = 0;
  let consumed = 0;
  let pageOneEndIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const len = lines[i].length;
    const count = lineCount(len === 0 ? "\n" : lines[i]);
    const before = totalLines;
    if (before < LINES_PER_PAGE && before + count >= LINES_PER_PAGE) {
      const partial = LINES_PER_PAGE - before;
      let idx = consumed + (len === 0 ? 1 : Math.round((partial / count) * len));
      idx = Math.min(idx, consumed + len);
      const nl = text.indexOf("\n", idx);
      pageOneEndIndex = nl === -1 && idx < text.length ? text.length : nl === -1 ? text.length : nl + 1;
      break;
    }
    totalLines += count;
    consumed += len + 1;
  }

  if (pageOneEndIndex === -1) pageOneEndIndex = text.length;
  return { pages: Math.max(1, Math.ceil(totalLines / LINES_PER_PAGE)), pageOneEndIndex: Math.min(pageOneEndIndex, text.length) };
}

function formatRange(start: string, end: string, current: boolean): string {
  if (current || !end) return `${start || ""} – Present`;
  return `${start || ""} – ${end || ""}`;
}

/**
 * Builds an ATS-friendly plain-text layout locally (mirrors the server's
 * /api/export/text output closely enough for preview + one-page estimation).
 */
export function resumeToPlainText(d: ResumeData): string {
  const parts: string[] = [];

  if (d.contact.fullName) parts.push(d.contact.fullName.toUpperCase());
  const contactBits = [
    d.contact.email,
    d.contact.phone,
    d.contact.location,
    d.contact.linkedin ?? "",
    d.contact.website ?? "",
  ].filter(Boolean);
  if (contactBits.length) parts.push(contactBits.join(" | "));

  const sections: string[] = [];

  if (d.summary.trim()) sections.push(`SUMMARY\n${d.summary.trim()}`);

  if (d.experience.length) {
    const exp = d.experience
      .map((e) => {
        const lines = [`${e.position}${e.company ? ` - ${e.company}` : ""}`, e.location, formatRange(e.startDate, e.endDate, e.current)];
        e.bullets.forEach((b) => b.trim() && lines.push(`- ${b.trim()}`));
        return lines.filter(Boolean).join("\n");
      })
      .join("\n\n");
    sections.push(`EXPERIENCE\n${exp}`);
  }

  if (d.education.length) {
    const edu = d.education
      .map((e) => {
        const line = [e.degree, e.field].filter(Boolean).join(" in ");
        const partsArr = [e.institution, line, formatRange(e.startDate, e.endDate, false), e.gpa ? `GPA: ${e.gpa}` : ""].filter(Boolean);
        return partsArr.join(" - ");
      })
      .join("\n");
    sections.push(`EDUCATION\n${edu}`);
  }

  if (d.skills.length) sections.push(`SKILLS\n${d.skills.map((s) => s.name).join(", ")}`);

  if (d.projects.length) {
    const proj = d.projects
      .map((p) => {
        const lines = [p.name, p.description, p.technologies.length ? `Technologies: ${p.technologies.join(", ")}` : "", p.url ?? ""].filter(Boolean);
        return lines.join("\n");
      })
      .join("\n\n");
    sections.push(`PROJECTS\n${proj}`);
  }

  if (d.certifications.length) {
    const cert = d.certifications.map((c) => `${c.name}${c.issuer ? ` - ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`).join("\n");
    sections.push(`CERTIFICATIONS\n${cert}`);
  }

  return parts.concat(sections).join("\n\n");
}

/** Raw text fed into summary-generation / keyword extraction. */
export function buildSourceText(d: ResumeData): string {
  return [
    d.summary.trim(),
    ...d.experience.map((e) => [e.position, e.company, e.location, formatRange(e.startDate, e.endDate, e.current), ...e.bullets].filter(Boolean).join(" ").trim()),
    ...d.education.map((e) => [e.institution, e.degree, e.field].filter(Boolean).join(" ").trim()),
    ...d.skills.map((s) => s.name).join(", "),
  ]
    .filter(Boolean)
    .join("\n");
}