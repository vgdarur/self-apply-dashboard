import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { AuthUser } from "@/lib/auth";
import { agents } from "@shared/schema";
import {
  Shield,
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  UserCog,
  CheckSquare,
  Square,
  Mail,
  AlertCircle,
} from "lucide-react";

interface Mapping {
  email: string;
  agentIds: string[];
}

interface AdminPageProps {
  user: AuthUser;
  onBack: () => void;
}

export default function AdminPage({ user, onBack }: AdminPageProps) {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newAgentIds, setNewAgentIds] = useState<string[]>([]);
  const [addingNew, setAddingNew] = useState(false);

  useEffect(() => {
    loadMappings();
  }, []);

  async function loadMappings() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest("GET", "/api/admin/mappings");
      const data = await res.json();
      setMappings(data.mappings || []);
    } catch (e: any) {
      setError("Failed to load mappings.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiRequest("PUT", "/api/admin/mappings", { mappings });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMapping(email: string) {
    setMappings((prev) => prev.filter((m) => m.email !== email));
  }

  async function addMapping() {
    if (!newEmail.trim()) return;
    const email = newEmail.trim().toLowerCase();
    if (mappings.find((m) => m.email === email)) {
      setError("Email already has a mapping. Edit the existing one.");
      return;
    }
    setMappings((prev) => [...prev, { email, agentIds: newAgentIds }]);
    setNewEmail("");
    setNewAgentIds([]);
    setAddingNew(false);
  }

  function toggleAgentForMapping(mappingEmail: string, agentId: string) {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.email !== mappingEmail) return m;
        const has = m.agentIds.includes(agentId);
        return {
          ...m,
          agentIds: has
            ? m.agentIds.filter((id) => id !== agentId)
            : [...m.agentIds, agentId],
        };
      })
    );
  }

  function toggleNewAgent(agentId: string) {
    setNewAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  }

  const isAdminEmail = (email: string) => email === user.email;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 bg-card">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground">Admin Panel</h1>
                <p className="text-[10px] text-muted-foreground">Role-Based Access Control</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Signed in as <span className="text-primary font-medium">{user.email}</span>
            </span>
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving…" : "Save All"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <CheckSquare className="w-4 h-4 shrink-0" />
            Access rules saved successfully.
          </div>
        )}

        {/* Agent legend */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserCog className="w-3.5 h-3.5" />
            Available Agents
          </h2>
          <div className="flex flex-wrap gap-2">
            {agents.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-foreground border border-border"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: a.color }}
                />
                {a.name}
                <span className="text-muted-foreground">({a.id})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Mappings table */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Email → Agent Access
            </h2>
            <button
              onClick={() => { setAddingNew(true); setError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Add User
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Add new row */}
              {addingNew && (
                <div className="px-5 py-4 bg-primary/5 border-b border-primary/20">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="email"
                        placeholder="user@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                      <button
                        onClick={addMapping}
                        disabled={!newEmail.trim() || newAgentIds.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                      <button
                        onClick={() => { setAddingNew(false); setNewEmail(""); setNewAgentIds([]); }}
                        className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agents.map((a) => {
                        const checked = newAgentIds.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            onClick={() => toggleNewAgent(a.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              checked
                                ? "bg-primary/15 border-primary/40 text-primary"
                                : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {checked ? (
                              <CheckSquare className="w-3.5 h-3.5" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                            {a.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {mappings.length === 0 && !addingNew && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No mappings found. Add a user above.
                </div>
              )}

              {mappings.map((mapping) => {
                const isAdmin = isAdminEmail(mapping.email);
                return (
                  <div key={mapping.email} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {mapping.email}
                          </span>
                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30">
                              <Shield className="w-2.5 h-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {agents.map((a) => {
                            const checked = mapping.agentIds.includes(a.id);
                            return (
                              <button
                                key={a.id}
                                onClick={() => !isAdmin && toggleAgentForMapping(mapping.email, a.id)}
                                disabled={isAdmin}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                  isAdmin
                                    ? "bg-primary/10 border-primary/20 text-primary cursor-default"
                                    : checked
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                    : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border"
                                }`}
                              >
                                {isAdmin ? (
                                  <CheckSquare className="w-3 h-3" />
                                ) : checked ? (
                                  <CheckSquare className="w-3 h-3" />
                                ) : (
                                  <Square className="w-3 h-3" />
                                )}
                                {a.name}
                              </button>
                            );
                          })}
                        </div>
                        {!isAdmin && mapping.agentIds.length === 0 && (
                          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            No agents selected — this user won't be able to log in.
                          </p>
                        )}
                      </div>
                      {!isAdmin && (
                        <button
                          onClick={() => deleteMapping(mapping.email)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                          title="Remove access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center pb-4">
          Changes are applied immediately after saving. Admin ({user.email}) always has full access.
        </p>
      </div>
    </div>
  );
}
