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
import type { DailySleepModel, SleepModel } from "@/lib/types/oura";
import type { StravaActivitySummary } from "@/lib/types/strava";
import { formatDuration } from "@/lib/utils";

interface SleepChartProps {
  dailySleep: DailySleepModel[];
  sleepPeriods: SleepModel[];
  stravaActivities: StravaActivitySummary[];
}

function buildSleepChartData(
  dailySleep: DailySleepModel[],
  sleepPeriods: SleepModel[],
  stravaActivities: StravaActivitySummary[]
) {
  // Index detailed sleep periods by day
  const periodsByDay: Record<string, SleepModel[]> = {};
  for (const p of sleepPeriods) {
    if (p.type === "deleted") continue;
    periodsByDay[p.day] = periodsByDay[p.day] ?? [];
    periodsByDay[p.day].push(p);
  }

  // Index strava workouts by local date (YYYY-MM-DD)
  const activitiesByDay: Record<string, StravaActivitySummary[]> = {};
  for (const a of stravaActivities) {
    const day = a.start_date_local.slice(0, 10);
    activitiesByDay[day] = activitiesByDay[day] ?? [];
    activitiesByDay[day].push(a);
  }

  return dailySleep.map((d) => {
    // Sum sleep stages from detailed periods for this day
    const periods = periodsByDay[d.day] ?? [];
    const deep = periods.reduce((s, p) => s + (p.deep_sleep_duration ?? 0), 0);
    const rem = periods.reduce((s, p) => s + (p.rem_sleep_duration ?? 0), 0);
    const light = periods.reduce((s, p) => s + (p.light_sleep_duration ?? 0), 0);
    const awake = periods.reduce((s, p) => s + (p.awake_time ?? 0), 0);
    const hrv = periods.length > 0
      ? Math.round(periods.reduce((s, p) => s + (p.average_hrv ?? 0), 0) / periods.length)
      : null;

    // Previous day's Strava workouts (activity yesterday → sleep today)
    const prevDate = new Date(d.day);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDay = prevDate.toISOString().slice(0, 10);
    const prevActivities = activitiesByDay[prevDay] ?? [];

    return {
      date: d.day,
      label: format(parseISO(d.day), "MMM d"),
      score: d.score ?? null,
      deep: deep ? Math.round(deep / 60) : null,    // minutes
      rem: rem ? Math.round(rem / 60) : null,
      light: light ? Math.round(light / 60) : null,
      awake: awake ? Math.round(awake / 60) : null,
      hrv,
      hadActivity: prevActivities.length > 0,
      activityLabel: prevActivities.map((a) => a.name).join(", ") || undefined,
    };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded p-3 text-xs shadow-lg max-w-xs">
      <p className="font-semibold mb-1">{label}</p>
      {d.score !== null && <p>Sleep score: <strong>{d.score}</strong></p>}
      {d.deep !== null && <p>Deep: {formatDuration(d.deep * 60)}</p>}
      {d.rem !== null && <p>REM: {formatDuration(d.rem * 60)}</p>}
      {d.light !== null && <p>Light: {formatDuration(d.light * 60)}</p>}
      {d.awake !== null && <p>Awake: {formatDuration(d.awake * 60)}</p>}
      {d.hrv !== null && d.hrv > 0 && <p>HRV: {d.hrv} ms</p>}
      {d.hadActivity && (
        <p className="mt-1 text-orange-600 font-medium">
          Activity day before: {d.activityLabel ?? "workout"}
        </p>
      )}
    </div>
  );
};

export default function SleepChart({ dailySleep, sleepPeriods, stravaActivities }: SleepChartProps) {
  if (!dailySleep.length) {
    return <p className="text-gray-400 text-sm">No sleep data for this period.</p>;
  }

  const data = buildSleepChartData(dailySleep, sleepPeriods, stravaActivities);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="mins" unit="m" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="score" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="mins" dataKey="deep" stackId="sleep" fill="#4f46e5" name="Deep (min)" />
        <Bar yAxisId="mins" dataKey="rem" stackId="sleep" fill="#7c3aed" name="REM (min)" />
        <Bar yAxisId="mins" dataKey="light" stackId="sleep" fill="#a78bfa" name="Light (min)" />
        <Bar yAxisId="mins" dataKey="awake" stackId="sleep" fill="#e5e7eb" name="Awake (min)" />
        <Line
          yAxisId="score"
          type="monotone"
          dataKey="score"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (payload.hadActivity) {
              return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={5} fill="#f97316" stroke="#fff" strokeWidth={1.5} />;
            }
            return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={3} fill="#f59e0b" />;
          }}
          name="Score"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
