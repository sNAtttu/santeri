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
import type { DailyReadinessModel } from "@/lib/types/oura";
import type { StravaActivitySummary } from "@/lib/types/strava";

interface ReadinessChartProps {
  readiness: DailyReadinessModel[];
  stravaActivities: StravaActivitySummary[];
}

function buildData(readiness: DailyReadinessModel[], stravaActivities: StravaActivitySummary[]) {
  const activitiesByDay: Record<string, StravaActivitySummary[]> = {};
  for (const a of stravaActivities) {
    const day = a.start_date_local.slice(0, 10);
    activitiesByDay[day] = activitiesByDay[day] ?? [];
    activitiesByDay[day].push(a);
  }

  return readiness.map((r) => {
    const prevDate = new Date(r.day);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDay = prevDate.toISOString().slice(0, 10);
    const prevActivities = activitiesByDay[prevDay] ?? [];
    const sameDay = activitiesByDay[r.day] ?? [];

    return {
      date: r.day,
      label: format(parseISO(r.day), "MMM d"),
      score: r.score ?? null,
      hrv_balance: r.contributors.hrv_balance ?? null,
      rhr: r.contributors.resting_heart_rate ?? null,
      sleep_balance: r.contributors.sleep_balance ?? null,
      temperature_deviation: r.temperature_deviation
        ? Math.round(r.temperature_deviation * 100) / 100
        : null,
      hadActivityYesterday: prevActivities.length > 0,
      hadActivityToday: sameDay.length > 0,
    };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded p-3 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {d.score !== null && <p>Readiness: <strong>{d.score}</strong></p>}
      {d.hrv_balance !== null && <p>HRV balance: {d.hrv_balance}</p>}
      {d.rhr !== null && <p>Resting HR: {d.rhr}</p>}
      {d.sleep_balance !== null && <p>Sleep balance: {d.sleep_balance}</p>}
      {d.temperature_deviation !== null && (
        <p>Temp deviation: {d.temperature_deviation > 0 ? "+" : ""}{d.temperature_deviation}°C</p>
      )}
      {d.hadActivityYesterday && <p className="mt-1 text-orange-600 font-medium">Workout yesterday</p>}
      {d.hadActivityToday && <p className="mt-1 text-blue-600 font-medium">Workout today</p>}
    </div>
  );
};

export default function ReadinessChart({ readiness, stravaActivities }: ReadinessChartProps) {
  if (!readiness.length) {
    return <p className="text-gray-400 text-sm">No readiness data for this period.</p>;
  }

  const data = buildData(readiness, stravaActivities);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="score" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="contrib" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="contrib" dataKey="hrv_balance" fill="#6366f1" name="HRV balance" opacity={0.6} />
        <Bar yAxisId="contrib" dataKey="sleep_balance" fill="#8b5cf6" name="Sleep balance" opacity={0.6} />
        <Line
          yAxisId="score"
          type="monotone"
          dataKey="score"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (payload.hadActivityYesterday) {
              return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={5} fill="#f97316" stroke="#fff" strokeWidth={1.5} />;
            }
            return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={3} fill="#10b981" />;
          }}
          name="Score"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
