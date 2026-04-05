// Shared utility: score value → semantic colour class
export function scoreColor(score: number | undefined | null): string {
  if (score === null || score === undefined) return "text-gray-400";
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-red-500";
}

// Convert seconds → "Xh Ym" string
export function formatDuration(seconds: number | undefined | null): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// Convert meters → km with 2dp
export function metersToKm(meters: number | undefined | null): string {
  if (meters == null) return "—";
  return (meters / 1000).toFixed(2);
}

// Convert m/s → min/km pace string
export function speedToPace(mps: number | undefined | null): string {
  if (!mps || mps === 0) return "—";
  const secPerKm = 1000 / mps;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}
