export interface TonalBands {
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  presence: number;
  ratio: number;
  centroid: number;
  smoothness: number;
}

export interface ProfileRecord extends TonalBands {
  mic: string;
  position: string;
  distance: string;
  speaker: string;
  sampleCount: number;
}

export interface ExtrapolatedProfile extends TonalBands {
  mic: string;
  position: string;
  distance: string;
  speaker: string;
  confidence: "high" | "medium" | "low";
  basis: string;
  sourceSpeakers: string[];
  samplesBehindGradient: number;
}

const BAND_KEYS: (keyof TonalBands)[] = [
  "subBass", "bass", "lowMid", "mid", "highMid", "presence",
  "ratio", "centroid", "smoothness",
];

function extractBands(p: ProfileRecord): TonalBands {
  return {
    subBass: p.subBass, bass: p.bass, lowMid: p.lowMid,
    mid: p.mid, highMid: p.highMid, presence: p.presence,
    ratio: p.ratio, centroid: p.centroid, smoothness: p.smoothness,
  };
}

function normalizeMic(mic: string): string {
  return mic.toUpperCase().replace(/[-\s]/g, '');
}

function normalizePosition(pos: string): string {
  return pos.toLowerCase().replace(/[-_\s]/g, '');
}

function parseDistance(d: string): number | null {
  const match = d.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

interface DistanceGradient {
  perInch: TonalBands;
  speakerCount: number;
  totalSamples: number;
  distanceRange: [number, number];
}

interface PositionDelta {
  fromPosition: string;
  toPosition: string;
  delta: TonalBands;
  speakerCount: number;
  totalSamples: number;
}

interface MicModel {
  mic: string;
  distanceGradients: Map<string, DistanceGradient>;
  positionDeltas: PositionDelta[];
  knownPositions: string[];
  knownDistances: string[];
}

function averageBands(bandsList: TonalBands[]): TonalBands {
  const result: Record<string, number> = {};
  for (const key of BAND_KEYS) {
    let sum = 0;
    for (const b of bandsList) sum += b[key];
    result[key] = sum / bandsList.length;
  }
  return result as unknown as TonalBands;
}

function subtractBands(a: TonalBands, b: TonalBands): TonalBands {
  const result: Record<string, number> = {};
  for (const key of BAND_KEYS) {
    result[key] = a[key] - b[key];
  }
  return result as unknown as TonalBands;
}

function addBands(a: TonalBands, b: TonalBands): TonalBands {
  const result: Record<string, number> = {};
  for (const key of BAND_KEYS) {
    result[key] = a[key] + b[key];
  }
  return result as unknown as TonalBands;
}

function scaleBands(b: TonalBands, factor: number): TonalBands {
  const result: Record<string, number> = {};
  for (const key of BAND_KEYS) {
    result[key] = b[key] * factor;
  }
  return result as unknown as TonalBands;
}

function buildMicModel(mic: string, profiles: ProfileRecord[]): MicModel {
  const micProfiles = profiles.filter((p: ProfileRecord) => normalizeMic(p.mic) === normalizeMic(mic));

  const bySpeaker = new Map<string, ProfileRecord[]>();
  for (const p of micProfiles) {
    const key = p.speaker.toLowerCase();
    if (!bySpeaker.has(key)) bySpeaker.set(key, []);
    bySpeaker.get(key)!.push(p);
  }

  const knownPositionsSet = new Set<string>();
  const knownDistancesSet = new Set<string>();
  for (const p of micProfiles) {
    knownPositionsSet.add(normalizePosition(p.position));
    knownDistancesSet.add(p.distance);
  }
  const knownPositions = Array.from(knownPositionsSet);
  const knownDistances = Array.from(knownDistancesSet);

  const distanceGradients = new Map<string, DistanceGradient>();

  for (const normPos of knownPositions) {
    const perSpeakerGradients: { gradient: TonalBands; samples: number; range: [number, number] }[] = [];

    const speakerEntries = Array.from(bySpeaker.values());
    for (const spkProfiles of speakerEntries) {
      const posProfiles = spkProfiles.filter((p: ProfileRecord) => normalizePosition(p.position) === normPos);
      const withDist = posProfiles
        .map((p: ProfileRecord) => ({ ...p, numDist: parseDistance(p.distance) }))
        .filter((p: ProfileRecord & { numDist: number | null }) => p.numDist !== null)
        .sort((a: ProfileRecord & { numDist: number | null }, b: ProfileRecord & { numDist: number | null }) => a.numDist! - b.numDist!);

      if (withDist.length < 2) continue;

      const minDist = withDist[0].numDist!;
      const maxDist = withDist[withDist.length - 1].numDist!;
      const distSpan = maxDist - minDist;
      if (distSpan <= 0) continue;

      const nearBands = extractBands(withDist[0]);
      const farBands = extractBands(withDist[withDist.length - 1]);
      const delta = subtractBands(farBands, nearBands);
      const perInch = scaleBands(delta, 1 / distSpan);

      const totalSamples = withDist.reduce((s: number, p: ProfileRecord & { numDist: number | null }) => s + p.sampleCount, 0);
      perSpeakerGradients.push({ gradient: perInch, samples: totalSamples, range: [minDist, maxDist] });
    }

    if (perSpeakerGradients.length === 0) continue;

    const avgGradient = averageBands(perSpeakerGradients.map((g: { gradient: TonalBands }) => g.gradient));
    const totalSamples = perSpeakerGradients.reduce((s: number, g: { samples: number }) => s + g.samples, 0);
    const minRange = Math.min(...perSpeakerGradients.map((g: { range: [number, number] }) => g.range[0]));
    const maxRange = Math.max(...perSpeakerGradients.map((g: { range: [number, number] }) => g.range[1]));

    distanceGradients.set(normPos, {
      perInch: avgGradient,
      speakerCount: perSpeakerGradients.length,
      totalSamples,
      distanceRange: [minRange, maxRange],
    });
  }

  const positionDeltas: PositionDelta[] = [];

  for (let i = 0; i < knownPositions.length; i++) {
    for (let j = 0; j < knownPositions.length; j++) {
      if (i === j) continue;

      const fromPos = knownPositions[i];
      const toPos = knownPositions[j];

      const perSpeakerDeltas: { delta: TonalBands; samples: number }[] = [];

      const speakerEntries = Array.from(bySpeaker.values());
      for (const spkProfiles of speakerEntries) {
        const fromProfiles = spkProfiles.filter((p: ProfileRecord) => normalizePosition(p.position) === fromPos);
        const toProfiles = spkProfiles.filter((p: ProfileRecord) => normalizePosition(p.position) === toPos);

        if (fromProfiles.length === 0 || toProfiles.length === 0) continue;

        const fromAvg = averageBands(fromProfiles.map(extractBands));
        const toAvg = averageBands(toProfiles.map(extractBands));
        const delta = subtractBands(toAvg, fromAvg);
        const samples = fromProfiles.reduce((s: number, p: ProfileRecord) => s + p.sampleCount, 0) +
                        toProfiles.reduce((s: number, p: ProfileRecord) => s + p.sampleCount, 0);

        perSpeakerDeltas.push({ delta, samples });
      }

      if (perSpeakerDeltas.length === 0) continue;

      positionDeltas.push({
        fromPosition: fromPos,
        toPosition: toPos,
        delta: averageBands(perSpeakerDeltas.map((d: { delta: TonalBands }) => d.delta)),
        speakerCount: perSpeakerDeltas.length,
        totalSamples: perSpeakerDeltas.reduce((s: number, d: { samples: number }) => s + d.samples, 0),
      });
    }
  }

  return { mic, distanceGradients, positionDeltas, knownPositions, knownDistances };
}

function computeConfidence(
  speakerCount: number,
  totalSamples: number,
  isDoublePrediction: boolean
): "high" | "medium" | "low" {
  if (isDoublePrediction) {
    return speakerCount >= 3 && totalSamples >= 10 ? "medium" : "low";
  }
  if (speakerCount >= 3 && totalSamples >= 15) return "high";
  if (speakerCount >= 2 && totalSamples >= 6) return "medium";
  return "low";
}

export function buildExtrapolatedProfiles(
  allProfiles: ProfileRecord[],
  targetSpeaker?: string
): ExtrapolatedProfile[] {
  const micSet = new Set<string>();
  for (const p of allProfiles) micSet.add(normalizeMic(p.mic));

  const micModels = new Map<string, MicModel>();
  Array.from(micSet).forEach((mic: string) => {
    micModels.set(mic, buildMicModel(mic, allProfiles));
  });

  const existingKeys = new Set<string>();
  for (const p of allProfiles) {
    existingKeys.add(`${normalizeMic(p.mic)}|${normalizePosition(p.position)}|${p.distance}|${p.speaker.toLowerCase()}`);
  }

  const predictions: ExtrapolatedProfile[] = [];

  const speakers = new Set<string>();
  for (const p of allProfiles) speakers.add(p.speaker.toLowerCase());

  const targetSpeakers = targetSpeaker
    ? [targetSpeaker.toLowerCase()]
    : Array.from(speakers);

  for (const speaker of targetSpeakers) {
    const speakerProfiles = allProfiles.filter((p: ProfileRecord) => p.speaker.toLowerCase() === speaker);

    const modelEntries = Array.from(micModels.entries());
    for (const [normMic, model] of modelEntries) {
      const micSpeakerProfiles = speakerProfiles.filter((p: ProfileRecord) => normalizeMic(p.mic) === normMic);
      if (micSpeakerProfiles.length === 0) continue;

      const existingPositions = new Set(micSpeakerProfiles.map((p: ProfileRecord) => normalizePosition(p.position)));
      const existingDistances = new Map<string, Set<string>>();
      for (const p of micSpeakerProfiles) {
        const normPos = normalizePosition(p.position);
        if (!existingDistances.has(normPos)) existingDistances.set(normPos, new Set());
        existingDistances.get(normPos)!.add(p.distance);
      }

      for (const targetPos of model.knownPositions) {
        if (existingPositions.has(targetPos)) {
          const posDistances = existingDistances.get(targetPos);
          const gradient = model.distanceGradients.get(targetPos);
          if (!gradient) continue;

          for (const targetDist of model.knownDistances) {
            if (posDistances && posDistances.has(targetDist)) continue;

            const key = `${normMic}|${targetPos}|${targetDist}|${speaker}`;
            if (existingKeys.has(key)) continue;

            const anchorProfile = micSpeakerProfiles
              .filter((p: ProfileRecord) => normalizePosition(p.position) === targetPos)
              .sort((a: ProfileRecord, b: ProfileRecord) => b.sampleCount - a.sampleCount)[0];
            if (!anchorProfile) continue;

            const anchorDist = parseDistance(anchorProfile.distance);
            const targetDistNum = parseDistance(targetDist);
            if (anchorDist === null || targetDistNum === null) continue;

            const distDelta = targetDistNum - anchorDist;
            const predicted = addBands(extractBands(anchorProfile), scaleBands(gradient.perInch, distDelta));

            const srcSpeakers = Array.from(new Set(allProfiles
              .filter((p: ProfileRecord) => normalizeMic(p.mic) === normMic && normalizePosition(p.position) === targetPos)
              .map((p: ProfileRecord) => p.speaker)));

            predictions.push({
              ...predicted,
              mic: anchorProfile.mic,
              position: anchorProfile.position,
              distance: targetDist,
              speaker: anchorProfile.speaker,
              confidence: computeConfidence(gradient.speakerCount, gradient.totalSamples, false),
              basis: `distance gradient from ${anchorProfile.distance} (${gradient.speakerCount} speakers, ${gradient.totalSamples} samples)`,
              sourceSpeakers: srcSpeakers,
              samplesBehindGradient: gradient.totalSamples,
            });
            existingKeys.add(key);
          }
        } else {
          const bestDelta = model.positionDeltas
            .filter((d: PositionDelta) => d.toPosition === targetPos && existingPositions.has(d.fromPosition))
            .sort((a: PositionDelta, b: PositionDelta) => b.speakerCount - a.speakerCount || b.totalSamples - a.totalSamples)[0];

          if (!bestDelta) continue;

          const anchorProfile = micSpeakerProfiles
            .filter((p: ProfileRecord) => normalizePosition(p.position) === bestDelta.fromPosition)
            .sort((a: ProfileRecord, b: ProfileRecord) => b.sampleCount - a.sampleCount)[0];
          if (!anchorProfile) continue;

          const key = `${normMic}|${targetPos}|${anchorProfile.distance}|${speaker}`;
          if (existingKeys.has(key)) continue;

          const predicted = addBands(extractBands(anchorProfile), bestDelta.delta);

          const originalPos = allProfiles.find((p: ProfileRecord) =>
            normalizeMic(p.mic) === normMic && normalizePosition(p.position) === targetPos
          )?.position || targetPos;

          const srcSpeakers = Array.from(new Set(allProfiles
            .filter((p: ProfileRecord) => normalizeMic(p.mic) === normMic)
            .map((p: ProfileRecord) => p.speaker)));

          predictions.push({
            ...predicted,
            mic: anchorProfile.mic,
            position: originalPos,
            distance: anchorProfile.distance,
            speaker: anchorProfile.speaker,
            confidence: computeConfidence(bestDelta.speakerCount, bestDelta.totalSamples, false),
            basis: `position delta from ${bestDelta.fromPosition} (${bestDelta.speakerCount} speakers, ${bestDelta.totalSamples} samples)`,
            sourceSpeakers: srcSpeakers,
            samplesBehindGradient: bestDelta.totalSamples,
          });
          existingKeys.add(key);

          const gradient = model.distanceGradients.get(bestDelta.fromPosition)
            || model.distanceGradients.get(targetPos);

          if (gradient) {
            for (const targetDist of model.knownDistances) {
              if (targetDist === anchorProfile.distance) continue;

              const dKey = `${normMic}|${targetPos}|${targetDist}|${speaker}`;
              if (existingKeys.has(dKey)) continue;

              const anchorDist = parseDistance(anchorProfile.distance);
              const targetDistNum = parseDistance(targetDist);
              if (anchorDist === null || targetDistNum === null) continue;

              const distDelta = targetDistNum - anchorDist;
              const doublePredicted = addBands(predicted, scaleBands(gradient.perInch, distDelta));

              predictions.push({
                ...doublePredicted,
                mic: anchorProfile.mic,
                position: originalPos,
                distance: targetDist,
                speaker: anchorProfile.speaker,
                confidence: computeConfidence(
                  Math.min(bestDelta.speakerCount, gradient.speakerCount),
                  Math.min(bestDelta.totalSamples, gradient.totalSamples),
                  true
                ),
                basis: `position delta from ${bestDelta.fromPosition} + distance gradient (${Math.min(bestDelta.speakerCount, gradient.speakerCount)} speakers)`,
                sourceSpeakers: srcSpeakers,
                samplesBehindGradient: Math.min(bestDelta.totalSamples, gradient.totalSamples),
              });
              existingKeys.add(dKey);
            }
          }
        }
      }
    }
  }

  return predictions;
}

export function formatExtrapolatedProfilesForPrompt(predictions: ExtrapolatedProfile[]): string {
  if (predictions.length === 0) return '';

  const byMic = new Map<string, ExtrapolatedProfile[]>();
  for (const p of predictions) {
    const key = p.mic;
    if (!byMic.has(key)) byMic.set(key, []);
    byMic.get(key)!.push(p);
  }

  let section = `\n=== EXTRAPOLATED TONAL PREDICTIONS (from cross-speaker gradients) ===
These are PREDICTED profiles for mic/position/distance combos that haven't been directly measured on this speaker.
They are derived from the same mic's behavior on other speakers. Use them with appropriate caution — they are estimates, not measurements.
Confidence levels indicate how much real data backs each prediction.\n\n`;

  const micEntries = Array.from(byMic.entries());
  for (const [mic, preds] of micEntries) {
    section += `--- ${mic} ---\n`;
    for (const p of preds) {
      section += `  [${p.confidence.toUpperCase()}] ${p.mic}@${p.position}_${p.distance} on ${p.speaker}\n`;
      section += `    Predicted: Mid=${p.mid.toFixed(1)}% HiMid=${p.highMid.toFixed(1)}% Pres=${p.presence.toFixed(1)}% Ratio=${p.ratio.toFixed(2)} Centroid=${Math.round(p.centroid)}Hz Smooth=${p.smoothness.toFixed(0)}\n`;
      section += `    Basis: ${p.basis}\n`;
      section += `    Source speakers: ${p.sourceSpeakers.join(', ')}\n\n`;
    }
  }

  return section;
}
