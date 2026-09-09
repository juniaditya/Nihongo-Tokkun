export function percent(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}
export function masteryLabel(value: number): string {
  return value >= 90 ? 'Sangat Baik' : value >= 75 ? 'Baik' : value >= 60 ? 'Perlu Latihan' : 'Lemah';
}
export function reviewedPercentage(cardIds: string[], reviewedIds: string[]): number {
  const main = new Set(cardIds);
  return main.size ? percent(new Set(reviewedIds.filter(id => main.has(id))).size / main.size * 100) : 0;
}
export function overallPercentage(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + percent(value), 0) / values.length : 0;
}
