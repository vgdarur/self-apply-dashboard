import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Job, agents, type JobStatus, jobStatuses } from "@shared/schema";
import type { AuthUser } from "@/lib/auth";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import {
  Briefcase,
  Send,
  MessageSquare,
  Clock,
  ExternalLink,
  LogOut,
  ChevronDown,
  Users,
  Filter,
  Shield,
} from "lucide-react";

interface DashboardProps {
  user: AuthUser;
  onLogout: () => void;
  onAdmin?: () => void;
}

const agentColorMap: Record<string, string> = {
  krishnaja1: "hsl(262, 72%, 56%)",
  udayja1: "hsl(38, 92%, 50%)",
  shasheeja1: "hsl(340, 75%, 55%)",
  rajja1: "hsl(200, 80%, 50%)",
  dunteesja1: "hsl(25, 90%, 55%)",
  purvaja1: "hsl(290, 70%, 55%)",
  ramanaja1: "hsl(150, 70%, 45%)",
};

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  New: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  Applied: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  Interview: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  Offer: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  Rejected: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  Skipped: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/20" },
};

function StatusBadge({
  status,
  jobId,
  onStatusChange,
}: {
  status: string;
  jobId: number;
  onStatusChange: (id: number, status: JobStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const config = statusConfig[status] || statusConfig.New;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.bg} ${config.text} ${config.border} hover:opacity-80 transition-opacity`}
        data-testid={`button-status-${jobId}`}
      >
        {status}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-popover-border rounded-lg shadow-lg py-1 min-w-[140px]">
            {jobStatuses.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onStatusChange(jobId, s);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${
                  s === status ? "text-primary font-medium" : "text-foreground"
                }`}
                data-testid={`button-status-option-${s}-${jobId}`}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard({ user, onLogout, onAdmin }: DashboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const allowedAgents = useMemo(
    () => agents.filter((a) => user.allowedAgents.includes(a.id)),
    [user.allowedAgents]
  );

  const {
    data: allJobs = [],
    isLoading,
  } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: JobStatus }) => {
      const res = await apiRequest("PATCH", `/api/jobs/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const handleStatusChange = (id: number, status: JobStatus) => {
    statusMutation.mutate({ id, status });
  };

  const filteredJobs = useMemo(() => {
    let result = allJobs;
    if (selectedAgent !== "all") {
      result = result.filter((j) => j.agent === selectedAgent);
    }
    if (statusFilter !== "all") {
      result = result.filter((j) => j.status === statusFilter);
    }
    return result;
  }, [allJobs, selectedAgent, statusFilter]);

  const stats = useMemo(() => {
    const src = selectedAgent === "all" ? allJobs : allJobs.filter((j) => j.agent === selectedAgent);
    return {
      total: src.length,
      applied: src.filter((j) => j.status === "Applied").length,
      interviews: src.filter((j) => j.status === "Interview").length,
      pending: src.filter((j) => j.status === "New").length,
      offers: src.filter((j) => j.status === "Offer").length,
    };
  }, [allJobs, selectedAgent]);

  const getAgentInfo = (agentId: string) => agents.find((a) => a.id === agentId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? "w-16" : "w-64"
        } bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 shrink-0`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="6" width="24" height="20" rx="3" stroke="hsl(174, 72%, 46%)" strokeWidth="2.5" />
                <path d="M4 12h24" stroke="hsl(174, 72%, 46%)" strokeWidth="2.5" />
                <circle cx="10" cy="9" r="1.5" fill="hsl(174, 72%, 46%)" />
                <circle cx="16" cy="9" r="1.5" fill="hsl(174, 72%, 46%)" />
                <path d="M10 17h8" stroke="hsl(174, 72%, 46%)" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M10 21h12" stroke="hsl(174, 72%, 46%)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-sm font-semibold text-foreground">Self Apply</h1>
                <p className="text-[10px] text-muted-foreground">Job Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Agent list */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto py-3">
            <div className="px-3 mb-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Agents
              </span>
            </div>

            <button
              onClick={() => setSelectedAgent("all")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                selectedAgent === "all"
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              }`}
              data-testid="button-agent-all"
            >
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">All Agents</span>
              <span className="ml-auto text-xs text-muted-foreground">{allJobs.length}</span>
            </button>

            {allowedAgents.map((agent) => {
              const count = allJobs.filter((j) => j.agent === agent.id).length;
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    selectedAgent === agent.id
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                  }`}
                  data-testid={`button-agent-${agent.id}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: agentColorMap[agent.id] }}
                  />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium text-xs truncate w-full">{agent.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate w-full">{agent.role}</span>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* User profile at bottom */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {/* Admin button — only shown to admin users */}
          {onAdmin && !sidebarCollapsed && (
            <button
              onClick={onAdmin}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
              data-testid="button-admin"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              Admin Panel
            </button>
          )}
          {onAdmin && sidebarCollapsed && (
            <button
              onClick={onAdmin}
              className="w-full flex items-center justify-center p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Admin Panel"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-7 h-7 rounded-full shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-logout"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground" data-testid="text-page-title">
                {selectedAgent === "all"
                  ? "All Jobs"
                  : `${getAgentInfo(selectedAgent)?.name}'s Jobs`}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedAgent === "all"
                  ? "Viewing jobs from all agents"
                  : getAgentInfo(selectedAgent)?.role}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-secondary text-foreground text-xs rounded-md px-2.5 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="select-status-filter"
                >
                  <option value="all">All Statuses</option>
                  {jobStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="px-6 py-4 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              label="Total Jobs"
              value={stats.total}
              icon={<Briefcase className="w-4 h-4" />}
              color="text-primary"
              bgColor="bg-primary/10"
            />
            <KPICard
              label="Applied"
              value={stats.applied}
              icon={<Send className="w-4 h-4" />}
              color="text-emerald-400"
              bgColor="bg-emerald-500/10"
            />
            <KPICard
              label="Interviews"
              value={stats.interviews}
              icon={<MessageSquare className="w-4 h-4" />}
              color="text-amber-400"
              bgColor="bg-amber-500/10"
            />
            <KPICard
              label="Pending"
              value={stats.pending}
              icon={<Clock className="w-4 h-4" />}
              color="text-blue-400"
              bgColor="bg-blue-500/10"
            />
          </div>
        </div>

        {/* Job Table */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-muted-foreground">Loading jobs...</span>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Briefcase className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No jobs found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <table className="w-full" data-testid="table-jobs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                      Location
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                      Source
                    </th>
                    {selectedAgent === "all" && (
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                        Agent
                      </th>
                    )}
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => {
                    const agentInfo = getAgentInfo(job.agent);
                    return (
                      <tr
                        key={job.id}
                        className="border-b border-border/50 hover:bg-accent/50 transition-colors"
                        data-testid={`row-job-${job.id}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {selectedAgent === "all" && (
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: agentColorMap[job.agent] }}
                              />
                            )}
                            <span className="text-sm font-medium text-foreground line-clamp-1">
                              {job.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {job.company}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                          {job.location}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                            {job.source}
                          </span>
                        </td>
                        {selectedAgent === "all" && (
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: agentColorMap[job.agent] }}
                              />
                              <span className="text-xs text-muted-foreground">
                                {agentInfo?.name}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={job.status}
                            jobId={job.id}
                            onStatusChange={handleStatusChange}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={job.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                            data-testid={`link-apply-${job.id}`}
                          >
                            Apply
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attribution */}
        <div className="px-6 py-2 border-t border-border shrink-0">
          <PerplexityAttribution />
        </div>
      </main>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4" data-testid={`card-kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
