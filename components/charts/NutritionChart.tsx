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
import type { MFPDailyNutrition } from "@/lib/types/myfitnesspal";

interface NutritionChartProps {
  daily: MFPDailyNutrition[];
}

function buildChartData(daily: MFPDailyNutrition[]) {
  return daily.map((d) => ({
    date: d.date,
    label: format(parseISO(d.date), "MMM d"),
    calories: d.calories,
    protein: Math.round(d.protein),
    carbohydrates: Math.round(d.carbohydrates),
    fat: Math.round(d.fat),
    fiber: Math.round(d.fiber),
    sugar: Math.round(d.sugar),
    sodium: Math.round(d.sodium),
    meals: d.meals,
  }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded p-3 text-xs shadow-lg max-w-xs">
      <p className="font-semibold mb-2">{label}</p>
      <p className="mb-1">
        Calories: <strong>{d.calories} kcal</strong>
      </p>
      <div className="space-y-0.5">
        <p>
          <span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />
          Protein: {d.protein}g
        </p>
        <p>
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-400 mr-1" />
          Carbs: {d.carbohydrates}g
        </p>
        <p>
          <span className="inline-block w-2 h-2 rounded-sm bg-red-400 mr-1" />
          Fat: {d.fat}g
        </p>
        {d.fiber > 0 && <p className="text-gray-400">Fiber: {d.fiber}g</p>}
        {d.sugar > 0 && <p className="text-gray-400">Sugar: {d.sugar}g</p>}
        {d.sodium > 0 && (
          <p className="text-gray-400">Sodium: {d.sodium}mg</p>
        )}
      </div>
      {d.meals?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
          {d.meals.map((m: any, i: number) => (
            <p key={i} className="text-gray-500">
              {m.meal}: {m.calories} kcal
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default function NutritionChart({ daily }: NutritionChartProps) {
  if (!daily.length) {
    return (
      <p className="text-gray-400 text-sm">
        No nutrition data for this period.
      </p>
    );
  }

  const data = buildChartData(daily);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis
          yAxisId="grams"
          unit="g"
          tick={{ fontSize: 11 }}
          label={{ value: "Macros (g)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#9ca3af" } }}
        />
        <YAxis
          yAxisId="kcal"
          orientation="right"
          unit=" kcal"
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="grams"
          dataKey="protein"
          stackId="macros"
          fill="#3b82f6"
          name="Protein (g)"
        />
        <Bar
          yAxisId="grams"
          dataKey="carbohydrates"
          stackId="macros"
          fill="#fbbf24"
          name="Carbs (g)"
        />
        <Bar
          yAxisId="grams"
          dataKey="fat"
          stackId="macros"
          fill="#f87171"
          name="Fat (g)"
        />
        <Line
          yAxisId="kcal"
          type="monotone"
          dataKey="calories"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: "#10b981" }}
          name="Calories (kcal)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
