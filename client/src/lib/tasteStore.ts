import type { TonalFeatures } from "@/lib/tonal-engine";
import { BAND_KEYS, blendFeatures } from "@/lib/tonal-engine";

export type TasteMode = "singleIR" | "blend";
export type TasteIntent = "rhythm" | "lead" | "clean";

export type TasteContext = {
  speakerPrefix: string;
  mode: TasteMode;
  intent: TasteIntent;
};

type ModelState = {
  w: number[];
  nVotes: number;
};

type StoreState = {
  version: 1;
  models: Record<string, ModelState>;
};

const STORAGE_KEY = "irscope.taste.v1";

const DEFAULT_STATE: StoreState = {
  version: 1,
  models: {},
};

function safeNumber(v: any, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

export function makeTasteKey(ctx: TasteContext): string {
  return `${ctx.speakerPrefix}__${ctx.mode}__${ctx.intent}`;
}

function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return DEFAULT_STATE;
    return parsed as StoreState;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: StoreState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function getOrCreateModel(state: StoreState, key: string, dim: number): ModelState {
  const existing = state.models[key];
  if (existing && Array.isArray(existing.w) && existing.w.length === dim) return existing;
  const fresh: ModelState = { w: new Array(dim).fill(0), nVotes: 0 };
  state.models[key] = fresh;
  return fresh;
}

export function featurizeBlend(base: TonalFeatures, feat: TonalFeatures, baseRatio: number): number[] {
  const a = clamp(baseRatio, 0.3, 0.7);
  const b = 1 - a;

  const blended = blendFeatures(base, feat, a, b);

  const vec: number[] = [];

  for (const k of BAND_KEYS) vec.push(safeNumber(blended.bandsShapeDb[k]));
  vec.push(safeNumber(blended.tiltDbPerOct));
  vec.push(safeNumber(blended.smoothScore));

  return vec;
}

function dot(w: number[], x: number[]): number {
  let s = 0;
  const n = Math.min(w.length, x.length);
  for (let i = 0; i < n; i++) s += w[i] * x[i];
  return s;
}

export function getTasteBias(ctx: TasteContext, x: number[]): { bias: number; confidence: number } {
  const state = loadState();
  const key = makeTasteKey(ctx);
  const model = state.models[key];
  if (!model) return { bias: 0, confidence: 0 };

  const bias = dot(model.w, x);
  const confidence = clamp(model.nVotes / 30, 0, 1);
  return { bias, confidence };
}

export function recordPreference(
  ctx: TasteContext,
  xWinner: number[],
  xLoser: number[],
  opts?: { lr?: number; tie?: boolean }
): void {
  if (opts?.tie) return;

  const lr = opts?.lr ?? 0.15;
  const state = loadState();
  const key = makeTasteKey(ctx);
  const dim = Math.min(xWinner.length, xLoser.length);
  const model = getOrCreateModel(state, key, dim);

  for (let i = 0; i < dim; i++) {
    model.w[i] += lr * (xWinner[i] - xLoser[i]);
  }
  model.nVotes += 1;

  saveState(state);
}

export function resetTaste(ctx?: TasteContext) {
  const state = loadState();
  if (!ctx) {
    saveState(DEFAULT_STATE);
    return;
  }
  const key = makeTasteKey(ctx);
  delete state.models[key];
  saveState(state);
}

export function getTasteStatus(ctx: TasteContext): { nVotes: number; confidence: number } {
  const state = loadState();
  const key = makeTasteKey(ctx);
  const model = state.models[key];
  const nVotes = model?.nVotes ?? 0;
  const confidence = clamp(nVotes / 30, 0, 1);
  return { nVotes, confidence };
}

export function simulateVotes(ctx: TasteContext, vectors: number[][], count = 20) {
  if (!vectors.length) return;

  const tiltIndex = vectors[0].length - 2;

  const sorted = [...vectors].sort((a, b) => (b[tiltIndex] ?? 0) - (a[tiltIndex] ?? 0));
  const winner = sorted[0];
  const losers = sorted.slice(1);

  for (let i = 0; i < count; i++) {
    const loser = losers[i % losers.length] ?? sorted[sorted.length - 1];
    recordPreference(ctx, winner, loser, { lr: 0.12 });
  }
}
