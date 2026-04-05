import { NextRequest } from "next/server";
import {
  getDailySleep,
  getSleepPeriods,
  getDailyReadiness,
  getDailyActivity,
  getHeartRate,
  getDailyStress,
  getDailyResilience,
  getDailySpO2,
  getVO2Max,
  getCardiovascularAge,
  getOuraWorkouts,
} from "@/lib/oura";

// GET /api/oura?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns a combined object with all Oura data for the date range.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return Response.json(
      { error: "startDate and endDate query parameters are required" },
      { status: 400 }
    );
  }

  // Datetime versions for the heart rate endpoint (needs full ISO datetimes)
  const startDatetime = `${startDate}T00:00:00+00:00`;
  const endDatetime = `${endDate}T23:59:59+00:00`;

  try {
    const [
      dailySleep,
      sleepPeriods,
      readiness,
      activity,
      heartRate,
      stress,
      resilience,
      spo2,
      vo2max,
      cardiovascularAge,
      workouts,
    ] = await Promise.all([
      getDailySleep(startDate, endDate),
      getSleepPeriods(startDate, endDate),
      getDailyReadiness(startDate, endDate),
      getDailyActivity(startDate, endDate),
      getHeartRate(startDatetime, endDatetime),
      getDailyStress(startDate, endDate),
      getDailyResilience(startDate, endDate),
      getDailySpO2(startDate, endDate),
      getVO2Max(startDate, endDate),
      getCardiovascularAge(startDate, endDate),
      getOuraWorkouts(startDate, endDate),
    ]);

    return Response.json({
      dailySleep,
      sleepPeriods,
      readiness,
      activity,
      heartRate,
      stress,
      resilience,
      spo2,
      vo2max,
      cardiovascularAge,
      workouts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isNotConnected = message.includes("not connected");
    return Response.json(
      { error: message },
      { status: isNotConnected ? 401 : 500 }
    );
  }
}
