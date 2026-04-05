"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { format, subDays } from "date-fns";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
}

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
];

export default function DateRangePicker({ startDate, endDate }: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateRange = useCallback(
    (start: string, end: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("startDate", start);
      params.set("endDate", end);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const applyPreset = (days: number) => {
    const end = format(new Date(), "yyyy-MM-dd");
    const start = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
    updateRange(start, end);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">From</label>
        <input
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => updateRange(e.target.value, endDate)}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">To</label>
        <input
          type="date"
          value={endDate}
          min={startDate}
          max={format(new Date(), "yyyy-MM-dd")}
          onChange={(e) => updateRange(startDate, e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => applyPreset(p.days)}
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
