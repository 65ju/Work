const PREFIX = "ideawall:v1:";

/** localStorage-Zugriff, der im privaten Modus oder bei voller Quota nie wirft. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* Speicher nicht verfügbar – die Seite funktioniert trotzdem. */
  }
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignorieren */
  }
}

export function sessionFlag(key: string): boolean {
  try {
    return window.sessionStorage.getItem(PREFIX + key) === "1";
  } catch {
    return false;
  }
}

export function setSessionFlag(key: string): void {
  try {
    window.sessionStorage.setItem(PREFIX + key, "1");
  } catch {
    /* ignorieren */
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}
