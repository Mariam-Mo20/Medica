import { useAuthStore } from "@/store/authStore";

const BASE_URL = "/api/v1";

function getHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function tryRefresh(): Promise<boolean> {
  const rt = localStorage.getItem("refresh_token");
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) return false;
    const d = await res.json();
    localStorage.setItem("access_token", d.access_token);
    localStorage.setItem("refresh_token", d.refresh_token);
    return true;
  } catch { return false; }
}

async function handleErr(res: Response): Promise<never> {
  let msg = `HTTP ${res.status}`;
  try {
    const b = await res.json();
    if (Array.isArray(b.detail)) {
      msg = b.detail.map((e: any) => e.msg || String(e)).join("; ");
    } else {
      msg = b.detail || b.message || msg;
    }
  } catch { try { const t = await res.text(); if (t) msg += `: ${t.slice(0, 200)}`; } catch {} }
  throw new Error(msg);
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const opts: RequestInit = { method, headers: getHeaders() };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res: Response;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    throw new Error(`Network error: ${e instanceof Error ? e.message : "Could not reach server"}`);
  }

  if (res.status === 401) {
    if (await tryRefresh()) {
      try { res = await fetch(url, { ...opts, headers: getHeaders() }); }
      catch { throw new Error("Network error after token refresh"); }
    } else {
      useAuthStore.getState().logout();
      window.location.href = "/login";
      throw new Error("Session expired");
    }
  }
  if (!res.ok) return handleErr(res);
  return res.json();
}

export const api = {
  get: <T>(p: string) => req<T>("GET", p),
  post: <T>(p: string, b?: unknown) => req<T>("POST", p, b),
  put: <T>(p: string, b?: unknown) => req<T>("PUT", p, b),
  patch: <T>(p: string, b?: unknown) => req<T>("PATCH", p, b),
  delete: <T>(p: string) => req<T>("DELETE", p),
};
