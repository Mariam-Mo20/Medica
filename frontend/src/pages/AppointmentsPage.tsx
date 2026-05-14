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
  ChevronLeft,
  ChevronRight,
  Phone,
  Share2,
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
  scheduled: "bg-amber-50 text-amber-700",
  checked_in: "bg-blue-50 text-blue-700",
  in_progress: "bg-purple-50 text-purple-700",
  completed: "bg-emerald-50 text-emerald-700",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
};

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "checked_in", label: "Checked In" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
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

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
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
  const [showTodayOnly, setShowTodayOnly] = useState(true);

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
    params.set("limit", "100");
    api
      .get<Appointment[]>(`/appointments/?${params.toString()}`)
      .then(setAppointments)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  const filtered = useMemo(
    () => {
      let list = appointments;
      if (searchQuery) {
        list = list.filter((a) =>
          (a.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }
      if (showTodayOnly) {
        list = list.filter((a) => isToday(a.scheduled_at));
      }
      return list;
    },
    [appointments, searchQuery, showTodayOnly],
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const todayBooked = appointments.filter((a) => isToday(a.scheduled_at)).length;
  const completedCount = appointments.filter((a) => {
    if (a.status !== "completed") return false;
    return isToday(a.scheduled_at);
  }).length;

  const handleStatusChange = async (aptId: number, newStatus: string) => {
    try {
      await api.put(`/appointments/${aptId}`, { status: newStatus });
      setAppointments((prev) =>
        prev.map((a) => (a.id === aptId ? { ...a, status: newStatus } : a)),
      );
      setShareSuccess(`Appointment #${aptId} updated to "${statusLabels[newStatus] || newStatus}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update status";
      setShareError(msg);
    }
  };

  const handleShare = async (aptId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.post<{ id: number }>(`/notifications/share-appointment/${aptId}`);
      setShareSuccess(`Patient shared with doctor successfully`);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to share patient");
    }
  };

  const handleDismissAlert = () => {
    setShareSuccess("");
    setShareError("");
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-primary-container rounded-lg text-primary">
                <CalendarCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Booked Today</p>
            <p className="text-2xl font-bold text-foreground mt-1">{todayBooked}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CalendarCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-foreground mt-1">{completedCount}</p>
          </CardContent>
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
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => { setShowTodayOnly(true); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${showTodayOnly ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Today
              </button>
              <button
                onClick={() => { setShowTodayOnly(false); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!showTodayOnly ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
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
                .map((o) => {
                  const colorMap: Record<string, string> = {
                    scheduled: "#f59e0b",
                    checked_in: "#3b82f6",
                    in_progress: "#8b5cf6",
                    completed: "#10b981",
                  };
                  return (
                    <option key={o.value} value={o.value} style={{ color: colorMap[o.value] || "#6b7280", fontWeight: 600 }}>
                      {o.label}
                    </option>
                  );
                })}
            </select>
            <div className="h-5 w-px bg-border" />
            <span className="text-xs text-muted-foreground">Batch Actions:</span>
            <Button variant="outline" size="sm" disabled className="rounded-lg border-border">Reschedule</Button>
            <Button variant="outline" size="sm" disabled className="rounded-lg border-border">Message</Button>
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
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">#</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appointment Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {paginated.map((apt, idx) => {
                  const { date, time } = formatDate(apt.scheduled_at);
                  const name = apt.patient_name || `Patient #${apt.patient_id}`;
                  const initials = getInitials(apt.patient_name || "");
                  const avatarColor = getAvatarColor(apt.patient_name || apt.patient_id.toString());

                   return (
                    <tr
                      key={apt.id}
                      className="hover:bg-primary/5 transition-colors border-b border-border group"
                    >
                      <td className="px-6 py-4 text-sm text-muted-foreground font-medium">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarColor}`}
                          >
                            {initials || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">ID: #{apt.patient_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{time}</p>
                          <p className="text-xs text-muted-foreground">
                            {isToday(apt.scheduled_at) ? "Today" : date}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                          <select
                            value={apt.status}
                            onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[apt.status] || "bg-gray-100 text-gray-500"}`}
                          >
                            {Object.entries(statusLabels).map(([val, label]) => {
                              const colorMap: Record<string, string> = {
                                scheduled: "#f59e0b",
                                checked_in: "#3b82f6",
                                in_progress: "#8b5cf6",
                                completed: "#10b981",
                              };
                              return (
                                <option key={val} value={val} style={{ color: colorMap[val] || "#6b7280", fontWeight: 600 }}>
                                  {label}
                                </option>
                              );
                            })}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="Share patient with doctor"
                            onClick={(e) => handleShare(apt.id, e)}
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="Call patient"
                            disabled
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
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
