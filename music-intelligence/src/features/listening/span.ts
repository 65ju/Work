export function formatMetricSpan(hours: number) {
  if (hours < 1) return "less than an hour";
  if (hours < 48) return `about ${Math.round(hours)} hours`;
  return `about ${Math.round(hours / 24)} days`;
}
