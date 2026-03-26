import { z } from "zod";

export type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  source: string;
  status: string;
  agent: string;
};

export type InsertJob = Omit<Job, "id">;

export const insertJobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  jobUrl: z.string(),
  source: z.string(),
  status: z.string().default("New"),
  agent: z.string(),
});

export const jobStatuses = ["New", "Applied", "Interview", "Offer", "Rejected", "Skipped"] as const;
export type JobStatus = typeof jobStatuses[number];

export const agents = [
  { id: "krishnaja1", name: "V Krishna", role: "C2C Java Fullstack", location: "Dallas/Remote", color: "hsl(262, 72%, 56%)" },
  { id: "udayja1", name: "Uday Kumar Chitturi", role: "C2C Front-End Developer", location: "Atlanta/Remote/USA", color: "hsl(38, 92%, 50%)" },
  { id: "shasheeja1", name: "Shashi Kumar", role: "C2C DevOps/SRE", location: "Remote/USA", color: "hsl(340, 75%, 55%)" },
  { id: "rajja1", name: "Raja Vamshi", role: "C2C Java Fullstack", location: "Remote/USA", color: "hsl(200, 80%, 50%)" },
  { id: "dunteesja1", name: "Dunteesh", role: "C2C Python Developer", location: "Remote/USA", color: "hsl(25, 90%, 55%)" },
  { id: "purvaja1", name: "Purva", role: "C2C Technical Writer", location: "Remote/USA", color: "hsl(290, 70%, 55%)" },
  { id: "ramanaja1", name: "Ramana", role: "C2C React Developer", location: "Remote/USA", color: "hsl(150, 70%, 45%)" },
] as const;

export type Agent = typeof agents[number];

export const emailToAgentMap: Record<string, string[]> = {
  "vgdarur@gmail.com": ["krishnaja1", "udayja1", "shasheeja1", "rajja1", "dunteesja1", "purvaja1", "ramanaja1"],
  "chitturiuday@gmail.com": ["udayja1"],
  "udaykcdec@gmail.com": ["udayja1"],
  "shashidevops6@gmail.com": ["shasheeja1"],
  "rajavamshisvln@gmail.com": ["rajja1"],
  "dunti0001@gmail.com": ["dunteesja1"],
  "purvat.111@gmail.com": ["purvaja1"],
  "karetiramanakumar@gmail.com": ["ramanaja1"],
  "stupbill@gmail.com": ["krishnaja1"],
};

export const adminEmails = ["vgdarur@gmail.com"];
