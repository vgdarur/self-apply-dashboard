import { type Job, type JobStatus } from "@shared/schema";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Ensure selfapply schema and table exist
async function ensureTable() {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS selfapply`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS selfapply.jobs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      job_url TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'Dice',
      status TEXT NOT NULL DEFAULT 'New',
      agent TEXT NOT NULL,
      employment_type TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(job_url, agent)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS selfapply.agent_runs (
      id SERIAL PRIMARY KEY,
      agent TEXT NOT NULL,
      run_date DATE DEFAULT CURRENT_DATE,
      jobs_found INTEGER DEFAULT 0,
      sources_searched TEXT,
      status TEXT DEFAULT 'completed',
      completed_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(agent, run_date)
    )
  `);
  const result = await pool.query(`SELECT COUNT(*) FROM selfapply.jobs`);
  console.log(`selfapply.jobs has ${result.rows[0].count} jobs.`);
}

ensureTable().catch(console.error);

function rowToJob(row: any): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    jobUrl: row.job_url,
    source: row.source,
    status: row.status,
    agent: row.agent,
  };
}

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
    const placeholders = agentIds.map((_, i) => `$${i + 1}`).join(", ");
    const result = await pool.query(
      `SELECT * FROM selfapply.jobs WHERE agent IN (${placeholders}) ORDER BY created_at DESC`,
      agentIds
    );
    return result.rows.map(rowToJob);
  }

  async getJobsByAgent(agentId: string): Promise<Job[]> {
    const result = await pool.query(
      `SELECT * FROM selfapply.jobs WHERE agent = $1 ORDER BY created_at DESC`,
      [agentId]
    );
    return result.rows.map(rowToJob);
  }

  async getAllJobs(): Promise<Job[]> {
    const result = await pool.query(
      `SELECT * FROM selfapply.jobs ORDER BY created_at DESC`
    );
    return result.rows.map(rowToJob);
  }

  async updateJobStatus(id: number, status: JobStatus): Promise<Job | undefined> {
    const result = await pool.query(
      `UPDATE selfapply.jobs SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0] ? rowToJob(result.rows[0]) : undefined;
  }

  async seedJobs(): Promise<void> {
    // Data already loaded directly into Neon
  }
}

export const storage = new DatabaseStorage();
