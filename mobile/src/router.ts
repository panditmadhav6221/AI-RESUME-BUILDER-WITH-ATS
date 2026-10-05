export function readRoute(): string | null {
  return null;
}

export function writeRoute(_name: string): void {
  // Native has no address bar; navigation stays in memory.
}

export function subscribeToRoute(_onRoute: (name: string | null) => void): () => void {
  return () => {};
}
