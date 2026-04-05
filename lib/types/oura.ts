// Oura API v2 TypeScript types

export interface OuraTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number; // unix timestamp when access token expires
}

// Personal info
export interface PersonalInfo {
  id: string;
  age?: number;
  weight?: number;
  height?: number;
  biological_sex?: string;
  email?: string;
}

// Sleep
export interface SleepModel {
  id: string;
  day: string;
  bedtime_start: string;
  bedtime_end: string;
  total_sleep_duration?: number; // seconds
  deep_sleep_duration?: number; // seconds
  light_sleep_duration?: number; // seconds
  rem_sleep_duration?: number; // seconds
  awake_time?: number; // seconds
  time_in_bed: number; // seconds
  efficiency?: number; // 1-100
  latency?: number; // seconds
  average_heart_rate?: number;
  average_hrv?: number;
  average_breath?: number;
  lowest_heart_rate?: number;
  restless_periods?: number;
  sleep_phase_5_min?: string;
  type: "sleep" | "long_sleep" | "late_nap" | "rest" | "deleted";
  period: number;
}

export interface DailySleepContributors {
  deep_sleep?: number;
  efficiency?: number;
  latency?: number;
  rem_sleep?: number;
  restfulness?: number;
  timing?: number;
  total_sleep?: number;
}

export interface DailySleepModel {
  id: string;
  day: string;
  score?: number; // 1-100
  contributors: DailySleepContributors;
  timestamp: string;
}

// Readiness
export interface ReadinessContributors {
  activity_balance?: number;
  body_temperature?: number;
  hrv_balance?: number;
  previous_day_activity?: number;
  previous_night?: number;
  recovery_index?: number;
  resting_heart_rate?: number;
  sleep_balance?: number;
}

export interface DailyReadinessModel {
  id: string;
  day: string;
  score?: number; // 1-100
  temperature_deviation?: number;
  temperature_trend_deviation?: number;
  contributors: ReadinessContributors;
  timestamp: string;
}

// Activity
export interface ActivityContributors {
  meet_daily_targets?: number;
  move_every_hour?: number;
  recovery_time?: number;
  stay_active?: number;
  training_frequency?: number;
  training_volume?: number;
}

export interface DailyActivityModel {
  id: string;
  day: string;
  score?: number; // 1-100
  steps: number;
  active_calories: number;
  total_calories: number;
  target_calories: number;
  equivalent_walking_distance: number; // meters
  high_activity_time: number; // seconds
  medium_activity_time: number; // seconds
  low_activity_time: number; // seconds
  sedentary_time?: number; // seconds
  resting_time: number; // seconds
  non_wear_time: number; // seconds
  inactivity_alerts: number;
  class_5_min?: string;
  contributors: ActivityContributors;
}

// Heart rate
export interface HeartRateModel {
  bpm: number;
  source: "awake" | "rest" | "sleep" | "session" | "live" | "workout";
  timestamp: string;
}

// Stress
export interface DailyStressModel {
  id: string;
  day: string;
  stress_high?: number; // seconds
  recovery_high?: number; // seconds
  day_summary?: "restored" | "normal" | "stressful";
}

// Resilience
export interface ResilienceContributors {
  sleep_recovery?: number;
  daytime_recovery?: number;
  stress?: number;
}

export interface DailyResilienceModel {
  id: string;
  day: string;
  level: "limited" | "adequate" | "solid" | "strong" | "exceptional";
  contributors: ResilienceContributors;
}

// SpO2
export interface DailySpO2Model {
  id: string;
  day: string;
  spo2_percentage?: { average: number };
  breathing_disturbance_index?: number;
}

// VO2 Max
export interface VO2MaxModel {
  id: string;
  day: string;
  vo2_max?: number;
  timestamp: string;
}

// Cardiovascular Age
export interface DailyCardiovascularAgeModel {
  day: string;
  vascular_age?: number;
}

// Workout
export interface OuraWorkout {
  id: string;
  activity: string;
  calories?: number;
  day: string;
  distance?: number;
  start_datetime: string;
  end_datetime: string;
  intensity: string;
  label?: string;
  source: string;
}

// Collection response wrapper
export interface OuraCollection<T> {
  data: T[];
  next_token?: string | null;
}
