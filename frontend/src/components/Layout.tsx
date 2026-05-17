import { useEffect, useState, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Notification, NotificationList, PatientSearchResult } from "@/types";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  LogOut,
  Menu,
  X,
  Settings,
  ClipboardList,
  Search,
  BellDot,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDisplayInitial } from "@/lib/name";
import { daysAgo } from "@/lib/date";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["doctor", "assistant"] },
  { to: "/patients", label: "Patients", icon: Users, roles: ["doctor", "assistant"] },
  { to: "/appointments", label: "Appointments", icon: CalendarCheck, roles: ["doctor", "assistant"] },
  { to: "/administration", label: "Administration", icon: Settings, roles: ["doctor"] },
];

function getNavItemClasses(isCollapsed: boolean, isActive: boolean) {
  return cn(
    "flex items-center rounded-lg transition-all duration-200 text-sm",
    isCollapsed ? "justify-center px-2 py-2.5 lg:py-2" : "gap-3 px-2.5 py-2 lg:py-1.5",
    isActive
      ? "bg-primary-container text-primary font-semibold"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  );
}

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [toastNotification, setToastNotification] = useState<Notification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const lastProcessedId = useRef<number | null>(null);
  const initialized = useRef(false);
  const hiddenNotificationIds = useRef<Set<number>>(new Set());
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = () => {
    api.get<NotificationList>("/notifications/").then((data) => {
      setUnreadCount(data.unread_count);
      const unread = data.notifications.filter((n) => !n.is_read);
      if (!initialized.current) {
        initialized.current = true;
        if (unread.length > 0) {
          lastProcessedId.current = Math.max(...unread.map((n) => n.id));
        }
        return;
      }

      const newUnread = unread.find(
        (n) =>
          !hiddenNotificationIds.current.has(n.id) &&
          n.id !== lastProcessedId.current &&
          (lastProcessedId.current === null || n.id > lastProcessedId.current)
      );
      if (newUnread) {
        lastProcessedId.current = newUnread.id;
        setToastNotification(newUnread);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    const runFetch = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };

    const initialDelay = window.setTimeout(runFetch, 1200);
    const interval = setInterval(runFetch, 30000);
    document.addEventListener("visibilitychange", runFetch);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", runFetch);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const q = globalSearch.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const results = await api.get<PatientSearchResult[]>(`/patients/search?q=${encodeURIComponent(q)}`);
        setSearchResults(results);
      } catch (err) {
        setSearchResults([]);
        setSearchError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [globalSearch]);

  const isNotifsPage = location.pathname === "/notifications";

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const handleViewPatient = async (notification: Notification) => {
    try {
      await api.patch(`/notifications/${notification.id}/read`);
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
    hiddenNotificationIds.current.add(notification.id);
    lastProcessedId.current = notification.id;
    setToastNotification(null);
    if (notification.resource_type === "patient" && notification.resource_id) {
      navigate(`/patients/${notification.resource_id}`);
    }
  };

  const handleDismissToast = () => {
    if (toastNotification) {
      const n = toastNotification;
      hiddenNotificationIds.current.add(n.id);
      lastProcessedId.current = n.id;
      setToastNotification(null);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      api.patch(`/notifications/${n.id}/read`).catch(() => {});
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role || ""));

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-border flex flex-col transform transition-all duration-300 lg:relative lg:translate-x-0 lg:shadow-sm",
          sidebarCollapsed ? "w-[72px]" : "w-56",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
          <div className={cn("pt-5 pb-3", sidebarCollapsed ? "px-2" : "px-4")}>
            <div className={cn(sidebarCollapsed ? "flex justify-center" : "flex gap-3")}>
              <button
                type="button"
                onClick={() => {
                  if (sidebarCollapsed) setSidebarCollapsed(false);
                }}
                className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                title={sidebarCollapsed ? "Expand sidebar" : "Medica"}
              >
                <ClipboardList className="h-5 w-5" />
              </button>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center min-h-9">
                    <h2 className="text-base font-bold text-primary leading-none truncate">Medica</h2>
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(true)}
                      className="hidden lg:flex ml-auto items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Collapse sidebar"
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        <nav className={cn("flex-1 space-y-0.5", sidebarCollapsed ? "px-2" : "px-2.5")}>
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={getNavItemClasses(sidebarCollapsed, isActive)}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-foreground/70")} />
                {!sidebarCollapsed && item.label}
              </Link>
            );
          })}
        </nav>

        <div className={cn("mt-auto pt-2 pb-2 border-t border-border space-y-0.5", sidebarCollapsed ? "px-2" : "px-2.5")}>
          <Link
            to="/notifications"
            onClick={() => setSidebarOpen(false)}
            title={sidebarCollapsed ? "Notifications" : undefined}
            className={getNavItemClasses(sidebarCollapsed, location.pathname === "/notifications")}
          >
            <div className="relative">
              <BellDot className="h-5 w-5 text-foreground/70" />
              {!isNotifsPage && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {!sidebarCollapsed && "Notifications"}
          </Link>
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            title={sidebarCollapsed ? "Settings" : undefined}
            className={getNavItemClasses(sidebarCollapsed, location.pathname === "/settings")}
          >
            <Settings className="h-5 w-5 text-foreground/70" />
            {!sidebarCollapsed && "Settings"}
          </Link>
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
            className={cn(
              "flex items-center w-full rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600",
              sidebarCollapsed ? "justify-center px-2 py-2.5 lg:py-2" : "gap-3 px-2.5 py-2 lg:py-1.5"
            )}
          >
            <LogOut className="h-5 w-5 text-foreground/70" />
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-14 lg:h-12 px-3 sm:px-4 bg-white border-b border-border sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-8 w-8 lg:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <span className="text-base font-bold text-primary truncate shrink-0 hidden sm:block max-w-[180px]">{user?.tenant_name || ""}</span>
            <div ref={searchBoxRef} className="relative w-full max-w-lg hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full bg-surface border border-border rounded-lg py-1.5 lg:py-1 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-muted-foreground"
                placeholder="Search patients..."
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              {(searchLoading || searchError || searchResults.length > 0 || globalSearch.trim().length >= 2) && (
                <div className="absolute top-12 left-0 right-0 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-40">
                  {searchLoading && <div className="px-4 py-3 text-sm text-muted-foreground">Searching...</div>}
                  {!searchLoading && searchError && <div className="px-4 py-3 text-sm text-red-600">{searchError}</div>}
                  {!searchLoading && !searchError && searchResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No patients found</div>
                  )}
                  {!searchLoading && !searchError && searchResults.map((patient) => {
                    const fullName = `${patient.first_name} ${patient.last_name}`;
                    const visitType = patient.last_visit_type || "Consultation";
                    return (
                      <button
                        key={patient.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-accent/60 transition-colors border-b border-border last:border-b-0"
                        onClick={() => {
                          setGlobalSearch("");
                          setSearchResults([]);
                          navigate(`/patients/${patient.id}`);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=E8F0FE&color=0F4C81&size=64`}
                            alt={fullName}
                            className="w-9 h-9 rounded-full border border-border"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
                            <p className="text-xs text-muted-foreground">{daysAgo(patient.last_visit_at)} - {visitType}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-foreground leading-none">{user?.full_name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{user?.role}</p>
              </div>
              <div className="w-8 h-8 lg:w-7 lg:h-7 rounded-full bg-primary-container flex items-center justify-center text-primary font-bold text-xs">
                {getDisplayInitial(user?.full_name || "")}
              </div>
            </div>
          </div>
        </header>

        {toastNotification && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-[600px] px-4">
            <div className="bg-slate-800 text-white shadow-2xl rounded-xl flex items-center justify-between gap-4 border border-white/10 py-4 px-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-white font-bold text-sm shrink-0 ring-2 ring-white/20">
                  {toastNotification.title?.charAt(0) || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold tracking-tight truncate">{toastNotification.title}</p>
                  <p className="text-xs opacity-70 truncate">{toastNotification.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleViewPatient(toastNotification)}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  View Profile
                </button>
                <button
                  onClick={handleDismissToast}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors opacity-60 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 lg:p-6 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
