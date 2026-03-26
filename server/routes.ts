import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailToAgentMap, adminEmails, jobStatuses, agents } from "@shared/schema";
import { OAuth2Client } from "google-auth-library";

// Mutable in-memory copy of email→agent mappings (seeded from schema)
const liveEmailToAgentMap: Record<string, string[]> = { ...emailToAgentMap };

const GOOGLE_CLIENT_ID = "19615734221-469n6ahpnd9oocr1en0jo9s737l1f8eo.apps.googleusercontent.com";
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Simple session store (in-memory, keyed by token)
const sessions: Map<string, { email: string; name: string; picture: string }> = new Map();

function getAgentsForEmail(email: string): string[] {
  const lower = email.toLowerCase();
  if (adminEmails.includes(lower)) {
    return agents.map(a => a.id);
  }
  return liveEmailToAgentMap[lower] || [];
}

function isAdmin(email: string): boolean {
  return adminEmails.includes(email.toLowerCase());
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed database on startup
  await storage.seedJobs();

  // Dev-only test login (bypasses Google OAuth for testing)
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/auth/dev-login", (req, res) => {
      const email = "vgdarur@gmail.com";
      const sessionToken = Buffer.from(JSON.stringify({ email, ts: Date.now(), r: Math.random() })).toString("base64");
      sessions.set(sessionToken, { email, name: "Admin (Dev)", picture: "" });
      const allowedAgents = getAgentsForEmail(email);
      return res.json({
        token: sessionToken,
        user: { email, name: "Admin (Dev)", picture: "", isAdmin: true, allowedAgents },
      });
    });
  }

  // Google OAuth verify endpoint
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: "No credential provided" });
      }

      const ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const email = payload.email.toLowerCase();
      const allowedAgents = getAgentsForEmail(email);

      if (allowedAgents.length === 0) {
        return res.status(403).json({ error: "You are not authorized to access this application. Contact your admin." });
      }

      // Create a session token
      const sessionToken = Buffer.from(JSON.stringify({
        email,
        ts: Date.now(),
        r: Math.random()
      })).toString("base64");

      sessions.set(sessionToken, {
        email,
        name: payload.name || email,
        picture: payload.picture || "",
      });

      return res.json({
        token: sessionToken,
        user: {
          email,
          name: payload.name || email,
          picture: payload.picture || "",
          isAdmin: isAdmin(email),
          allowedAgents,
        },
      });
    } catch (err: any) {
      console.error("Auth error:", err);
      return res.status(401).json({ error: "Authentication failed" });
    }
  });

  // Auth middleware helper
  function getSessionUser(req: any): { email: string; name: string; picture: string } | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    return sessions.get(token) || null;
  }

  // Get current user info
  app.get("/api/auth/me", (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const allowedAgents = getAgentsForEmail(user.email);
    return res.json({
      email: user.email,
      name: user.name,
      picture: user.picture,
      isAdmin: isAdmin(user.email),
      allowedAgents,
    });
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      sessions.delete(authHeader.slice(7));
    }
    return res.json({ ok: true });
  });

  // Get jobs (filtered by user access)
  app.get("/api/jobs", async (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const allowedAgents = getAgentsForEmail(user.email);
    if (allowedAgents.length === 0) {
      return res.json([]);
    }

    const agentFilter = req.query.agent as string | undefined;
    if (agentFilter && allowedAgents.includes(agentFilter)) {
      const result = await storage.getJobsByAgent(agentFilter);
      return res.json(result);
    }

    const result = await storage.getJobsByAgents(allowedAgents);
    return res.json(result);
  });

  // ── Admin: get all email→agent mappings ──────────────────────────────
  app.get("/api/admin/mappings", (req, res) => {
    const user = getSessionUser(req);
    if (!user || !isAdmin(user.email)) {
      return res.status(403).json({ error: "Admin only" });
    }
    // Return as array for easy UI rendering
    const rows = Object.entries(liveEmailToAgentMap).map(([email, agentIds]) => ({ email, agentIds }));
    return res.json({ mappings: rows, agents: agents.map(a => ({ id: a.id, name: a.name })) });
  });

  // ── Admin: update all mappings (full replace) ─────────────────────────
  app.put("/api/admin/mappings", (req, res) => {
    const user = getSessionUser(req);
    if (!user || !isAdmin(user.email)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const { mappings } = req.body as { mappings: { email: string; agentIds: string[] }[] };
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: "mappings must be an array" });
    }
    // Clear and rebuild
    for (const key of Object.keys(liveEmailToAgentMap)) delete liveEmailToAgentMap[key];
    for (const { email, agentIds } of mappings) {
      if (email) liveEmailToAgentMap[email.toLowerCase().trim()] = agentIds;
    }
    return res.json({ ok: true });
  });

  // ── Admin: add single mapping ─────────────────────────────────────────
  app.post("/api/admin/mappings", (req, res) => {
    const user = getSessionUser(req);
    if (!user || !isAdmin(user.email)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const { email, agentIds } = req.body as { email: string; agentIds: string[] };
    if (!email || !Array.isArray(agentIds)) {
      return res.status(400).json({ error: "email and agentIds required" });
    }
    liveEmailToAgentMap[email.toLowerCase().trim()] = agentIds;
    return res.json({ ok: true });
  });

  // ── Admin: delete a mapping ───────────────────────────────────────────
  app.delete("/api/admin/mappings/:email", (req, res) => {
    const user = getSessionUser(req);
    if (!user || !isAdmin(user.email)) {
      return res.status(403).json({ error: "Admin only" });
    }
    const email = decodeURIComponent(req.params.email).toLowerCase();
    if (adminEmails.includes(email)) {
      return res.status(400).json({ error: "Cannot remove admin mapping" });
    }
    delete liveEmailToAgentMap[email];
    return res.json({ ok: true });
  });

  // Update job status
  app.patch("/api/jobs/:id/status", async (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid job id" });
    }

    const { status } = req.body;
    if (!status || !jobStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await storage.updateJobStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.json(updated);
  });

  return httpServer;
}
