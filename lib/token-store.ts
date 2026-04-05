import fs from "fs";
import path from "path";
import { OuraTokens } from "./types/oura";
import { StravaTokens } from "./types/strava";

export interface TokenStore {
  oura?: OuraTokens;
  strava?: StravaTokens;
}

function getTokensFilePath(): string {
  const configuredPath = process.env.TOKENS_FILE_PATH ?? "tokens.json";
  // If relative, resolve from project root (cwd at server startup)
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

export function readTokens(): TokenStore {
  const filePath = getTokensFilePath();
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as TokenStore;
  } catch {
    return {};
  }
}

export function writeTokens(tokens: TokenStore): void {
  const filePath = getTokensFilePath();
  fs.writeFileSync(filePath, JSON.stringify(tokens, null, 2), "utf-8");
}

export function updateOuraTokens(oura: OuraTokens): void {
  const store = readTokens();
  store.oura = oura;
  writeTokens(store);
}

export function updateStravaTokens(strava: StravaTokens): void {
  const store = readTokens();
  store.strava = strava;
  writeTokens(store);
}

export function getOuraTokens(): OuraTokens | null {
  return readTokens().oura ?? null;
}

export function getStravaTokens(): StravaTokens | null {
  return readTokens().strava ?? null;
}
