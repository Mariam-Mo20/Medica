import { create } from "zustand";
import { AuthUser } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const data = await api.post<{ access_token: string; refresh_token: string }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);

    const me = await api.get<{ user: AuthUser }>("/auth/me");
    set({ user: me.user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("tenant_slug");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchMe: async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const data = await api.get<{ user: AuthUser }>("/auth/me");
      set({ user: data.user, isAuthenticated: true, isLoading: false });
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
          set({ user: me.user, isAuthenticated: true, isLoading: false });
          return;
        } catch {
          // refresh also failed — logout
        }
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("tenant_slug");
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
