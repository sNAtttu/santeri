"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DailyStressModel, DailyResilienceModel } from "@/lib/types/oura";

interface StressChartProps {
  stress: DailyStressModel[];
  resilience: DailyResilienceModel[];
}

const RESILIENCE_LEVELS: Record<string, number> = {
  limited: 1,
  adequate: 2,
  solid: 3,
  strong: 4,
  exceptional: 5,
};

export default function StressResilienceChart({ stress, resilience }: StressChartProps) {
  if (!stress.length && !resilience.length) {
    return <p className="text-gray-400 text-sm">No stress or resilience data for this period.</p>;
  }

  const resilienceByDay: Record<string, DailyResilienceModel> = {};
  for (const r of resilience) resilienceByDay[r.day] = r;

  // Merge stress and resilience on day
  const stressByDay: Record<string, DailyStressModel> = {};
  for (const s of stress) stressByDay[s.day] = s;

  const allDays = Array.from(
    new Set([...stress.map((s) => s.day), ...resilience.map((r) => r.day)])
  ).sort();

  const data = allDays.map((day) => {
    const s = stressByDay[day];
    const r = resilienceByDay[day];
    return {
      date: day,
      label: format(parseISO(day), "MMM d"),
      stressHigh: s?.stress_high != null ? Math.round(s.stress_high / 60) : null,
      recoveryHigh: s?.recovery_high != null ? Math.round(s.recovery_high / 60) : null,
      resilience: r?.level != null ? RESILIENCE_LEVELS[r.level] : null,
      resilienceLabel: r?.level ?? null,
      daySummary: s?.day_summary ?? null,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white border border-gray-200 rounded p-3 text-xs shadow-lg">
        <p className="font-semibold mb-1">{label}</p>
        {d.daySummary && <p>Day: {d.daySummary}</p>}
        {d.stressHigh != null && <p>High stress: {d.stressHigh} min</p>}
        {d.recoveryHigh != null && <p>High recovery: {d.recoveryHigh} min</p>}
        {d.resilienceLabel && <p>Resilience: {d.resilienceLabel}</p>}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="mins" unit="m" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="resilience" orientation="right" domain={[0, 5]} tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line yAxisId="mins" type="monotone" dataKey="stressHigh" stroke="#ef4444" strokeWidth={2} dot={false} name="Stress (min)" />
        <Line yAxisId="mins" type="monotone" dataKey="recoveryHigh" stroke="#10b981" strokeWidth={2} dot={false} name="Recovery (min)" />
        <Line yAxisId="resilience" type="monotone" dataKey="resilience" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Resilience" strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
