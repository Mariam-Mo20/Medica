import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { DashboardStats } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsSkeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  Plus,
  MoreVertical,
  Activity,
  CalendarCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-amber-50 text-amber-700",
  checked_in: "bg-blue-50 text-blue-700",
  in_progress: "bg-purple-50 text-purple-700",
  cancelled: "bg-gray-100 text-gray-500",
  no_show: "bg-red-50 text-red-700",
};

const statusLabels: Record<string, string> = {
  scheduled: "Pending",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Confirmed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<DashboardStats>("/dashboard/").then((dashboardStats) => {
      setStats(dashboardStats);
      setRecentAppointments(dashboardStats.recent_appointments || []);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    });
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (!stats) {
    return <StatsSkeleton />;
  }

  const chartData = (stats.appointments_by_status || []).map((row) => ({
    name: row.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count: row.count,
  }));

  const completionRate = stats.today_appointments
    ? Math.round((stats.completed_appointments / stats.today_appointments) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}, {user?.full_name?.split(" ")[0] || "there"}!</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your clinic overview for today</p>
        </div>
        <Button onClick={() => navigate("/appointments/new")} className="gap-2 rounded-lg h-10 shadow-sm">
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

      {error && <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today Total Patients</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.patients_today}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-primary-container text-primary rounded-lg">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Patients Today</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.new_patients_today}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-primary-container text-primary rounded-lg">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">{stats.completed_appointments} completed</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today's Appointments</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {stats.completed_appointments} / {stats.today_appointments}
            </p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 bg-primary-container text-primary rounded-lg">
                <Users className="h-5 w-5" />
              </div>
              <button
                onClick={() => navigate("/appointments?status=scheduled")}
                className="text-xs font-semibold text-primary bg-primary-container px-2 py-1 rounded-full hover:opacity-90"
              >
                View List
              </button>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed Visits</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.completed_appointments}</p>

          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card className="border-border shadow-sm rounded-xl">
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Clinical Analytics</h3>
                  <p className="text-sm text-muted-foreground">Appointment distribution by status</p>
                </div>
                <div />
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        fontSize: "13px",
                      }}
                    />
                    <Bar dataKey="count" fill="#0f4c81" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2" />
                  <p className="text-sm">No appointment data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="border-border shadow-sm rounded-xl">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h3 className="text-base font-semibold text-foreground">Recent Appointments</h3>
              <Button
                variant="ghost"
                className="text-xs font-medium text-primary rounded-lg"
                onClick={() => navigate("/appointments")}
              >
                View All
              </Button>
            </div>
            <div className="divide-y divide-border">
               {recentAppointments.length === 0 ? (
                 <div className="px-5 py-12 text-center text-muted-foreground">
                   <Calendar className="h-8 w-8 mx-auto mb-2" />
                   <p className="text-sm">No recent appointments</p>
                 </div>
               ) : (
                recentAppointments.slice(0, 5).map((apt) => {
                  const patientId = Number(apt.patient_id || 0);
                  const name = `Patient #${patientId || "-"}`;
                  const scheduledAt = String(apt.scheduled_at || "");
                  const status = String(apt.status || "scheduled");
                  const time = scheduledAt
                    ? new Date(scheduledAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  return (
                    <div key={String(apt.id)} className="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E8F0FE&color=0F4C81&size=64`}
                          alt={name}
                          className="w-8 h-8 rounded-full border border-border shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{name}</p>
                          <p className="text-xs text-muted-foreground">{time} · General</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                           className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-500"}`}
                         >
                           {statusLabels[status] || status}
                         </span>
                        <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
