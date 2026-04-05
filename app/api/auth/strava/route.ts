import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getStravaAuthUrl } from "@/lib/strava";

export const dynamic = "force-dynamic";

// GET /api/auth/strava
// Redirects the user to Strava's OAuth2 authorisation page.
export async function GET(_req: NextRequest) {
  const url = getStravaAuthUrl();
  redirect(url);
}
