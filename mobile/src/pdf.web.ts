import { exportApi } from "./api";
import type { ResumeData } from "./types";

function slugify(title: string): string {
  const cleaned = (title || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return cleaned || "resume";
}

interface ShareCapableNavigator extends Navigator {
  canShare?: (data: ShareData) => boolean;
}

/**
 * Generates a PDF via the backend and hands it to the browser: the Web Share
 * API when available, otherwise a plain download. Native writes to the cache
 * directory and opens the system share sheet instead.
 */
export async function exportPdfAndShare(data: ResumeData, title: string): Promise<string> {
  const bytes = await exportApi.pdfBytes(data);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const filename = `${slugify(title)}.pdf`;

  const nav = navigator as ShareCapableNavigator;
  if (typeof nav.share === "function" && typeof nav.canShare === "function") {
    try {
      const file = new File([blob], filename, { type: "application/pdf" });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename });
        URL.revokeObjectURL(url);
        return url;
      }
    } catch {
      // User dismissed the share sheet, or it failed — fall back to download.
    }
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return url;
}
