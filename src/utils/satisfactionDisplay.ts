/**
 * Formats API `satisfactionRate` for display as "N%".
 *
 * Some backends send a **fraction** in [0, 1] (e.g. 0.75 → 75%).
 * Others send a **percent** in [0, 100] (e.g. 75 → 75%).
 * If we always multiply by 100, a value of `100` becomes 10000%.
 */
export function formatSatisfactionPercent(rate: number): string {
  if (!Number.isFinite(rate)) return '—'
  const pct = rate > 1 ? rate : rate * 100
  const clamped = Math.min(100, Math.max(0, pct))
  return `${Math.round(clamped)}%`
}
