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

  for (const k of BAND_KEYS) {
    vec.push(safeNumber(blended.bandsShapeDb[k]) / 10);
  }

  vec.push(safeNumber(blended.tiltDbPerOct) / 10);
  vec.push(safeNumber(blended.smoothScore) / 100);

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

export function meanVector(vectors: number[][]): number[] {
  if (!vectors.length) return [];
  const dim = vectors[0].length;
  const mean = new Array(dim).fill(0);
  let count = 0;
  for (const v of vectors) {
    if (!v || v.length !== dim) continue;
    for (let i = 0; i < dim; i++) mean[i] += v[i];
    count++;
  }
  if (!count) return mean;
  for (let i = 0; i < dim; i++) mean[i] /= count;
  return mean;
}

export function centerVector(x: number[], mean: number[]): number[] {
  const n = Math.min(x.length, mean.length);
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = x[i] - mean[i];
  return out;
}

export function recordPreference(
  ctx: TasteContext,
  xWinner: number[],
  xLoser: number[],
  opts?: { lr?: number; tie?: boolean }
): void {
  if (opts?.tie) return;

  const lr = opts?.lr ?? 0.06;
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

  const n = vectors.length;
  const tiltIndex = vectors[0].length - 2;
  const meanTilt =
    vectors.reduce((s, v) => s + (Number.isFinite(v?.[tiltIndex]) ? (v[tiltIndex] as number) : 0), 0) /
    Math.max(1, vectors.length);

  for (let i = 0; i < count; i++) {
    const a = vectors[Math.floor(Math.random() * n)];
    const b = vectors[Math.floor(Math.random() * n)];
    if (!a || !b || a === b) continue;

    const aT = (Number.isFinite(a[tiltIndex]) ? (a[tiltIndex] as number) : 0) - meanTilt;
    const bT = (Number.isFinite(b[tiltIndex]) ? (b[tiltIndex] as number) : 0) - meanTilt;

    const winner = aT >= bT ? a : b;
    const loser  = winner === a ? b : a;

    recordPreference(ctx, winner, loser, { lr: 0.06 });
  }
}
