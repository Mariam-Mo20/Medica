import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Appointment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Download,
  Search,
  CalendarCheck,
  Clock,
  XCircle,
  Activity,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
} from "lucide-react";

const AVATAR_COLORS = [
  "bg-primary-container text-primary",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-blue-50 text-blue-700",
  "bg-purple-50 text-purple-700",
  "bg-rose-50 text-rose-700",
];

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

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "scheduled", label: "Pending" },
  { value: "checked_in", label: "Checked In" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const PAGE_SIZE = 10;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [shareSuccess, setShareSuccess] = useState("");
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    if (shareSuccess || shareError) {
      const t = setTimeout(() => {
        setShareSuccess("");
        setShareError("");
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [shareSuccess, shareError]);

  const fetchAppointments = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    api
      .get<Appointment[]>(`/appointments/?${params.toString()}`)
      .then(setAppointments)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  const filtered = useMemo(
    () =>
      searchQuery
        ? appointments.filter((a) =>
            (a.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : appointments,
    [appointments, searchQuery],
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalBooked = appointments.length;
  const pendingConfirmation = appointments.filter((a) => a.status === "scheduled").length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const clinicCapacity =
    appointments.length > 0
      ? Math.round((completedCount / appointments.length) * 100)
      : 0;

  const handleStatusChange = async (aptId: number, newStatus: string) => {
    try {
      await api.put(`/appointments/${aptId}`, { status: newStatus });
      fetchAppointments();
    } catch {
      /* ignore */
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((a) => a.id)));
    }
  };

  const handleRemoveFilter = (filter: string) => {
    if (filter === "status") setStatusFilter("");
  };

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const activeFilters: { key: string; label: string }[] = [];
  if (statusFilter) {
    const opt = statusOptions.find((o) => o.value === statusFilter);
    if (opt) activeFilters.push({ key: "status", label: opt.label });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointment Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and monitor all clinical visits for the current cycle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-lg h-10 border-border">
            <Download className="h-4 w-4" />
            Export List
          </Button>
          <Button onClick={() => navigate("/appointments/new")} className="gap-2 rounded-lg h-10 shadow-sm">
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        </div>
      </div>

      {(shareSuccess || shareError) && (
        <div
          className={`p-3 text-sm rounded-lg border ${
            shareSuccess
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-destructive border-red-100"
          }`}
        >
          {shareSuccess || shareError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-primary-container rounded-lg text-primary">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                +12%
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Booked</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalBooked}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-primary-container rounded-lg text-primary">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Confirmation</p>
            <p className="text-2xl font-bold text-foreground mt-1">{pendingConfirmation}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <XCircle className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                -5%
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cancellations</p>
            <p className="text-2xl font-bold text-foreground mt-1">{cancelledCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm relative overflow-hidden border-0 bg-primary text-on-primary">
          <CardContent className="p-5 relative z-10">
            <p className="text-xs font-medium text-white/80 uppercase tracking-wider mb-2">
              Clinic Capacity
            </p>
            <p className="text-2xl font-bold">{clinicCapacity}%</p>
            <div className="w-full bg-white/30 h-1.5 rounded-full mt-3">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${clinicCapacity}%` }}
              />
            </div>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Activity className="h-24 w-24" />
          </div>
        </Card>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search appointments or patients..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10 h-10 bg-surface border-border rounded-lg"
              />
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="flex gap-2">
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className="px-2.5 py-1 bg-primary-container text-primary text-xs font-medium rounded-full flex items-center gap-1"
                >
                  {f.label}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveFilter(f.key)}
                  />
                </span>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 bg-white border border-border rounded-lg text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
            >
              <option value="">All Statuses</option>
              {statusOptions
                .filter((o) => o.value)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Batch Actions:</span>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedIds.size === 0}
              className="rounded-lg border-border"
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedIds.size === 0}
              className="rounded-lg border-border"
            >
              Message
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No appointments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="p-4 border-b border-border w-12">
                    <input
                      type="checkbox"
                      checked={paginated.length > 0 && selectedIds.size === paginated.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Patient Name
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Visit Type
                  </th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginated.map((apt) => {
                  const { date, time } = formatDate(apt.scheduled_at);
                  const name = apt.patient_name || `Patient #${apt.patient_id}`;
                  const initials = getInitials(apt.patient_name || "");
                  const avatarColor = getAvatarColor(apt.patient_name || apt.patient_id.toString());

                  return (
                    <tr
                      key={apt.id}
                      className="hover:bg-accent/50 transition-colors border-b border-border"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(apt.id)}
                          onChange={() => toggleSelect(apt.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor}`}
                          >
                            {initials || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">ID: #{apt.patient_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{date}</p>
                          <p className="text-xs text-muted-foreground">{time}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">
                            {apt.doctor_name || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {apt.reason || "General"}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={apt.status}
                          onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[apt.status] || "bg-gray-100 text-gray-500"}`}
                        >
                          {Object.entries(statusLabels).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-1.5 hover:bg-accent rounded-lg transition-colors">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="p-5 flex items-center justify-between bg-surface border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(page * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of <span className="font-medium text-foreground">{filtered.length}</span> appointments
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-muted-foreground text-sm">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      page === p
                        ? "bg-primary text-on-primary"
                        : "border border-border hover:bg-accent"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
