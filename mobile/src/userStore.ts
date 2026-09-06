import { File, Paths } from "expo-file-system";

let cached: string | null = null;

function generateUserId(): string {
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readFile(): string | null {
  try {
    const file = new File(Paths.document, "user.json");
    if (!file.exists) return null;
    const raw = file.textSync();
    return raw ? (JSON.parse(raw).userId as string) : null;
  } catch {
    return null;
  }
}

function writeFile(userId: string): void {
  try {
    const file = new File(Paths.document, "user.json");
    file.create({ overwrite: true });
    file.write(JSON.stringify({ userId }));
  } catch {
    // Persistence is best-effort; the in-memory id still works for the session.
  }
}

export async function getUserId(): Promise<string> {
  if (cached) return cached;
  cached = readFile();
  if (!cached) {
    cached = generateUserId();
    writeFile(cached);
  }
  return cached;
}

export function resetCachedUserId(): void {
  cached = null;
}