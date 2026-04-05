import { NextRequest } from "next/server";
import { getMFPNutritionForRange } from "@/lib/myfitnesspal";

// GET /api/myfitnesspal?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns MFP nutrition data parsed from the local CSV file for the date range.
// If no CSV file is present, returns { available: false, daily: [] } with a 200.
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
    const data = getMFPNutritionForRange(startDate, endDate);
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
