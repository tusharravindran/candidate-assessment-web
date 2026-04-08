"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { apiFetch, apiRequest, ApiError } from "./api";

const TOKEN_KEY = "ca_jwt";

export type AuthContextValue = {
  token: string | null;
  organizationName: string;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string, orgName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrg = useCallback(async (jwt: string) => {
    try {
      const org = await apiRequest<{ name: string }>("/organization", {}, jwt);
      setOrganizationName(org.name);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (stored) {
      setToken(stored);
      void fetchOrg(stored);
    }
    setIsLoading(false);
  }, [fetchOrg]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch("/auth/sign_in", {
        method: "POST",
        body: JSON.stringify({ recruiter: { email, password } })
      });
      const data = await res.json();
      if (!res.ok) throw new ApiError(data?.message || data?.error || "Sign in failed", res.status);

      const jwt = res.headers.get("Authorization") || res.headers.get("authorization") || "";
      if (!jwt) throw new Error("No token in response");

      localStorage.setItem(TOKEN_KEY, jwt);
      setToken(jwt);
      await fetchOrg(jwt);
    },
    [fetchOrg]
  );

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await apiFetch("/auth/sign_out", { method: "DELETE" }, token);
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setOrganizationName("");
  }, [token]);

  const signUp = useCallback(
    async (name: string, email: string, password: string, orgName: string) => {
      const res = await apiFetch("/auth/sign_up", {
        method: "POST",
        body: JSON.stringify({
          recruiter: { name, email, password, password_confirmation: password },
          organization_name: orgName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new ApiError(data?.errors?.join(", ") || "Sign up failed", res.status);
      // Sign in after registration
      await signIn(email, password);
    },
    [signIn]
  );

  return (
    <AuthContext.Provider value={{ token, organizationName, isLoading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
