
import { db } from "./db";
import { analyses, preferenceSignals, type InsertAnalysis, type Analysis, type InsertPreferenceSignal, type PreferenceSignal } from "@shared/schema";
import { desc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
