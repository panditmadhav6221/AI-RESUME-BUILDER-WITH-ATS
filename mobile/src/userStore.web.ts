const STORAGE_KEY = "resumebuilder.userId";

let cached: string | null = null;

function generateUserId(): string {
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readFile(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeFile(userId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, userId);
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
