import type { TonalFeatures, BandKey } from "@/lib/tonal-engine";
import { BAND_KEYS, blendFeatures } from "@/lib/tonal-engine";
import type { IRWinRecord } from "@/lib/musical-roles";

export type TasteMode = "singleIR" | "blend";
export type TasteIntent = "rhythm" | "lead" | "clean";
export type VoteSource = "learning" | "pick4" | "ab" | "ratio";

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
  version: 2;
  models: Record<string, ModelState>;
  complements: Record<string, Record<string, number>>;
  irWins?: Record<string, Record<string, IRWinRecord>>;
};

const STORAGE_KEY = "irscope.taste.v1";
const SANDBOX_STORAGE_KEY = "irscope.taste.sandbox";

const DEFAULT_STATE: StoreState = {
  version: 2,
  models: {},
  complements: {},
};

let _sandboxMode = false;

export function setSandboxMode(on: boolean): void {
  _sandboxMode = on;
}

export function isSandboxMode(): boolean {
  return _sandboxMode;
}

function activeStorageKey(): string {
  return _sandboxMode ? SANDBOX_STORAGE_KEY : STORAGE_KEY;
}

export function promoteSandboxToLive(): boolean {
  try {
    const sandboxRaw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!sandboxRaw) return false;
    const sandbox = JSON.parse(sandboxRaw) as StoreState;
    if (!sandbox || sandbox.version !== 2) return false;

    const live = loadStateFrom(STORAGE_KEY);

    for (const [key, model] of Object.entries(sandbox.models)) {
      if (!live.models[key]) {
        live.models[key] = model;
      } else {
        const existing = live.models[key];
        const dim = Math.min(existing.w.length, model.w.length);
        for (let i = 0; i < dim; i++) {
          existing.w[i] += model.w[i];
        }
        existing.nVotes += model.nVotes;
      }
    }

    for (const [key, comps] of Object.entries(sandbox.complements ?? {})) {
      if (!live.complements[key]) live.complements[key] = {};
      for (const [pk, val] of Object.entries(comps)) {
        live.complements[key][pk] = (live.complements[key][pk] ?? 0) + val;
      }
    }

    if (sandbox.irWins) {
      if (!live.irWins) live.irWins = {};
      for (const [key, recs] of Object.entries(sandbox.irWins)) {
        if (!live.irWins[key]) live.irWins[key] = {};
        for (const [fn, rec] of Object.entries(recs)) {
          if (!live.irWins[key][fn]) live.irWins[key][fn] = { wins: 0, losses: 0, bothCount: 0 };
          live.irWins[key][fn].wins += rec.wins;
          live.irWins[key][fn].losses += rec.losses;
          live.irWins[key][fn].bothCount += rec.bothCount;
        }
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(live));
    localStorage.removeItem(SANDBOX_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearSandbox(): void {
  localStorage.removeItem(SANDBOX_STORAGE_KEY);
}

export function resetAllTaste(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SANDBOX_STORAGE_KEY);
}

export function persistTrainingMode(on: boolean): void {
  try {
    localStorage.setItem("irscope.trainingMode", on ? "1" : "0");
  } catch {}
}

export function loadPersistedTrainingMode(): boolean {
  try {
    return localStorage.getItem("irscope.trainingMode") === "1";
  } catch {
    return false;
  }
}

export function hasSandboxData(): boolean {
  return getSandboxStatus().nVotes > 0;
}

export function getSandboxStatus(): { nVotes: number } {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) return { nVotes: 0 };
    const parsed = JSON.parse(raw) as StoreState;
    let total = 0;
    for (const m of Object.values(parsed.models ?? {})) {
      total += m.nVotes ?? 0;
    }
    return { nVotes: total };
  } catch {
    return { nVotes: 0 };
  }
}

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

function makeGlobalTasteKey(ctx: TasteContext): string {
  return `${ctx.speakerPrefix}__${ctx.mode}__global`;
}

function loadStateFrom(key: string): StoreState {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...DEFAULT_STATE, models: {}, complements: {} };
    const parsed = JSON.parse(raw);
    if (!parsed) return { ...DEFAULT_STATE, models: {}, complements: {} };

    if (parsed.version === 1) {
      const migrated: StoreState = {
        version: 2,
        models: parsed.models ?? {},
        complements: {},
      };
      return migrated;
    }

    if (parsed.version !== 2) return { ...DEFAULT_STATE, models: {}, complements: {} };
    if (!parsed.complements) parsed.complements = {};
    return parsed as StoreState;
  } catch {
    return { ...DEFAULT_STATE, models: {}, complements: {} };
  }
}

export function loadState(): StoreState {
  return loadStateFrom(activeStorageKey());
}

function saveState(state: StoreState) {
  try {
    localStorage.setItem(activeStorageKey(), JSON.stringify(state));
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

export function featurizeSingleIR(ir: TonalFeatures): number[] {
  const vec: number[] = [];
  for (const k of BAND_KEYS) vec.push(safeNumber(ir.bandsShapeDb[k]) / 10);
  vec.push(safeNumber(ir.tiltDbPerOct) / 10);
  vec.push(safeNumber(ir.smoothScore) / 100);
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
  const keyIntent = makeTasteKey(ctx);
  const keyGlobal = makeGlobalTasteKey(ctx);
  const modelIntent = state.models[keyIntent];
  const modelGlobal = state.models[keyGlobal];

  const intentPrior = intentPriorScore(ctx.intent, x);

  if (!modelIntent && !modelGlobal) return { bias: intentPrior, confidence: 0 };

  let bias = intentPrior;
  if (modelGlobal) bias += 0.35 * dot(modelGlobal.w, x);
  if (modelIntent) bias += dot(modelIntent.w, x);

  const confidence = clamp((modelIntent?.nVotes ?? 0) / 30, 0, 1);
  return { bias, confidence };
}

type PriorDelta = Partial<Record<BandKey | "Tilt" | "Smooth", number>>;

const INTENT_PRIORS: Record<TasteIntent, PriorDelta> = {
  rhythm: {
    bass: +0.35,
    lowMid: +0.10,
    mid: +0.10,
    highMid: +0.15,
    presence: +0.10,
    air: -0.25,
    Smooth: +0.10,
    Tilt: -0.05,
  },
  lead: {
    mid: +0.15,
    highMid: +0.20,
    presence: +0.30,
    air: +0.15,
    lowMid: +0.05,
    Smooth: +0.15,
    Tilt: +0.05,
  },
  clean: {
    bass: -0.10,
    lowMid: -0.15,
    mid: +0.05,
    presence: +0.20,
    air: +0.10,
    Smooth: +0.25,
    Tilt: +0.10,
  },
};

function intentPriorScore(intent: TasteIntent, x: number[]): number {
  const delta = INTENT_PRIORS[intent];
  if (!delta) return 0;

  const idxOf = (k: BandKey | "Tilt" | "Smooth"): number => {
    const bandIndex = BAND_KEYS.indexOf(k as BandKey);
    if (bandIndex >= 0) return bandIndex;
    if (k === "Tilt") return BAND_KEYS.length;
    return BAND_KEYS.length + 1;
  };

  let s = 0;
  for (const [k, vRaw] of Object.entries(delta)) {
    const key = k as BandKey | "Tilt" | "Smooth";
    const i = idxOf(key);
    if (i < 0 || i >= x.length) continue;

    const v = key === "Smooth" ? (vRaw as number) : (vRaw as number) / 10.0;
    s += v * x[i];
  }

  return 0.45 * s;
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

export type VoteOutcome = "a" | "b" | "tie" | "both";

type FeatureDelta = Partial<Record<BandKey | "Tilt" | "Smooth", number>>;

const TAG_FEATURE_MAP: Record<string, FeatureDelta> = {
  more_bottom:   { subBass: +0.6, bass: +0.6, lowMid: +0.2 },
  more_mids:     { mid: +0.7, lowMid: +0.2, highMid: +0.1 },
  more_air:      { air: +0.6, presence: +0.2 },
  more_bite:     { presence: +0.6, highMid: +0.3 },
  tighter:       { lowMid: -0.5, bass: -0.2, mid: +0.2 },
  less_harsh:    { presence: -0.5, highMid: -0.2 },
  less_fizz:     { air: -0.7, presence: -0.2 },
  less_mud:      { lowMid: -0.7, bass: -0.3 },

  too_bright:    { presence: -0.6, air: -0.6, Tilt: -0.3 },
  too_dark:      { presence: +0.5, air: +0.5, Tilt: +0.3 },
  too_fizzy:     { air: -0.8, Smooth: +0.2 },
  too_thick:     { lowMid: -0.7, bass: -0.2 },
  too_thin:      { lowMid: +0.5, bass: +0.5 },
  too_scooped:   { mid: +0.8 },
  too_honky:     { highMid: -0.6, mid: -0.2 },
  harsh_attack:  { presence: -0.5 },
  lacks_cut:     { presence: +0.7, highMid: +0.2 },
  lacks_punch:   { bass: +0.4, lowMid: +0.3, mid: +0.2 },
  smooth_but_dull:{ air: +0.5, presence: +0.3, Smooth: -0.2 },

  balanced:      { mid: +0.2, lowMid: +0.2, highMid: +0.2 },
  punchy:        { mid: +0.3, presence: +0.2, bass: +0.2 },
  warm:          { lowMid: +0.4, bass: +0.2, air: -0.1 },
  aggressive:    { presence: +0.3, highMid: +0.3 },
  tight:         { lowMid: -0.2, mid: +0.2 },
  articulate:    { highMid: +0.2, presence: +0.2, Smooth: -0.1 },
  cut:           { presence: +0.4, highMid: +0.2 },
  thick:         { lowMid: +0.4, bass: +0.2 },
  fast_attack:   { presence: +0.2, Smooth: -0.1 },
  perfect:       { },
};

function applyDeltaToVector(x: number[], delta: FeatureDelta, scale: number): number[] {
  const out = x.slice();
  const idxOf = (k: BandKey | "Tilt" | "Smooth"): number => {
    const bandIndex = BAND_KEYS.indexOf(k as BandKey);
    if (bandIndex >= 0) return bandIndex;
    if (k === "Tilt") return BAND_KEYS.length;
    return BAND_KEYS.length + 1;
  };
  for (const [k, v] of Object.entries(delta)) {
    const i = idxOf(k as BandKey | "Tilt" | "Smooth");
    if (i >= 0 && i < out.length) out[i] += (v as number) * scale;
  }
  return out;
}

function sourceWeight(source?: VoteSource): number {
  if (source === "learning") return 1.0;
  if (source === "pick4") return 0.6;
  if (source === "ab") return 0.6;
  if (source === "ratio") return 0.25;
  return 0.6;
}

export function recordOutcome(
  ctx: TasteContext,
  xA: number[],
  xB: number[],
  outcome: VoteOutcome,
  opts?: { lr?: number; pairKey?: string; source?: VoteSource; tagsA?: string[]; tagsB?: string[] }
) {
  const state = loadState();
  const keyIntent = makeTasteKey(ctx);
  const keyGlobal = makeGlobalTasteKey(ctx);
  const wSrc = sourceWeight(opts?.source);
  const dim = Math.min(xA.length, xB.length);

  const ensureModels = () => {
    getOrCreateModel(state, keyIntent, dim);
    getOrCreateModel(state, keyGlobal, dim);
  };

  const bumpVotes = (incIntent: number, incGlobal: number) => {
    ensureModels();
    state.models[keyIntent].nVotes += incIntent;
    state.models[keyGlobal].nVotes += incGlobal;
    saveState(state);
  };

  if (outcome === "tie") {
    bumpVotes(0.25 * wSrc, 0.10 * wSrc);
    return;
  }

  if (outcome === "both") {
    const pk = opts?.pairKey;
    if (pk) {
      if (!state.complements[keyIntent]) state.complements[keyIntent] = {};
      state.complements[keyIntent][pk] = (state.complements[keyIntent][pk] ?? 0) + 1;
    }
    bumpVotes(0.15 * wSrc, 0.06 * wSrc);
    return;
  }

  const baseLr = opts?.lr ?? 0.06;
  const lrIntent = baseLr * wSrc;
  const lrGlobal = baseLr * wSrc * 0.35;

  ensureModels();
  const winner = outcome === "a" ? xA : xB;
  const loser  = outcome === "a" ? xB : xA;

  for (let i = 0; i < dim; i++) {
    state.models[keyIntent].w[i] += lrIntent * (winner[i] - loser[i]);
  }
  state.models[keyIntent].nVotes += 1;

  for (let i = 0; i < dim; i++) {
    state.models[keyGlobal].w[i] += lrGlobal * (winner[i] - loser[i]);
  }
  state.models[keyGlobal].nVotes += 1;

  saveState(state);

  if (opts?.source === "learning") {
    const tagScale = 0.08 * wSrc;
    const tagsA = opts?.tagsA ?? [];
    const tagsB = opts?.tagsB ?? [];

    const deltaA: FeatureDelta = {};
    for (const t of tagsA) {
      const d = TAG_FEATURE_MAP[t];
      if (!d) continue;
      for (const [k, v] of Object.entries(d)) (deltaA as any)[k] = ((deltaA as any)[k] ?? 0) + (v as number);
    }
    const deltaB: FeatureDelta = {};
    for (const t of tagsB) {
      const d = TAG_FEATURE_MAP[t];
      if (!d) continue;
      for (const [k, v] of Object.entries(d)) (deltaB as any)[k] = ((deltaB as any)[k] ?? 0) + (v as number);
    }

    const xA2 = applyDeltaToVector(xA, deltaA, tagScale);
    const xB2 = applyDeltaToVector(xB, deltaB, tagScale);

    ensureModels();
    const w2 = outcome === "a" ? xA2 : xB2;
    const l2 = outcome === "a" ? xB2 : xA2;

    for (let i = 0; i < dim; i++) {
      state.models[keyIntent].w[i] += (lrIntent * 0.5) * (w2[i] - l2[i]);
      state.models[keyGlobal].w[i] += (lrGlobal * 0.25) * (w2[i] - l2[i]);
    }
    saveState(state);
  }
}

function irWinKey(ctx: TasteContext): string {
  return `${ctx.speakerPrefix}__${ctx.intent}`;
}

function ensureIRWins(state: StoreState, key: string, filename: string): IRWinRecord {
  if (!state.irWins) state.irWins = {};
  if (!state.irWins[key]) state.irWins[key] = {};
  if (!state.irWins[key][filename]) state.irWins[key][filename] = { wins: 0, losses: 0, bothCount: 0 };
  return state.irWins[key][filename];
}

export function recordIROutcome(
  ctx: TasteContext,
  winnerFiles: string[],
  loserFiles: string[],
  isBoth?: boolean
): void {
  const state = loadState();
  const key = irWinKey(ctx);

  if (isBoth) {
    for (const f of [...winnerFiles, ...loserFiles]) {
      const rec = ensureIRWins(state, key, f);
      rec.bothCount += 1;
    }
  } else {
    for (const f of winnerFiles) {
      const rec = ensureIRWins(state, key, f);
      rec.wins += 1;
    }
    for (const f of loserFiles) {
      const rec = ensureIRWins(state, key, f);
      rec.losses += 1;
    }
  }

  saveState(state);
}

export function getIRWinRecords(ctx: TasteContext): Record<string, IRWinRecord> {
  const state = loadState();
  const key = irWinKey(ctx);
  return state.irWins?.[key] ?? {};
}

export function getComplementBoost(ctx: TasteContext, pairKey: string): number {
  const state = loadState();
  const key = makeTasteKey(ctx);
  const c = state.complements?.[key]?.[pairKey] ?? 0;
  return clamp(c, 0, 5) * 0.8;
}

export function resetTaste(ctx?: TasteContext) {
  const state = loadState();
  if (!ctx) {
    saveState(DEFAULT_STATE);
    return;
  }
  const keyIntent = makeTasteKey(ctx);
  const irKey = irWinKey(ctx);
  delete state.models[keyIntent];
  delete state.complements[keyIntent];
  if (state.irWins) delete state.irWins[irKey];
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
