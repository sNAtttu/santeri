"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format, subDays } from "date-fns";
import DateRangePicker from "@/components/DateRangePicker";
import MetricCard from "@/components/MetricCard";
import SleepChart from "@/components/charts/SleepChart";
import ReadinessChart from "@/components/charts/ReadinessChart";
import ActivityChart from "@/components/charts/ActivityChart";
import HeartRateChart from "@/components/charts/HeartRateChart";
import StravaActivitiesChart from "@/components/charts/StravaActivitiesChart";
import StressResilienceChart from "@/components/charts/StressResilienceChart";
import NutritionChart from "@/components/charts/NutritionChart";
import { scoreColor, formatDuration, metersToKm } from "@/lib/utils";
import type {
  DailySleepModel,
  SleepModel,
  DailyReadinessModel,
  DailyActivityModel,
  HeartRateModel,
  DailyStressModel,
  DailyResilienceModel,
  DailySpO2Model,
  VO2MaxModel,
} from "@/lib/types/oura";
import type { StravaActivitySummary, StravaAthlete, StravaAthleteStats } from "@/lib/types/strava";
import type { MFPDailyNutrition } from "@/lib/types/myfitnesspal";

interface OuraData {
  dailySleep: DailySleepModel[];
  sleepPeriods: SleepModel[];
  readiness: DailyReadinessModel[];
  activity: DailyActivityModel[];
  heartRate: HeartRateModel[];
  stress: DailyStressModel[];
  resilience: DailyResilienceModel[];
  spo2: DailySpO2Model[];
  vo2max: VO2MaxModel[];
}

interface StravaData {
  athlete: StravaAthlete;
  activities: StravaActivitySummary[];
  stats: StravaAthleteStats;
}

// Cross-service insight: detect when a workout was followed by a lower sleep score
function generateInsights(
  dailySleep: DailySleepModel[],
  stravaActivities: StravaActivitySummary[],
  readiness: DailyReadinessModel[],
  mfpDaily: MFPDailyNutrition[]
): string[] {
  const insights: string[] = [];

  const activitiesByDay: Record<string, StravaActivitySummary[]> = {};
  for (const a of stravaActivities) {
    const day = a.start_date_local.slice(0, 10);
    activitiesByDay[day] = activitiesByDay[day] ?? [];
    activitiesByDay[day].push(a);
  }

  const sleepByDay: Record<string, DailySleepModel> = {};
  for (const s of dailySleep) sleepByDay[s.day] = s;

  // Insight: workout → lower sleep score next day
  for (const [day, acts] of Object.entries(activitiesByDay)) {
    const nextDate = new Date(day);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDay = nextDate.toISOString().slice(0, 10);
    const sleep = sleepByDay[nextDay];
    const prevSleep = sleepByDay[day];

    if (sleep?.score != null && prevSleep?.score != null) {
      const drop = prevSleep.score - sleep.score;
      if (drop >= 8) {
        const names = acts.map((a) => a.name).join(" & ");
        insights.push(
          `${format(new Date(day), "MMM d")}: "${names}" was followed by a ${drop}-point drop in sleep score (${prevSleep.score} → ${sleep.score}).`
        );
      }
    }
  }

  // Insight: average sleep score with vs without prior-day workout
  const totalDays = dailySleep.length;
  const activeDays = Object.keys(activitiesByDay).length;
  const pct = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;

  const avgSleepWithActivity = dailySleep
    .filter((d) => {
      const prev = new Date(d.day);
      prev.setDate(prev.getDate() - 1);
      return (activitiesByDay[prev.toISOString().slice(0, 10)]?.length ?? 0) > 0;
    })
    .map((d) => d.score ?? 0)
    .filter((s) => s > 0);

  const avgSleepWithoutActivity = dailySleep
    .filter((d) => {
      const prev = new Date(d.day);
      prev.setDate(prev.getDate() - 1);
      return (activitiesByDay[prev.toISOString().slice(0, 10)]?.length ?? 0) === 0;
    })
    .map((d) => d.score ?? 0)
    .filter((s) => s > 0);

  if (avgSleepWithActivity.length > 2 && avgSleepWithoutActivity.length > 2) {
    const avgWith = Math.round(avgSleepWithActivity.reduce((a, b) => a + b, 0) / avgSleepWithActivity.length);
    const avgWithout = Math.round(avgSleepWithoutActivity.reduce((a, b) => a + b, 0) / avgSleepWithoutActivity.length);
    const diff = avgWith - avgWithout;
    if (Math.abs(diff) >= 3) {
      insights.push(
        diff > 0
          ? `Nights after a workout averaged ${diff} points higher sleep score (${avgWith} vs ${avgWithout} without).`
          : `Nights after a workout averaged ${Math.abs(diff)} points lower sleep score (${avgWith} vs ${avgWithout} without).`
      );
    }
  }

  if (activeDays > 0) {
    insights.push(`You were active ${activeDays} out of ${totalDays} days (${pct}%) in this period.`);
  } else if (totalDays > 7) {
    insights.push("No Strava activities recorded in this period.");
  }

  // Insight: readiness trend (first half vs second half)
  const readinessScores = readiness.map((r) => r.score ?? 0).filter((s) => s > 0);
  if (readinessScores.length >= 7) {
    const mid = Math.floor(readinessScores.length / 2);
    const firstHalf = readinessScores.slice(0, mid);
    const secondHalf = readinessScores.slice(mid);
    const avgFirst = Math.round(firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length);
    const avgSecond = Math.round(secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length);
    const trend = avgSecond - avgFirst;
    if (Math.abs(trend) >= 4) {
      insights.push(
        trend > 0
          ? `Readiness improved in the second half of this period (+${trend} points avg, ${avgFirst} → ${avgSecond}).`
          : `Readiness declined in the second half of this period (${Math.abs(trend)} points avg, ${avgFirst} → ${avgSecond}).`
      );
    }
  }

  // Nutrition insights (only when MFP data is available)
  if (mfpDaily.length >= 3) {
    // Average daily calories for the period
    const avgCals = Math.round(
      mfpDaily.reduce((s, d) => s + d.calories, 0) / mfpDaily.length
    );
    if (avgCals > 0) {
      insights.push(`Average daily intake: ${avgCals} kcal over ${mfpDaily.length} logged days.`);
    }

    // High-protein vs low-protein days: sleep score comparison
    const mfpByDay: Record<string, MFPDailyNutrition> = {};
    for (const d of mfpDaily) mfpByDay[d.date] = d;

    const proteinValues = mfpDaily.map((d) => d.protein).filter((p) => p > 0);
    if (proteinValues.length >= 4) {
      const medianProtein =
        [...proteinValues].sort((a, b) => a - b)[Math.floor(proteinValues.length / 2)];

      const sleepHighProtein: number[] = [];
      const sleepLowProtein: number[] = [];

      for (const s of dailySleep) {
        if (s.score == null || s.score === 0) continue;
        const nutrition = mfpByDay[s.day];
        if (!nutrition) continue;
        if (nutrition.protein >= medianProtein) {
          sleepHighProtein.push(s.score);
        } else {
          sleepLowProtein.push(s.score);
        }
      }

      if (sleepHighProtein.length >= 2 && sleepLowProtein.length >= 2) {
        const avgHigh = Math.round(
          sleepHighProtein.reduce((a, b) => a + b, 0) / sleepHighProtein.length
        );
        const avgLow = Math.round(
          sleepLowProtein.reduce((a, b) => a + b, 0) / sleepLowProtein.length
        );
        const diff = avgHigh - avgLow;
        if (Math.abs(diff) >= 3) {
          insights.push(
            diff > 0
              ? `Sleep score averaged ${diff} points higher on high-protein days (≥${Math.round(medianProtein)}g): ${avgHigh} vs ${avgLow}.`
              : `Sleep score averaged ${Math.abs(diff)} points lower on high-protein days (≥${Math.round(medianProtein)}g): ${avgHigh} vs ${avgLow}.`
          );
        }
      }
    }

    // Energy balance: MFP calories vs Oura total calories burned (if readiness data has activity)
    const ouraByDay: Record<string, number> = {};
    for (const r of readiness) {
      // Use readiness day as proxy for the date
      if (r.day) ouraByDay[r.day] = 0;
    }

    // Count days with a caloric surplus (intake > ~2000 kcal as rough threshold)
    const highCalDays = mfpDaily.filter((d) => d.calories > 2500).length;
    if (highCalDays > 0) {
      insights.push(
        `${highCalDays} day${highCalDays !== 1 ? "s" : ""} with intake above 2500 kcal in this period.`
      );
    }
  }

  return insights;
}

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function DashboardContent() {
  const searchParams = useSearchParams();

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 29), "yyyy-MM-dd");

  const startDate = searchParams.get("startDate") ?? defaultStart;
  const endDate = searchParams.get("endDate") ?? today;

  const [oura, setOura] = useState<OuraData | null>(null);
  const [strava, setStrava] = useState<StravaData | null>(null);
  const [mfpDaily, setMfpDaily] = useState<MFPDailyNutrition[]>([]);
  const [ouraError, setOuraError] = useState<string | null>(null);
  const [stravaError, setStravaError] = useState<string | null>(null);
  const [mfpError, setMfpError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setOura(null);
    setStrava(null);
    setMfpDaily([]);
    setOuraError(null);
    setStravaError(null);
    setMfpError(null);

    const qs = `?startDate=${startDate}&endDate=${endDate}`;

    await Promise.all([
      fetch(`/api/oura${qs}`)
        .then(async (r) => {
          const json = await r.json();
          if (!r.ok) setOuraError(json.error ?? "Unknown Oura error");
          else setOura(json);
        })
        .catch((e: unknown) => setOuraError(String(e))),
      fetch(`/api/strava${qs}`)
        .then(async (r) => {
          const json = await r.json();
          if (!r.ok) setStravaError(json.error ?? "Unknown Strava error");
          else setStrava(json);
        })
        .catch((e: unknown) => setStravaError(String(e))),
      fetch(`/api/myfitnesspal${qs}`)
        .then(async (r) => {
          const json = await r.json();
          if (!r.ok) setMfpError(json.error ?? "Unknown MyFitnessPal error");
          else if (json.available) setMfpDaily(json.daily ?? []);
        })
        .catch((e: unknown) => setMfpError(String(e))),
    ]);

    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const insights =
    oura && strava
      ? generateInsights(oura.dailySleep, strava.activities, oura.readiness, mfpDaily)
      : [];

  const latestSleep = oura?.dailySleep.at(-1);
  const latestReadiness = oura?.readiness.at(-1);
  const latestActivity = oura?.activity.at(-1);

  const avgSleepScore = avg(
    (oura?.dailySleep ?? []).map((d) => d.score ?? 0).filter((s) => s > 0)
  );
  const avgReadinessScore = avg(
    (oura?.readiness ?? []).map((d) => d.score ?? 0).filter((s) => s > 0)
  );
  const avgActivityScore = avg(
    (oura?.activity ?? []).map((d) => d.score ?? 0).filter((s) => s > 0)
  );
  const avgHRV = avg(
    (oura?.sleepPeriods ?? []).map((p) => p.average_hrv ?? 0).filter((v) => v > 0)
  );
  const totalStravaDistance = (strava?.activities ?? []).reduce(
    (s, a) => s + a.distance,
    0
  );
  const totalStravaActivities = strava?.activities.length ?? 0;

  // MFP nutrition averages
  const avgCalories = avg(mfpDaily.map((d) => d.calories).filter((c) => c > 0));
  const avgProtein = avg(mfpDaily.map((d) => d.protein).filter((p) => p > 0));
  const avgCarbs = avg(mfpDaily.map((d) => d.carbohydrates).filter((c) => c > 0));
  const avgFat = avg(mfpDaily.map((d) => d.fat).filter((f) => f > 0));

  const latestSleepTotal = oura?.sleepPeriods
    .filter((p) => p.day === latestSleep?.day && p.type !== "deleted")
    .reduce((s, p) => s + (p.total_sleep_duration ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Healthy Choices</h1>
          <DateRangePicker startDate={startDate} endDate={endDate} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {/* Connection buttons */}
        <div className="flex gap-3 text-xs">
          {ouraError?.includes("not connected") && (
            <a
              href="/api/auth/oura"
              className="bg-indigo-600 text-white px-3 py-1.5 rounded font-medium hover:bg-indigo-700"
            >
              Connect Oura
            </a>
          )}
          {stravaError?.includes("not connected") && (
            <a
              href="/api/auth/strava"
              className="bg-orange-500 text-white px-3 py-1.5 rounded font-medium hover:bg-orange-600"
            >
              Connect Strava
            </a>
          )}
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400">Loading data...</div>
        )}

        {!loading && (
          <>
            {/* Insights */}
            {insights.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                  Insights
                </h2>
                <div className="space-y-2">
                  {insights.map((insight, i) => (
                    <div
                      key={i}
                      className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900"
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Summary metrics */}
            {(oura || strava) && (
              <section>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Period averages
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <MetricCard
                    label="Sleep score"
                    value={avgSleepScore}
                    description="avg / period"
                    color={scoreColor(avgSleepScore)}
                  />
                  <MetricCard
                    label="Readiness"
                    value={avgReadinessScore}
                    description="avg / period"
                    color={scoreColor(avgReadinessScore)}
                  />
                  <MetricCard
                    label="Activity score"
                    value={avgActivityScore}
                    description="avg / period"
                    color={scoreColor(avgActivityScore)}
                  />
                  <MetricCard label="HRV" value={avgHRV} unit="ms" description="avg during sleep" />
                  <MetricCard
                    label="Strava workouts"
                    value={totalStravaActivities}
                    description="in period"
                  />
                  <MetricCard
                    label="Strava distance"
                    value={metersToKm(totalStravaDistance)}
                    unit="km"
                    description="total"
                  />
                </div>
              </section>
            )}

            {/* Nutrition summary metrics */}
            {mfpDaily.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Nutrition averages (MyFitnessPal)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard
                    label="Calories"
                    value={avgCalories}
                    unit="kcal"
                    description="avg / logged day"
                  />
                  <MetricCard
                    label="Protein"
                    value={avgProtein}
                    unit="g"
                    description="avg / logged day"
                  />
                  <MetricCard
                    label="Carbs"
                    value={avgCarbs}
                    unit="g"
                    description="avg / logged day"
                  />
                  <MetricCard
                    label="Fat"
                    value={avgFat}
                    unit="g"
                    description="avg / logged day"
                  />
                </div>
              </section>
            )}

            {/* Latest day snapshot */}
            {(latestSleep || latestReadiness || latestActivity) && (
              <section>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Latest day
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <MetricCard
                    label="Sleep score"
                    value={latestSleep?.score}
                    description={latestSleep?.day}
                    color={scoreColor(latestSleep?.score)}
                  />
                  <MetricCard
                    label="Readiness"
                    value={latestReadiness?.score}
                    description={latestReadiness?.day}
                    color={scoreColor(latestReadiness?.score)}
                  />
                  <MetricCard
                    label="Activity score"
                    value={latestActivity?.score}
                    description={latestActivity?.day}
                    color={scoreColor(latestActivity?.score)}
                  />
                  <MetricCard
                    label="Steps"
                    value={latestActivity?.steps?.toLocaleString()}
                    description={latestActivity?.day}
                  />
                  <MetricCard
                    label="Total sleep"
                    value={latestSleepTotal ? formatDuration(latestSleepTotal) : null}
                    description={latestSleep?.day}
                  />
                  <MetricCard
                    label="Temp deviation"
                    value={latestReadiness?.temperature_deviation?.toFixed(2)}
                    unit="°C"
                    description="from baseline"
                  />
                </div>
              </section>
            )}

            {/* Sleep */}
            {oura && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Sleep</h2>
                <p className="text-xs text-gray-400 mb-4">
                  Stacked bars = sleep stages (min). Line = daily score. Orange dots = Strava workout the previous day.
                </p>
                <SleepChart
                  dailySleep={oura.dailySleep}
                  sleepPeriods={oura.sleepPeriods}
                  stravaActivities={strava?.activities ?? []}
                />
              </section>
            )}

            {/* Readiness */}
            {oura && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Readiness</h2>
                <p className="text-xs text-gray-400 mb-4">
                  Bars = HRV balance &amp; sleep balance contributors. Line = readiness score. Orange dots = workout the previous day.
                </p>
                <ReadinessChart
                  readiness={oura.readiness}
                  stravaActivities={strava?.activities ?? []}
                />
              </section>
            )}

            {/* Activity */}
            {oura && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Daily Activity</h2>
                <p className="text-xs text-gray-400 mb-4">
                  Blue bars = steps. Orange bars = Strava workout distance (km). Line = activity score.
                </p>
                <ActivityChart
                  activity={oura.activity}
                  stravaActivities={strava?.activities ?? []}
                />
              </section>
            )}

            {/* Strava workouts */}
            {strava && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">
                  Strava Workouts ({totalStravaActivities})
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  Each bar = one workout, coloured by sport type. Hover for details.
                </p>
                <StravaActivitiesChart activities={strava.activities} />

                {strava.activities.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="pb-1 pr-4 font-medium">Date</th>
                          <th className="pb-1 pr-4 font-medium">Name</th>
                          <th className="pb-1 pr-4 font-medium">Type</th>
                          <th className="pb-1 pr-4 font-medium">Dist</th>
                          <th className="pb-1 pr-4 font-medium">Time</th>
                          <th className="pb-1 pr-4 font-medium">Avg HR</th>
                          <th className="pb-1 font-medium">Suffer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...strava.activities]
                          .sort(
                            (a, b) =>
                              new Date(b.start_date_local).getTime() -
                              new Date(a.start_date_local).getTime()
                          )
                          .map((a) => (
                            <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-1 pr-4 text-gray-500">
                                {a.start_date_local.slice(0, 10)}
                              </td>
                              <td className="py-1 pr-4 font-medium text-gray-800">{a.name}</td>
                              <td className="py-1 pr-4 text-gray-500">{a.sport_type}</td>
                              <td className="py-1 pr-4">{metersToKm(a.distance)} km</td>
                              <td className="py-1 pr-4">{formatDuration(a.moving_time)}</td>
                              <td className="py-1 pr-4">
                                {a.average_heartrate
                                  ? `${Math.round(a.average_heartrate)} bpm`
                                  : "—"}
                              </td>
                              <td className="py-1">{a.suffer_score ?? "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Heart Rate */}
            {oura && oura.heartRate.length > 0 && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Heart Rate (Oura)</h2>
                <p className="text-xs text-gray-400 mb-4">
                  5-minute interval readings across the period, sampled for display.
                </p>
                <HeartRateChart heartRate={oura.heartRate} />
              </section>
            )}

            {/* Stress & Resilience */}
            {oura && (oura.stress.length > 0 || oura.resilience.length > 0) && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">
                  Stress &amp; Resilience
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  Red = high-stress time (min). Green = high-recovery time (min). Purple dashes = resilience (1=limited → 5=exceptional).
                </p>
                <StressResilienceChart stress={oura.stress} resilience={oura.resilience} />
              </section>
            )}

            {/* SpO2 & VO2 Max */}
            {oura && (oura.spo2.length > 0 || oura.vo2max.length > 0) && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  SpO2 &amp; VO2 Max
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {oura.spo2.slice(-7).map((d) => (
                    <MetricCard
                      key={d.id}
                      label={d.day}
                      value={d.spo2_percentage?.average?.toFixed(1)}
                      unit="%"
                      description="SpO2 avg during sleep"
                    />
                  ))}
                  {oura.vo2max.slice(-3).map((d) => (
                    <MetricCard
                      key={d.id}
                      label={d.day}
                      value={d.vo2_max?.toFixed(1)}
                      description="VO2 Max estimate"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Nutrition */}
            {mfpDaily.length > 0 && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-1">
                  Nutrition (MyFitnessPal)
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  Stacked bars = macros in grams (protein / carbs / fat). Green line = total calories.
                  Hover a day for meal breakdown.
                </p>
                <NutritionChart daily={mfpDaily} />
              </section>
            )}

            {/* Non-connection errors */}
            {(ouraError || stravaError || mfpError) && (
              <section className="space-y-2">
                {ouraError && !ouraError.includes("not connected") && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                    Oura: {ouraError}
                  </p>
                )}
                {stravaError && !stravaError.includes("not connected") && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                    Strava: {stravaError}
                  </p>
                )}
                {mfpError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                    MyFitnessPal: {mfpError}
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
