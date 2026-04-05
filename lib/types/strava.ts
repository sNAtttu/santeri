// Strava API v3 TypeScript types

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number; // unix timestamp
  expires_in: number;
  athlete?: StravaAthleteBasic;
}

export interface StravaAthleteBasic {
  id: number;
  username?: string;
  firstname?: string;
  lastname?: string;
  city?: string;
  country?: string;
  profile?: string; // profile picture URL
}

export interface StravaAthlete extends StravaAthleteBasic {
  weight?: number;
  ftp?: number;
}

// Activity summary (from list endpoint)
export interface StravaActivitySummary {
  id: number;
  name: string;
  type: string; // "Run", "Ride", "Swim", etc.
  sport_type: string;
  start_date: string; // ISO 8601
  start_date_local: string;
  timezone: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  suffer_score?: number;
  has_heartrate: boolean;
  kilojoules?: number;
  weighted_average_watts?: number;
  average_watts?: number;
  max_watts?: number;
  map?: { summary_polyline?: string };
  kudos_count: number;
  achievement_count: number;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
}

// Detailed activity (from single activity endpoint)
export interface StravaActivityDetail extends StravaActivitySummary {
  description?: string;
  gear_id?: string;
  splits_metric?: StravaSplit[];
  splits_standard?: StravaSplit[];
  laps?: StravaLap[];
  best_efforts?: StravaBestEffort[];
  segment_efforts?: StravaSegmentEffort[];
}

export interface StravaSplit {
  distance: number;
  elapsed_time: number;
  elevation_difference?: number;
  moving_time: number;
  split: number;
  average_speed: number;
  pace_zone?: number;
  average_heartrate?: number;
}

export interface StravaLap {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  distance: number;
  lap_index: number;
  split: number;
  average_speed: number;
  max_speed: number;
  average_cadence?: number;
  average_watts?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
}

export interface StravaBestEffort {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  distance: number;
  pr_rank?: number;
}

export interface StravaSegmentEffort {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  kom_rank?: number;
  pr_rank?: number;
}

// Athlete stats
export interface StravaAthleteStats {
  biggest_ride_distance?: number;
  biggest_climb_elevation_gain?: number;
  recent_ride_totals: StravaTotals;
  recent_run_totals: StravaTotals;
  recent_swim_totals: StravaTotals;
  ytd_ride_totals: StravaTotals;
  ytd_run_totals: StravaTotals;
  ytd_swim_totals: StravaTotals;
  all_ride_totals: StravaTotals;
  all_run_totals: StravaTotals;
  all_swim_totals: StravaTotals;
}

export interface StravaTotals {
  count: number;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  elevation_gain: number; // meters
  achievement_count?: number;
}

// Heart rate zones
export interface StravaZones {
  heart_rate?: {
    custom_zones: boolean;
    zones: StravaZone[];
  };
  power?: {
    zones: StravaZone[];
  };
}

export interface StravaZone {
  min: number;
  max: number; // -1 means no max
}
