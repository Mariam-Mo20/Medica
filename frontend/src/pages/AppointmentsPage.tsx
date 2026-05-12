import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Appointment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Plus, Calendar } from "lucide-react";

const statusColor: Record<string, "success" | "warning" | "info" | "destructive" | "default"> = {
  scheduled: "info",
  checked_in: "warning",
  in_progress: "warning",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
};

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "checked_in", label: "Checked In" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAppointments = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    api.get<Appointment[]>(`/appointments/?${params.toString()}`)
      .then(setAppointments)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-h1 text-h1 text-foreground">Appointments</h1>
          <p className="text-body-lg text-outline mt-1">Schedule and manage appointments</p>
        </div>
        <Button asChild>
          <Link to="/appointments/new">
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Link>
        </Button>
      </div>

      <div className="flex gap-4">
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        />
      </div>

      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">All Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-md" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No appointments found</p>
            </div>
          ) : (
            <div className="divide-y">
              {appointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{apt.patient_name || `Patient #${apt.patient_id}`}</p>
                    <p className="text-sm text-muted-foreground">
                      {apt.doctor_name || (apt.doctor_id ? `Doctor #${apt.doctor_id}` : "—")} · {" "}
                      {new Date(apt.scheduled_at).toLocaleDateString("en-GB")} {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusColor[apt.status] || "default"}>
                      {apt.status.replace("_", " ")}
                    </Badge>
                    {apt.recurring_rule && (
                      <Badge variant="secondary">Recurring</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
