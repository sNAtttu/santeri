import {
  getStravaTokens,
  updateStravaTokens,
} from "./token-store";
import type {
  StravaTokens,
  StravaActivitySummary,
  StravaActivityDetail,
  StravaAthleteStats,
  StravaAthlete,
  StravaZones,
} from "./types/strava";

const BASE_URL = "https://www.strava.com/api/v3";
const TOKEN_URL = "https://www.strava.com/oauth/token";

// Refresh the Strava access token.
// Unlike Oura, Strava refresh tokens are not single-use (they stay the same
// unless revoked). We still always persist the response in case Strava rotates it.
async function refreshStravaTokens(current: StravaTokens): Promise<StravaTokens> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set in .env.local");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: current.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava token refresh failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as StravaTokens;
  updateStravaTokens(data);
  return data;
}

// Get a valid Strava access token, refreshing if within 60-second expiry window.
async function getValidAccessToken(): Promise<string> {
  let tokens = getStravaTokens();
  if (!tokens) {
    throw new Error("Strava not connected. Visit /api/auth/strava to authorise.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (tokens.expires_at - nowSeconds < 60) {
    tokens = await refreshStravaTokens(tokens);
  }

  return tokens.access_token;
}

async function stravaFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const accessToken = await getValidAccessToken();
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava API error ${res.status} on ${endpoint}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// Fetch all activities within a date range, handling Strava's pagination.
// Strava uses epoch timestamps for date filtering.
export async function getStravaActivities(
  startDate: string,
  endDate: string
): Promise<StravaActivitySummary[]> {
  const after = Math.floor(new Date(startDate).getTime() / 1000).toString();
  const before = Math.floor(new Date(endDate + "T23:59:59Z").getTime() / 1000).toString();

  const all: StravaActivitySummary[] = [];
  let page = 1;
  const perPage = 200; // max allowed by Strava

  while (true) {
    const batch = await stravaFetch<StravaActivitySummary[]>("/athlete/activities", {
      after,
      before,
      per_page: perPage.toString(),
      page: page.toString(),
    });

    all.push(...batch);

    if (batch.length < perPage) break; // no more pages
    page++;
  }

  return all;
}

export async function getStravaActivity(id: number): Promise<StravaActivityDetail> {
  return stravaFetch<StravaActivityDetail>(`/activities/${id}`);
}

export async function getStravaAthlete(): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>("/athlete");
}

export async function getStravaAthleteStats(athleteId: number): Promise<StravaAthleteStats> {
  return stravaFetch<StravaAthleteStats>(`/athletes/${athleteId}/stats`);
}

export async function getStravaZones(): Promise<StravaZones> {
  return stravaFetch<StravaZones>("/athlete/zones");
}

export function getStravaAuthUrl(): string {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("STRAVA_CLIENT_ID and STRAVA_REDIRECT_URI must be set in .env.local");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all,profile:read_all",
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Strava env vars not set");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Strava code exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as StravaTokens;
  updateStravaTokens(data);
  return data;
}
