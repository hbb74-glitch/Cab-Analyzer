
import { db } from "./db";
import { analyses, type InsertAnalysis, type Analysis } from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  createAnalysis(analysis: InsertAnalysis & { 
    advice: string; 
    qualityScore: number; 
    isPerfect: boolean; 
  }): Promise<Analysis>;
  
  getAnalyses(): Promise<Analysis[]>;
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
}

export const storage = new DatabaseStorage();
