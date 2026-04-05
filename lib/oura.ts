import {
  getOuraTokens,
  updateOuraTokens,
} from "./token-store";
import type {
  OuraTokens,
  OuraCollection,
  DailySleepModel,
  SleepModel,
  DailyReadinessModel,
  DailyActivityModel,
  HeartRateModel,
  DailyStressModel,
  DailyResilienceModel,
  DailySpO2Model,
  VO2MaxModel,
  DailyCardiovascularAgeModel,
  OuraWorkout,
  PersonalInfo,
} from "./types/oura";

const BASE_URL = "https://api.ouraring.com";
const TOKEN_URL = "https://api.ouraring.com/oauth/token";

// Refresh the Oura access token using the stored refresh token.
// Oura refresh tokens are single-use — the new pair is written back immediately.
async function refreshOuraTokens(current: OuraTokens): Promise<OuraTokens> {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("OURA_CLIENT_ID and OURA_CLIENT_SECRET must be set in .env.local");
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
    throw new Error(`Oura token refresh failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as Omit<OuraTokens, "expires_at">;
  const refreshed: OuraTokens = {
    ...data,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
  };

  updateOuraTokens(refreshed);
  return refreshed;
}

// Get a valid access token, refreshing if needed (expire buffer: 60 seconds).
async function getValidAccessToken(): Promise<string> {
  let tokens = getOuraTokens();
  if (!tokens) {
    throw new Error("Oura not connected. Visit /api/auth/oura to authorise.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (tokens.expires_at - nowSeconds < 60) {
    tokens = await refreshOuraTokens(tokens);
  }

  return tokens.access_token;
}

// Generic paginated fetch — follows next_token until exhausted.
async function fetchAll<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T[]> {
  const accessToken = await getValidAccessToken();
  const results: T[] = [];
  let nextToken: string | null | undefined = undefined;

  do {
    const url = new URL(`${BASE_URL}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    if (nextToken) {
      url.searchParams.set("next_token", nextToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Oura API error ${res.status} on ${endpoint}: ${text}`);
    }

    const json = (await res.json()) as OuraCollection<T>;
    results.push(...json.data);
    nextToken = json.next_token;
  } while (nextToken);

  return results;
}

// Public API methods

export async function getOuraPersonalInfo(): Promise<PersonalInfo> {
  const accessToken = await getValidAccessToken();
  const res = await fetch(`${BASE_URL}/v2/usercollection/personal_info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Oura personal info error: ${res.status}`);
  return res.json() as Promise<PersonalInfo>;
}

export async function getDailySleep(
  startDate: string,
  endDate: string
): Promise<DailySleepModel[]> {
  return fetchAll<DailySleepModel>("/v2/usercollection/daily_sleep", {
    start_date: startDate,
    end_date: endDate,
  });
}

export async function getSleepPeriods(
  startDate: string,
  endDate: string
): Promise<SleepModel[]> {
  return fetchAll<SleepModel>("/v2/usercollection/sleep", {
    start_date: startDate,
    end_date: endDate,
  });
}

export async function getDailyReadiness(
  startDate: string,
  endDate: string
): Promise<DailyReadinessModel[]> {
  return fetchAll<DailyReadinessModel>("/v2/usercollection/daily_readiness", {
    start_date: startDate,
    end_date: endDate,
  });
}

export async function getDailyActivity(
  startDate: string,
  endDate: string
): Promise<DailyActivityModel[]> {
  return fetchAll<DailyActivityModel>("/v2/usercollection/daily_activity", {
    start_date: startDate,
    end_date: endDate,
  });
}

export async function getHeartRate(
  startDatetime: string,
  endDatetime: string
): Promise<HeartRateModel[]> {
  return fetchAll<HeartRateModel>("/v2/usercollection/heartrate", {
    start_datetime: startDatetime,
    end_datetime: endDatetime,
  });
}

export async function getDailyStress(
  startDate: string,
  endDate: string
): Promise<DailyStressModel[]> {
  return fetchAll<DailyStressModel>("/v2/usercollection/daily_stress", {
    start_date: startDate,
    end_date: endDate,
  });
}

export async function getDailyResilience(
  startDate: string,
  endDate: string
): Promise<DailyResilienceModel[]> {
  return fetchAll<DailyResilienceModel>("/v2/usercollection/daily_resilience", {
    start_date: startDate,
    end_date: endDate,
  });
}

export async function getDailySpO2(
  startDate: string,
  endDate: string
): Promise<DailySpO2Model[]> {
  return fetchAll<DailySpO2Model>("/v2/usercollection/daily_spo2", {
    start_date: startDate,
    end_date: endDate,
  });
}

export async function getVO2Max(
  startDate: string,
  endDate: string
): Promise<VO2MaxModel[]> {
  return fetchAll<VO2MaxModel>("/v2/usercollection/vO2_max", {
    start_date: startDate,
    end_date: endDate,
  });
}

export async function getCardiovascularAge(
  startDate: string,
  endDate: string
): Promise<DailyCardiovascularAgeModel[]> {
  return fetchAll<DailyCardiovascularAgeModel>(
    "/v2/usercollection/daily_cardiovascular_age",
    { start_date: startDate, end_date: endDate }
  );
}

export async function getOuraWorkouts(
  startDate: string,
  endDate: string
): Promise<OuraWorkout[]> {
  return fetchAll<OuraWorkout>("/v2/usercollection/workout", {
    start_date: startDate,
    end_date: endDate,
  });
}

export function getOuraAuthUrl(): string {
  const clientId = process.env.OURA_CLIENT_ID;
  const redirectUri = process.env.OURA_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error("OURA_CLIENT_ID and OURA_REDIRECT_URI must be set in .env.local");
  }

  const scopes = [
    "email",
    "personal",
    "daily",
    "heartrate",
    "workout",
    "session",
    "spo2",
    "heart_health",
    "stress",
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
  });

  return `https://cloud.ouraring.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeOuraCode(code: string): Promise<OuraTokens> {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const redirectUri = process.env.OURA_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Oura env vars not set");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oura code exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as Omit<OuraTokens, "expires_at">;
  const tokens: OuraTokens = {
    ...data,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
  };
  updateOuraTokens(tokens);
  return tokens;
}
