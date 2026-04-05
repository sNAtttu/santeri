"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DailyActivityModel } from "@/lib/types/oura";
import type { StravaActivitySummary } from "@/lib/types/strava";

interface ActivityChartProps {
  activity: DailyActivityModel[];
  stravaActivities: StravaActivitySummary[];
}

function buildData(activity: DailyActivityModel[], stravaActivities: StravaActivitySummary[]) {
  const stravaByDay: Record<string, StravaActivitySummary[]> = {};
  for (const a of stravaActivities) {
    const day = a.start_date_local.slice(0, 10);
    stravaByDay[day] = stravaByDay[day] ?? [];
    stravaByDay[day].push(a);
  }

  return activity.map((a) => {
    const strava = stravaByDay[a.day] ?? [];
    const stravaCalories = strava.reduce((s, x) => s + (x.calories ?? 0), 0);
    const stravaDistance = strava.reduce((s, x) => s + (x.distance ?? 0), 0);

    return {
      date: a.day,
      label: format(parseISO(a.day), "MMM d"),
      score: a.score ?? null,
      steps: a.steps,
      active_calories: a.active_calories,
      high_activity: Math.round(a.high_activity_time / 60),
      medium_activity: Math.round(a.medium_activity_time / 60),
      stravaActivities: strava.length,
      stravaCalories: stravaCalories || null,
      stravaDistanceKm: stravaDistance ? Math.round(stravaDistance / 100) / 10 : null,
    };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded p-3 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {d.score !== null && <p>Activity score: <strong>{d.score}</strong></p>}
      <p>Steps: {d.steps?.toLocaleString()}</p>
      <p>Active calories: {d.active_calories} kcal</p>
      {d.high_activity > 0 && <p>High intensity: {d.high_activity} min</p>}
      {d.medium_activity > 0 && <p>Medium intensity: {d.medium_activity} min</p>}
      {d.stravaActivities > 0 && (
        <>
          <p className="mt-1 text-blue-600 font-medium">
            {d.stravaActivities} Strava workout{d.stravaActivities > 1 ? "s" : ""}
          </p>
          {d.stravaDistanceKm && <p>Distance: {d.stravaDistanceKm} km</p>}
          {d.stravaCalories && <p>Workout calories: {d.stravaCalories} kcal</p>}
        </>
      )}
    </div>
  );
};

export default function ActivityChart({ activity, stravaActivities }: ActivityChartProps) {
  if (!activity.length) {
    return <p className="text-gray-400 text-sm">No activity data for this period.</p>;
  }

  const data = buildData(activity, stravaActivities);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="steps" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="score" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="steps" dataKey="steps" fill="#06b6d4" name="Steps" opacity={0.7} />
        <Bar yAxisId="steps" dataKey="stravaDistanceKm" fill="#f97316" name="Strava km" opacity={0.8} />
        <Line
          yAxisId="score"
          type="monotone"
          dataKey="score"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Score"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
