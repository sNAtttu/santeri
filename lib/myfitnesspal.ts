import fs from "fs";
import path from "path";
import type { MFPMealEntry, MFPDailyNutrition, MFPNutritionData } from "./types/myfitnesspal";

/**
 * Resolves the path to the MFP nutrition CSV file.
 * Uses the MFP_NUTRITION_CSV_PATH env var if set, otherwise defaults to
 * <project_root>/data/nutrition.csv.
 */
function resolveCsvPath(): string {
  if (process.env.MFP_NUTRITION_CSV_PATH) {
    return path.resolve(process.env.MFP_NUTRITION_CSV_PATH);
  }
  return path.resolve(process.cwd(), "data", "nutrition.csv");
}

/**
 * Parses a single CSV line respecting quoted fields.
 * MFP may wrap fields containing commas in double-quotes.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Safely parses a numeric string, returning 0 for empty or invalid values.
 */
function num(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

/**
 * Normalises a date string from MFP format to YYYY-MM-DD.
 * MFP exports dates as "YYYY-MM-DD" on the web or "MM/DD/YYYY" on mobile exports.
 */
function normaliseDate(raw: string): string {
  const trimmed = raw.trim();
  // Match MM/DD/YYYY
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Already YYYY-MM-DD or similar
  return trimmed.slice(0, 10);
}

/**
 * MFP nutrition CSV column mapping.
 *
 * The MFP Premium export "Nutrition" CSV has the following header (web export):
 *   Date,Meal,Calories,Carbohydrates (g),Fat (g),Protein (g),Fiber (g),Sugar (g),Sodium (mg),Notes
 *
 * Column indices are resolved dynamically from the header row so minor
 * variation in column order doesn't break parsing.
 */
interface ColumnMap {
  date: number;
  meal: number;
  calories: number;
  carbohydrates: number;
  fat: number;
  protein: number;
  fiber: number;
  sugar: number;
  sodium: number;
  note: number;
}

function buildColumnMap(headers: string[]): ColumnMap {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const idx = (keyword: string): number =>
    headers.findIndex((h) => norm(h).includes(keyword));

  return {
    date: idx("date"),
    meal: idx("meal"),
    calories: idx("calorie"),
    carbohydrates: idx("carbohydrate"),
    fat: idx("fat"),
    protein: idx("protein"),
    fiber: idx("fiber"),
    sugar: idx("sugar"),
    sodium: idx("sodium"),
    note: idx("note"),
  };
}

/**
 * Reads and parses the MFP nutrition CSV file.
 * Returns all meal entries found in the file, sorted by date.
 */
function parseMFPCsv(csvPath: string): MFPMealEntry[] {
  const content = fs.readFileSync(csvPath, "utf-8");

  // Normalise line endings and split
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  if (lines.length < 2) return [];

  // Find the header row — skip any leading blank lines or BOM
  let headerIdx = 0;
  while (headerIdx < lines.length && !lines[headerIdx].trim()) headerIdx++;
  if (headerIdx >= lines.length) return [];

  // Strip UTF-8 BOM if present
  const headerLine = lines[headerIdx].replace(/^\uFEFF/, "");
  const headers = parseCsvLine(headerLine);
  const col = buildColumnMap(headers);

  // Validate required columns exist
  if (col.date === -1 || col.meal === -1 || col.calories === -1) {
    throw new Error(
      "MFP nutrition CSV is missing required columns (Date, Meal, Calories). " +
        `Found headers: ${headers.join(", ")}`
    );
  }

  const entries: MFPMealEntry[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCsvLine(line);
    if (fields.length < 3) continue;

    const rawDate = fields[col.date] ?? "";
    if (!rawDate) continue;

    // MFP appends a "Daily Totals" row after each day's meals — skip it
    const mealName = (fields[col.meal] ?? "").trim();
    if (!mealName || mealName.toLowerCase().includes("total")) continue;

    entries.push({
      date: normaliseDate(rawDate),
      meal: mealName,
      calories: num(fields[col.calories] ?? "0"),
      carbohydrates: col.carbohydrates !== -1 ? num(fields[col.carbohydrates] ?? "0") : 0,
      fat: col.fat !== -1 ? num(fields[col.fat] ?? "0") : 0,
      protein: col.protein !== -1 ? num(fields[col.protein] ?? "0") : 0,
      fiber: col.fiber !== -1 ? num(fields[col.fiber] ?? "0") : 0,
      sugar: col.sugar !== -1 ? num(fields[col.sugar] ?? "0") : 0,
      sodium: col.sodium !== -1 ? num(fields[col.sodium] ?? "0") : 0,
      note: col.note !== -1 && fields[col.note] ? fields[col.note] : undefined,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Groups meal entries by date and aggregates daily totals.
 */
function groupByDay(entries: MFPMealEntry[]): MFPDailyNutrition[] {
  const byDay: Record<string, MFPDailyNutrition> = {};

  for (const entry of entries) {
    if (!byDay[entry.date]) {
      byDay[entry.date] = {
        date: entry.date,
        calories: 0,
        carbohydrates: 0,
        fat: 0,
        protein: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        meals: [],
      };
    }

    const day = byDay[entry.date];
    day.calories += entry.calories;
    day.carbohydrates += entry.carbohydrates;
    day.fat += entry.fat;
    day.protein += entry.protein;
    day.fiber += entry.fiber;
    day.sugar += entry.sugar;
    day.sodium += entry.sodium;
    day.meals.push(entry);
  }

  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Loads and returns all MFP nutrition data.
 * Returns { available: false } if the CSV file does not exist.
 */
export function getMFPNutritionData(): MFPNutritionData {
  const csvPath = resolveCsvPath();

  if (!fs.existsSync(csvPath)) {
    return { daily: [], available: false };
  }

  const entries = parseMFPCsv(csvPath);
  const daily = groupByDay(entries);

  return { daily, available: true };
}

/**
 * Returns MFP nutrition data filtered to the given date range (inclusive).
 */
export function getMFPNutritionForRange(
  startDate: string,
  endDate: string
): MFPNutritionData {
  const all = getMFPNutritionData();
  if (!all.available) return all;

  const filtered = all.daily.filter(
    (d) => d.date >= startDate && d.date <= endDate
  );

  return { daily: filtered, available: true };
}
