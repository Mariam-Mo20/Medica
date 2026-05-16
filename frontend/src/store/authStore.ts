import { create } from "zustand";
import { AuthUser } from "@/types";
import { api } from "@/lib/api";

let fetchMePromise: Promise<void> | null = null;
let hasFetchedMeOnce = false;

function perfEnabled() {
  try {
    return typeof window !== "undefined" && localStorage.getItem("perf_debug") === "1";
  } catch {
    return false;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

function getBootstrapAuthState() {
  if (typeof window === "undefined") {
    return {
      user: null as AuthUser | null,
      isAuthenticated: false,
      isLoading: true,
    };
  }

  const token = localStorage.getItem("access_token");
  const cachedUserRaw = localStorage.getItem("auth_user_cache");
  let cachedUser: AuthUser | null = null;
  if (cachedUserRaw) {
    try {
      cachedUser = JSON.parse(cachedUserRaw) as AuthUser;
    } catch {
      localStorage.removeItem("auth_user_cache");
    }
  }

  if (token && cachedUser) {
    return {
      user: cachedUser,
      isAuthenticated: true,
      isLoading: false,
    };
  }

  if (token) {
    return {
      user: null as AuthUser | null,
      isAuthenticated: false,
      isLoading: true,
    };
  }

  return {
    user: null as AuthUser | null,
    isAuthenticated: false,
    isLoading: false,
  };
}

const bootstrap = getBootstrapAuthState();

export const useAuthStore = create<AuthState>((set) => ({
  user: bootstrap.user,
  isLoading: bootstrap.isLoading,
  isAuthenticated: bootstrap.isAuthenticated,

  login: async (email: string, password: string) => {
    const startedAt = performance.now();
    const data = await api.post<{ access_token: string; refresh_token: string }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);

    const payload = decodeJwtPayload(data.access_token);
    const optimisticUser: AuthUser = {
      id: Number(payload?.sub || 0),
      email,
      full_name: email.split("@")[0] || "User",
      role: String(payload?.role || "assistant"),
      tenant_id: Number(payload?.tenant_id || 0),
    };

    set({ user: optimisticUser, isAuthenticated: true, isLoading: false });

    api.get<{ user: AuthUser }>("/auth/me").then((me) => {
      localStorage.setItem("auth_user_cache", JSON.stringify(me.user));
      set({ user: me.user, isAuthenticated: true, isLoading: false });
      if (perfEnabled()) {
        console.info("[perf][auth] login hydrated by /auth/me", { durationMs: Math.round(performance.now() - startedAt) });
      }
    }).catch(() => {});

    if (perfEnabled()) {
      console.info("[perf][auth] login completed", { durationMs: Math.round(performance.now() - startedAt) });
    }
  },

  logout: () => {
    hasFetchedMeOnce = false;
    fetchMePromise = null;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("tenant_slug");
    localStorage.removeItem("auth_user_cache");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchMe: async () => {
    if (fetchMePromise) {
      return fetchMePromise;
    }

    if (hasFetchedMeOnce) {
      return;
    }

    hasFetchedMeOnce = true;

    fetchMePromise = (async () => {
      const startedAt = performance.now();
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          if (perfEnabled()) {
            console.info("[perf][auth] fetchMe skipped (no token)", { durationMs: Math.round(performance.now() - startedAt) });
          }
          return;
        }

        const cachedUser = localStorage.getItem("auth_user_cache");
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser) as AuthUser;
            set({ user: parsed, isAuthenticated: true, isLoading: false });
          } catch {
            localStorage.removeItem("auth_user_cache");
          }
        }

        const data = await api.get<{ user: AuthUser }>("/auth/me");
        localStorage.setItem("auth_user_cache", JSON.stringify(data.user));
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        if (perfEnabled()) {
          console.info("[perf][auth] fetchMe completed", { durationMs: Math.round(performance.now() - startedAt) });
        }
      } catch {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          try {
            const data = await api.post<{ access_token: string; refresh_token: string }>("/auth/refresh", {
              refresh_token: refreshToken,
            });
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);

            const me = await api.get<{ user: AuthUser }>("/auth/me");
            localStorage.setItem("auth_user_cache", JSON.stringify(me.user));
            set({ user: me.user, isAuthenticated: true, isLoading: false });
            if (perfEnabled()) {
              console.info("[perf][auth] fetchMe via refresh completed", { durationMs: Math.round(performance.now() - startedAt) });
            }
            return;
          } catch {
            // refresh also failed — logout
          }
        }
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("tenant_slug");
        localStorage.removeItem("auth_user_cache");
        set({ user: null, isAuthenticated: false, isLoading: false });
        if (perfEnabled()) {
          console.info("[perf][auth] fetchMe failed", { durationMs: Math.round(performance.now() - startedAt) });
        }
      }
    })().finally(() => {
      fetchMePromise = null;
    });

    return fetchMePromise;
  },
}));
