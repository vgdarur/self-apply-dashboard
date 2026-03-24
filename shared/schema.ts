import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  jobUrl: text("job_url").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull().default("New"),
  agent: text("agent").notNull(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export const jobStatuses = ["New", "Applied", "Interview", "Offer", "Rejected", "Skipped"] as const;
export type JobStatus = typeof jobStatuses[number];

export const agents = [
  { id: "krishnaja1", name: "V Krishna", role: "C2C Contract (IT)", location: "Dallas/Remote", color: "hsl(262, 72%, 56%)" },
  { id: "udayja1", name: "Uday Kumar Chitturi", role: "C2C Front-End Developer", location: "Atlanta/Remote/USA", color: "hsl(38, 92%, 50%)" },
  { id: "shasheeja1", name: "Shashi Kumar", role: "C2C DevOps/SRE", location: "Remote/USA", color: "hsl(340, 75%, 55%)" },
  { id: "rajja1", name: "Raja Vamshi", role: "C2C Java Fullstack", location: "Remote/USA", color: "hsl(200, 80%, 50%)" },
  { id: "dunteesja1", name: "Dunteesh", role: "C2C Python Developer", location: "Remote/USA", color: "hsl(25, 90%, 55%)" },
  { id: "purvaja1", name: "Purva", role: "C2C Technical Writer", location: "Remote/USA", color: "hsl(290, 70%, 55%)" },
  { id: "ramanaja1", name: "Ramana", role: "C2C React Developer", location: "Remote/USA", color: "hsl(150, 70%, 45%)" },
] as const;

export type Agent = typeof agents[number];

// Email to agent mapping for access control
export const emailToAgentMap: Record<string, string[]> = {
  "vgdarur@gmail.com": ["krishnaja1", "udayja1", "shasheeja1", "rajja1", "dunteesja1", "purvaja1", "ramanaja1"], // admin sees all
  "shashidevops6@gmail.com": ["shasheeja1"],
  "rajavamshisvln@gmail.com": ["rajja1"],
  "dunti0001@gmail.com": ["dunteesja1"],
  "purvat.111@gmail.com": ["purvaja1"],
};

export const adminEmails = ["vgdarur@gmail.com"];
