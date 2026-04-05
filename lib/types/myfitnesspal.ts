// MyFitnessPal CSV export TypeScript types
// Based on the MFP Premium "Meal Level Nutrition Details" CSV export format.

/**
 * A single meal entry as parsed from the MFP nutrition CSV.
 * One row per meal per day (Breakfast, Lunch, Dinner, Snacks).
 */
export interface MFPMealEntry {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Meal name: "Breakfast" | "Lunch" | "Dinner" | "Snacks" */
  meal: string;
  /** Total calories for this meal (kcal) */
  calories: number;
  /** Carbohydrates (g) */
  carbohydrates: number;
  /** Fat (g) */
  fat: number;
  /** Protein (g) */
  protein: number;
  /** Dietary fiber (g) — may be 0 if not tracked */
  fiber: number;
  /** Sugar (g) — may be 0 if not tracked */
  sugar: number;
  /** Sodium (mg) — may be 0 if not tracked */
  sodium: number;
  /** Any food note attached to this meal */
  note?: string;
}

/**
 * Nutrition totals aggregated for a single day across all meals.
 */
export interface MFPDailyNutrition {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Sum of calories across all meals (kcal) */
  calories: number;
  /** Sum of carbohydrates across all meals (g) */
  carbohydrates: number;
  /** Sum of fat across all meals (g) */
  fat: number;
  /** Sum of protein across all meals (g) */
  protein: number;
  /** Sum of fiber across all meals (g) */
  fiber: number;
  /** Sum of sugar across all meals (g) */
  sugar: number;
  /** Sum of sodium across all meals (mg) */
  sodium: number;
  /** Individual meal entries for this day */
  meals: MFPMealEntry[];
}

/**
 * Top-level response returned by /api/myfitnesspal
 */
export interface MFPNutritionData {
  /** Daily nutrition records, sorted by date ascending */
  daily: MFPDailyNutrition[];
  /** Whether the CSV file was found and loaded */
  available: boolean;
}
