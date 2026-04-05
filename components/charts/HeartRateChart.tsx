"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { HeartRateModel } from "@/lib/types/oura";

interface HeartRateChartProps {
  heartRate: HeartRateModel[];
}

// Down-sample to at most maxPoints for performance
function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0);
}

export default function HeartRateChart({ heartRate }: HeartRateChartProps) {
  if (!heartRate.length) {
    return <p className="text-gray-400 text-sm">No heart rate data for this period.</p>;
  }

  const sampled = downsample(heartRate, 500);

  const data = sampled.map((h) => ({
    ts: h.timestamp,
    bpm: h.bpm,
    source: h.source,
    label: format(parseISO(h.timestamp), "MMM d HH:mm"),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white border border-gray-200 rounded p-2 text-xs shadow">
        <p>{d.label}</p>
        <p>HR: <strong>{d.bpm} bpm</strong></p>
        <p className="text-gray-500">{d.source}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
          tickFormatter={(v: string) => v.slice(0, 6)}
        />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} unit=" bpm" />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="bpm"
          stroke="#ef4444"
          strokeWidth={1.5}
          fill="url(#hrGradient)"
          dot={false}
          name="HR"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
