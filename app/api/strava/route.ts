import { NextRequest } from "next/server";
import {
  getStravaActivities,
  getStravaAthlete,
  getStravaAthleteStats,
} from "@/lib/strava";

// GET /api/strava?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns activities and athlete stats for the date range.
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

  try {
    const athlete = await getStravaAthlete();
    const [activities, stats] = await Promise.all([
      getStravaActivities(startDate, endDate),
      getStravaAthleteStats(athlete.id),
    ]);

    return Response.json({ athlete, activities, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isNotConnected = message.includes("not connected");
    return Response.json(
      { error: message },
      { status: isNotConnected ? 401 : 500 }
    );
  }
}
