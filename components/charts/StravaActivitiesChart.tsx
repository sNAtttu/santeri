"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { StravaActivitySummary } from "@/lib/types/strava";
import { metersToKm, speedToPace, formatDuration } from "@/lib/utils";

interface StravaActivitiesChartProps {
  activities: StravaActivitySummary[];
}

const SPORT_COLORS: Record<string, string> = {
  Run: "#f97316",
  Ride: "#3b82f6",
  Swim: "#06b6d4",
  Walk: "#84cc16",
  Hike: "#a16207",
  WeightTraining: "#8b5cf6",
  Yoga: "#ec4899",
  default: "#9ca3af",
};

function getColor(sportType: string): string {
  return SPORT_COLORS[sportType] ?? SPORT_COLORS.default;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as StravaActivitySummary & { label: string };
  return (
    <div className="bg-white border border-gray-200 rounded p-3 text-xs shadow-lg max-w-xs">
      <p className="font-semibold mb-1">{d.name}</p>
      <p className="text-gray-500">{d.label} · {d.sport_type}</p>
      <p>Distance: {metersToKm(d.distance)} km</p>
      <p>Duration: {formatDuration(d.moving_time)}</p>
      <p>Pace: {speedToPace(d.average_speed)}</p>
      {d.average_heartrate && <p>Avg HR: {Math.round(d.average_heartrate)} bpm</p>}
      {d.total_elevation_gain > 0 && <p>Elevation: {Math.round(d.total_elevation_gain)} m</p>}
      {d.suffer_score != null && <p>Suffer score: {d.suffer_score}</p>}
    </div>
  );
};

export default function StravaActivitiesChart({ activities }: StravaActivitiesChartProps) {
  if (!activities.length) {
    return <p className="text-gray-400 text-sm">No Strava activities in this period.</p>;
  }

  const sorted = [...activities].sort(
    (a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
  );

  const data = sorted.map((a) => ({
    ...a,
    label: format(parseISO(a.start_date_local), "MMM d"),
    distanceKm: a.distance / 1000,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis unit=" km" tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="distanceKm" name="Distance (km)" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.sport_type)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
