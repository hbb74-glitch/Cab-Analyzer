
import { db } from "./db";
import { analyses, preferenceSignals, tonalProfiles, type InsertAnalysis, type Analysis, type InsertPreferenceSignal, type PreferenceSignal, type TonalProfile } from "@shared/schema";
import { desc, eq, and, sql } from "drizzle-orm";

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis & { 
    advice: string; 
    qualityScore: number; 
    isPerfect: boolean; 
  }): Promise<Analysis>;
  
  getAnalyses(): Promise<Analysis[]>;

  createPreferenceSignal(signal: InsertPreferenceSignal): Promise<PreferenceSignal>;
  createPreferenceSignals(signals: InsertPreferenceSignal[]): Promise<PreferenceSignal[]>;
  getPreferenceSignals(): Promise<PreferenceSignal[]>;
  deletePreferenceSignalsBySpeaker(speakerPrefix: string): Promise<number>;

  upsertTonalProfiles(entries: { mic: string; position: string; distance: string; speaker: string; subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number; centroid: number; smoothness: number }[]): Promise<number>;
  getTonalProfiles(): Promise<TonalProfile[]>;
}

export class DatabaseStorage implements IStorage {
  async createAnalysis(analysis: InsertAnalysis & { 
    advice: string; 
    qualityScore: number; 
    isPerfect: boolean; 
  }): Promise<Analysis> {
    const [newAnalysis] = await db.insert(analyses).values(analysis).returning();
    return newAnalysis;
  }

  async getAnalyses(): Promise<Analysis[]> {
    return await db.select().from(analyses).orderBy(desc(analyses.createdAt));
  }

  async createPreferenceSignal(signal: InsertPreferenceSignal): Promise<PreferenceSignal> {
    const [row] = await db.insert(preferenceSignals).values(signal).returning();
    return row;
  }

  async createPreferenceSignals(signals: InsertPreferenceSignal[]): Promise<PreferenceSignal[]> {
    if (signals.length === 0) return [];
    return await db.insert(preferenceSignals).values(signals).returning();
  }

  async getPreferenceSignals(): Promise<PreferenceSignal[]> {
    return await db.select().from(preferenceSignals).orderBy(desc(preferenceSignals.createdAt));
  }

  async deletePreferenceSignalsBySpeaker(speakerPrefix: string): Promise<number> {
    const pattern = `${speakerPrefix}_%`;
    const result = await db.delete(preferenceSignals).where(
      sql`${preferenceSignals.baseFilename} LIKE ${pattern} OR ${preferenceSignals.featureFilename} LIKE ${pattern}`
    ).returning();
    return result.length;
  }

  async upsertTonalProfiles(entries: { mic: string; position: string; distance: string; speaker: string; subBass: number; bass: number; lowMid: number; mid: number; highMid: number; presence: number; ratio: number; centroid: number; smoothness: number }[]): Promise<number> {
    let upserted = 0;
    for (const entry of entries) {
      const existing = await db.select().from(tonalProfiles).where(
        and(
          eq(tonalProfiles.mic, entry.mic),
          eq(tonalProfiles.position, entry.position),
          eq(tonalProfiles.distance, entry.distance),
          eq(tonalProfiles.speaker, entry.speaker),
        )
      ).limit(1);

      if (existing.length > 0) {
        const old = existing[0];
        const n = old.sampleCount;
        await db.update(tonalProfiles).set({
          subBass: (old.subBass * n + entry.subBass) / (n + 1),
          bass: (old.bass * n + entry.bass) / (n + 1),
          lowMid: (old.lowMid * n + entry.lowMid) / (n + 1),
          mid: (old.mid * n + entry.mid) / (n + 1),
          highMid: (old.highMid * n + entry.highMid) / (n + 1),
          presence: (old.presence * n + entry.presence) / (n + 1),
          ratio: (old.ratio * n + entry.ratio) / (n + 1),
          centroid: (old.centroid * n + entry.centroid) / (n + 1),
          smoothness: (old.smoothness * n + entry.smoothness) / (n + 1),
          sampleCount: n + 1,
          updatedAt: new Date(),
        }).where(eq(tonalProfiles.id, old.id));
      } else {
        await db.insert(tonalProfiles).values({
          ...entry,
          sampleCount: 1,
        });
      }
      upserted++;
    }
    return upserted;
  }

  async getTonalProfiles(): Promise<TonalProfile[]> {
    return await db.select().from(tonalProfiles).orderBy(desc(tonalProfiles.sampleCount));
  }
}

export const storage = new DatabaseStorage();
