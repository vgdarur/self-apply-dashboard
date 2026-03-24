import { type Job, type InsertJob, jobs, type JobStatus } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, inArray } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Create table if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    job_url TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    agent TEXT NOT NULL
  )
`);

export const db = drizzle(sqlite);

export interface IStorage {
  getJobsByAgents(agentIds: string[]): Promise<Job[]>;
  getJobsByAgent(agentId: string): Promise<Job[]>;
  getAllJobs(): Promise<Job[]>;
  updateJobStatus(id: number, status: JobStatus): Promise<Job | undefined>;
  seedJobs(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getJobsByAgents(agentIds: string[]): Promise<Job[]> {
    if (agentIds.length === 0) return [];
    return db.select().from(jobs).where(inArray(jobs.agent, agentIds)).all();
  }

  async getJobsByAgent(agentId: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.agent, agentId)).all();
  }

  async getAllJobs(): Promise<Job[]> {
    return db.select().from(jobs).all();
  }

  async updateJobStatus(id: number, status: JobStatus): Promise<Job | undefined> {
    return db.update(jobs).set({ status }).where(eq(jobs.id, id)).returning().get();
  }

  async seedJobs(): Promise<void> {
    // Check if jobs already exist
    const existing = db.select().from(jobs).all();
    if (existing.length > 0) {
      console.log(`Database already has ${existing.length} jobs, skipping seed.`);
      return;
    }

    // Try to load from the workspace JSON
    const jsonPaths = [
      path.join(process.cwd(), "self_apply_jobs.json"),
      "/home/user/workspace/self_apply_jobs.json",
    ];

    let rawData: string | null = null;
    for (const p of jsonPaths) {
      if (fs.existsSync(p)) {
        rawData = fs.readFileSync(p, "utf-8");
        console.log(`Loading seed data from ${p}`);
        break;
      }
    }

    if (!rawData) {
      console.error("No seed data found. Skipping job seeding.");
      return;
    }

    const data: Record<string, Array<{ title: string; company: string; location: string; job_url: string; source: string }>> = JSON.parse(rawData);

    let count = 0;
    for (const [agentId, jobList] of Object.entries(data)) {
      for (const job of jobList) {
        db.insert(jobs).values({
          title: job.title,
          company: job.company,
          location: job.location,
          jobUrl: job.job_url,
          source: job.source,
          status: "New",
          agent: agentId,
        }).run();
        count++;
      }
    }

    console.log(`Seeded ${count} jobs into the database.`);
  }
}

export const storage = new DatabaseStorage();
