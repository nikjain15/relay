// One formatter for every figure, so the policy check can match a figure in a
// draft against the same string produced from its source.
export function usd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}
