import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getOuraAuthUrl } from "@/lib/oura";

export const dynamic = "force-dynamic";

// GET /api/auth/oura
// Redirects the user to Oura's OAuth2 authorisation page.
export async function GET(_req: NextRequest) {
  const url = getOuraAuthUrl();
  redirect(url);
}
