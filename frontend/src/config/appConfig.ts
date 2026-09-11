/**
 * DocuFlow AI — Application Configuration
 *
 * Configurable timeout for guest users before prompting login/signup.
 * Configured default: 50 minutes (50 * 60 * 1000 ms).
 */
export const LOGIN_TIMEOUT = 50 * 60 * 1000;

export const GUEST_SESSION_KEY = 'docuflow_guest_started_at';
export const GUEST_PROMPT_DISMISSED_KEY = 'docuflow_guest_prompt_dismissed';

export interface GuestSessionState {
  startedAt: number;
  remainingMs: number;
  isExpired: boolean;
}

/**
 * Gets or initializes the guest session start timestamp.
 */
export function getOrCreateGuestSession(): number {
  const existing = localStorage.getItem(GUEST_SESSION_KEY);
  if (existing) {
    const timestamp = parseInt(existing, 10);
    if (!isNaN(timestamp) && timestamp > 0) {
      return timestamp;
    }
  }
  const now = Date.now();
  localStorage.setItem(GUEST_SESSION_KEY, now.toString());
  return now;
}

/**
 * Checks the current guest session status against LOGIN_TIMEOUT.
 */
export function getGuestSessionState(): GuestSessionState {
  const startedAt = getOrCreateGuestSession();
  const elapsed = Date.now() - startedAt;
  const remainingMs = Math.max(0, LOGIN_TIMEOUT - elapsed);

  return {
    startedAt,
    remainingMs,
    isExpired: remainingMs <= 0,
  };
}

/**
 * Resets or extends the guest session by another LOGIN_TIMEOUT duration.
 */
export function extendGuestSession(): void {
  localStorage.setItem(GUEST_SESSION_KEY, Date.now().toString());
}

/**
 * Clears guest session data upon authentication.
 */
export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_SESSION_KEY);
  localStorage.removeItem(GUEST_PROMPT_DISMISSED_KEY);
}
