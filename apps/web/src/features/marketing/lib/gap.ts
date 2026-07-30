/** Coverage-to-conviction divergence formatting for the editorial landing. */

export function formatGap(gap: number): string {
  return `${gap >= 0 ? "+" : "−"}${Math.abs(gap)}`;
}

/** Green when the market leads coverage, red when coverage leads, faint when they agree. */
export function gapToneClass(gap: number): string {
  if (Math.abs(gap) <= 5) return "text-faint";
  return gap > 0 ? "text-positive" : "text-negative";
}
