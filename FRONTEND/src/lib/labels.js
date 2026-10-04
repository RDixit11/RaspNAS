// Polskie nazwy stanów zwracanych przez API

export const NODE_STATUS = {
  online: { label: 'Działa', tone: 'ok' },
  degraded: { label: 'Wymaga uwagi', tone: 'warning' },
  offline: { label: 'Nie odpowiada', tone: 'off' },
}

export const DISK_STATE = {
  ok: { label: 'Sprawny', tone: 'ok' },
  warning: { label: 'Ostrzeżenie', tone: 'warning' },
  failed: { label: 'Awaria', tone: 'error' },
  new: { label: 'Nowy dysk', tone: 'info' },
  formatting: { label: 'Formatowanie', tone: 'info' },
  empty: { label: 'Pusta kieszeń', tone: 'off' },
}

export const ACCESS = {
  write: 'Odczyt i zapis',
  read: 'Tylko odczyt',
}

export const ROLE = {
  admin: 'Administrator',
  user: 'Użytkownik',
}

export const LOG_LEVEL = {
  info: 'Informacja',
  warning: 'Ostrzeżenie',
  error: 'Błąd',
}

export const LOG_CATEGORY = {
  auth: 'Logowanie',
  files: 'Pliki',
  nodes: 'Węzły',
  shares: 'Udziały',
  users: 'Użytkownicy',
  backup: 'Kopie zapasowe',
  system: 'System',
}

// klasy kolorów dla „tonów” stanu — kropki i plakietki w obu motywach
export const TONE_DOT = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-sky-500',
  off: 'bg-neutral-400 dark:bg-neutral-500',
}

export const TONE_BADGE = {
  ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  error: 'bg-red-500/15 text-red-700 dark:text-red-300',
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  off: 'bg-muted text-muted-foreground',
}
