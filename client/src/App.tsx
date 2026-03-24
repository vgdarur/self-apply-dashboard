import { useState, useEffect, useCallback } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import { type AuthUser, setToken, clearToken, getToken } from "@/lib/auth";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Always dark mode for this app
    document.documentElement.classList.add("dark");
  }, []);
  return <>{children}</>;
}

function AuthenticatedApp() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if we have a valid session on mount
  useEffect(() => {
    const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
    const token = getToken();
    if (token) {
      // Verify existing session
      fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => { if (res.ok) return res.json(); throw new Error("expired"); })
        .then((data: AuthUser) => setUser(data))
        .catch(() => clearToken())
        .finally(() => setCheckingAuth(false));
      return;
    }
    // Check for dev auto-login via URL param
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev") === "1") {
      fetch(`${API_BASE}/api/auth/dev-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then((res) => { if (res.ok) return res.json(); throw new Error("dev login failed"); })
        .then((data: any) => { setToken(data.token); setUser(data.user); })
        .catch(() => {})
        .finally(() => setCheckingAuth(false));
      return;
    }
    setCheckingAuth(false);
  }, []);

  const handleLogin = useCallback(async (credential: string) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const res = await fetch(
        ("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__") + "/api/auth/google",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Login failed");
        return;
      }
      setToken(data.token);
      setUser(data.user);
      // Clear all query caches since we just logged in
      queryClient.clear();
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {
      // ignore
    }
    clearToken();
    setUser(null);
    queryClient.clear();
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} isLoading={isLoading} error={loginError} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={AuthenticatedApp} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
