import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { exportApi } from "./api";
import type { ResumeData } from "./types";

function slugify(title: string): string {
  const cleaned = (title || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return cleaned || "resume";
}

/**
 * Generates a PDF via the backend, saves it to the device cache and opens the
 * system share sheet so the user can preview/send the file.
 */
export async function exportPdfAndShare(data: ResumeData, title: string): Promise<string> {
  const bytes = await exportApi.pdfBytes(data);
  const dir = new Directory(Paths.cache, "exports");
  dir.create({ intermediates: true, idempotent: true });
  const file: File = dir.createFile(`${slugify(title)}.pdf`, "application/pdf");
  file.write(bytes);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Share resume PDF",
    });
  }
  return file.uri;
}