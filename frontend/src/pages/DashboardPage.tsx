import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DashboardStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarCheck, TrendingUp, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const statusBadgeColor: Record<string, "success" | "warning" | "info" | "destructive" | "default"> = {
  scheduled: "info",
  checked_in: "warning",
  in_progress: "warning",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
};

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<DashboardStats>("/dashboard/").then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const chartData = stats.appointments_by_status.map((s) => ({
    name: s.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count: s.count,
  }));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-h1 text-h1 text-foreground">Dashboard</h1>
          <p className="text-body-lg text-outline mt-1">Today's clinic overview</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-label-sm text-outline uppercase tracking-wider">Total Patients</p>
              <h3 className="font-h1 text-h1 mt-1">{stats.total_patients}</h3>
              <p className="text-body-sm text-outline mt-1">+{stats.new_patients_today} new today</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-label-sm text-outline uppercase tracking-wider">Today's Appointments</p>
              <h3 className="font-h1 text-h1 mt-1">{stats.today_appointments}</h3>
              <p className="text-body-sm text-outline mt-1">
                {stats.completed_appointments} completed, {stats.pending_appointments} pending
              </p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg">
              <CalendarCheck className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Recent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-h3 text-h3">Appointments by Status</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-outline">
              <Clock className="h-8 w-8 mb-2" />
              <p className="text-body-md">No appointments today</p>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-h3 text-h3">Recent Appointments</h3>
          </div>
          <div className="space-y-2">
            {stats.recent_appointments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-outline">
                <CalendarCheck className="h-8 w-8 mb-2" />
                <p className="text-body-md">No recent appointments</p>
              </div>
            )}
            {stats.recent_appointments.map((apt: any, idx: number) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Appointment #{apt.id}</p>
                    <p className="text-body-sm text-outline">
                      {new Date(apt.scheduled_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Badge variant={statusBadgeColor[apt.status] || "default"}>
                  {apt.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
