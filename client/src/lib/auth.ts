// Auth utilities - no localStorage/sessionStorage (sandboxed iframe)
// We keep auth state in React context only

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  isAdmin: boolean;
  allowedAgents: string[];
}

let authToken: string | null = null;

export function getToken(): string | null {
  return authToken;
}

export function setToken(token: string | null) {
  authToken = token;
}

export function clearToken() {
  authToken = null;
}

export function getAuthHeaders(): Record<string, string> {
  if (!authToken) return {};
  return { Authorization: `Bearer ${authToken}` };
}
