import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["doctor", "assistant"] },
  { to: "/patients", label: "Patients", icon: Users, roles: ["doctor", "assistant"] },
  { to: "/appointments", label: "Appointments", icon: CalendarCheck, roles: ["doctor", "assistant"] },
  { to: "/administration", label: "Settings", icon: Settings, roles: ["doctor"] },
];

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role || ""));

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] bg-gray-50 border-r border-gray-200 flex flex-col transform transition-transform lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-primary leading-none">Medica</h2>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5">
                {user?.tenant_name || "Staff Portal"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm",
                  isActive
                    ? "bg-primary-fixed text-primary font-semibold"
                    : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto px-3 pt-4 pb-4 border-t border-gray-200 space-y-0.5">
          <Link
            to="/administration"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm",
              location.pathname === "/administration"
                ? "bg-primary-fixed text-primary font-semibold"
                : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-100"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9 lg:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            {/* breadcrumbs could go here */}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-none">{user?.full_name}</p>
              <p className="text-[11px] text-gray-500 mt-1 capitalize">{user?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm border-2 border-primary-fixed">
              {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
