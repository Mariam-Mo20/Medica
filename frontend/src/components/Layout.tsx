import { useEffect, useState, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Notification, NotificationList } from "@/types";
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
  Bell,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["doctor", "assistant"] },
  { to: "/patients", label: "Patients", icon: Users, roles: ["doctor", "assistant"] },
  { to: "/appointments", label: "Appointments", icon: CalendarCheck, roles: ["doctor", "assistant"] },
  { to: "/administration", label: "Administration", icon: Settings, roles: ["doctor"] },
];

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = () => {
    api.get<NotificationList>("/notifications/").then((data) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showNotifications) return;
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotifications]);

  const handleMarkRead = async (notification: Notification) => {
    try {
      await api.patch(`/notifications/${notification.id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
    if (notification.resource_type === "patient" && notification.resource_id) {
      navigate(`/patients/${notification.resource_id}`);
      setShowNotifications(false);
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col transform transition-transform lg:relative lg:translate-x-0 lg:shadow-sm",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 pt-5 pb-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary leading-none">Medica</h2>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                {user?.tenant_name || "Staff Portal"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm",
                  isActive
                    ? "bg-primary-container text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className={cn("h-4.5 w-4.5", isActive ? "text-primary" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pt-4 pb-4 border-t border-border space-y-0.5">
          <Link
            to="/administration"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm",
              location.pathname === "/administration"
                ? "bg-primary-container text-primary font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-4.5 w-4.5" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-border sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9 lg:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="relative w-full max-w-lg hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full bg-surface border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-muted-foreground"
                placeholder="Search patients, charts, or records..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleMarkRead(n)}
                        className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border last:border-0 ${!n.is_read ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${n.is_read ? "bg-transparent" : "bg-primary"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                              {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          {n.resource_type && (
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-foreground leading-none">{user?.full_name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{user?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-primary font-bold text-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
