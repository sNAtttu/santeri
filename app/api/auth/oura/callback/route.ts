import { NextRequest } from "next/server";
import { exchangeOuraCode } from "@/lib/oura";

// GET /api/auth/oura/callback?code=...
// Oura redirects here after user approval.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new Response(
      `<html><body><p>Oura authorisation denied: ${error}</p><a href="/">Go back</a></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  try {
    await exchangeOuraCode(code);
    return new Response(
      `<html><body><p>Oura connected! Tokens saved.</p><a href="/">Go to dashboard</a></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      `<html><body><p>Error: ${message}</p><a href="/">Go back</a></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
