// ============================================================
// MyLevain Agro — Auth helpers (client-side session management)
// ============================================================

export interface AppUser {
  id: string;
  email: string;
  nom: string;
  role: 'admin' | 'user';
  approved: boolean;
}

const SESSION_KEY = 'mylevain_session';

export function getSession(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export function setSession(user: AppUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isAdmin(user: AppUser | null): boolean {
  return user?.role === 'admin';
}
