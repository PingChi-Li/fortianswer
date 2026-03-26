import { STORAGE_KEYS } from './constants'

export type ThemeMode = 'light' | 'dark'

/** Toggle Tailwind `dark:` variants via `<html class="dark">` (requires `darkMode: 'class'`). */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

/** Persist explicit user choice (light/dark only). */
export function persistTheme(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEYS.THEME, mode)
}

/** Normalize saved admin/settings value (legacy `auto` → resolve once). */
export function normalizeThemeValue(raw: unknown): ThemeMode {
  if (raw === 'dark') return 'dark'
  if (raw === 'light') return 'light'
  if (raw === 'auto' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

/**
 * Run before React mounts. Resolves `fortianswer_theme`:
 * - `light` / `dark` → use as-is
 * - `auto` (legacy) or missing → follow `prefers-color-scheme` (OS/browser, e.g. Windows 11 dark mode)
 */
export function initThemeFromStorage(): void {
  const raw = localStorage.getItem(STORAGE_KEYS.THEME)
  let mode: ThemeMode
  if (raw === 'dark' || raw === 'light') {
    mode = raw
  } else if (raw === 'auto') {
    mode = normalizeThemeValue('auto')
  } else if (typeof window !== 'undefined') {
    mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } else {
    mode = 'light'
  }
  applyTheme(mode)
}
