const STORAGE_KEY = 'resume-builder-user-id'

/**
 * Anonymous, browser-scoped identity. There is no auth: the backend scopes every
 * resume/application by this id, so it must be stable across sessions.
 */
export function getUserId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    // Private mode / storage disabled: fall back to a session-scoped id.
    return `web-${Date.now().toString(36)}`
  }
}

export function resetUserId(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
