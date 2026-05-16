import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDisplayDate, formatDisplayTime } from "@/lib/date";
import { Appointment } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Phone,
  Share2,
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
  return {
    date: formatDisplayDate(dateStr),
    time: formatDisplayTime(dateStr),
  };
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr).getTime();
  const diff = Math.max(0, Date.now() - d);
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function visitType(reason?: string) {
  const r = (reason || "").toLowerCase();
  if (r.includes("follow")) return "Follow Up";
  return "Consultation";
}

export function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [shareSuccess, setShareSuccess] = useState("");
  const [shareError, setShareError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [shareModal, setShareModal] = useState<{ aptId: number; patientName: string } | null>(null);

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
    setLoadError("");
    api
      .get<Appointment[]>(`/appointments/?limit=60`)
      .then(setAppointments)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load appointments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

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
      if (statusFilter) {
        list = list.filter((a) => a.status === statusFilter);
      }
      return list;
    },
    [appointments, searchQuery, showTodayOnly, statusFilter],
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const todayBooked = appointments.filter((a) => isToday(a.scheduled_at)).length;
  const checkedInCount = appointments.filter((a) => isToday(a.scheduled_at) && a.status === "checked_in").length;
  const inProgressCount = appointments.filter((a) => isToday(a.scheduled_at) && a.status === "in_progress").length;
  const completedCount = appointments.filter((a) => {
    if (a.status !== "completed") return false;
    return isToday(a.scheduled_at);
  }).length;

  const quickSearchPatients = useMemo(() => {
    if (!searchQuery.trim()) return [] as Array<{ id: number; name: string; avatar: string; lastVisit: string; type: string }>;
    const q = searchQuery.toLowerCase();
    const byPatient = new Map<number, Appointment[]>();
    for (const a of appointments) {
      if (!byPatient.has(a.patient_id)) byPatient.set(a.patient_id, []);
      byPatient.get(a.patient_id)!.push(a);
    }
    const out: Array<{ id: number; name: string; avatar: string; lastVisit: string; type: string }> = [];
    byPatient.forEach((list, pid) => {
      const sorted = [...list].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
      const latest = sorted[0];
      const name = latest.patient_name || `Patient #${pid}`;
      if (!name.toLowerCase().includes(q)) return;
      out.push({
        id: pid,
        name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E8F0FE&color=0F4C81&size=64`,
        lastVisit: timeAgo(latest.scheduled_at),
        type: visitType(latest.reason),
      });
    });
    return out.slice(0, 8);
  }, [appointments, searchQuery]);

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

  const handleShare = async (aptId: number, patientName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareModal({ aptId, patientName });
  };

  const confirmShare = async () => {
    if (!shareModal) return;
    try {
      const res = await api.post<{ message: string; notified_doctors: number }>(`/notifications/share-appointment/${shareModal.aptId}`);
      setShareSuccess(res.message);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to share patient");
    } finally {
      setShareModal(null);
    }
  };

  const handleDismissAlert = () => {
    setShareSuccess("");
    setShareError("");
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

      {loadError && (
        <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-100">{loadError}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <CalendarCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Checked In</p>
            <p className="text-2xl font-bold text-foreground mt-1">{checkedInCount}</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <CalendarCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold text-foreground mt-1">{inProgressCount}</p>
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
              {quickSearchPatients.length > 0 && (
                <div className="absolute mt-2 left-0 right-0 bg-white border border-border rounded-lg shadow-lg z-20 max-h-72 overflow-y-auto">
                  {quickSearchPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(p.name);
                        setPage(1);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-accent/60 transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full border border-border object-cover" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Last visit {p.lastVisit} · {p.type}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appointment Time</th>
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
                            title="Share patient with all doctors"
                            onClick={(e) => handleShare(apt.id, name, e)}
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

      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xl p-6" onClick={() => setShareModal(null)}>
          <div className="bg-card w-full max-w-[480px] rounded-xl shadow-2xl border border-border/50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 pt-8 pb-6 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-h2 text-h2 text-foreground">Share with Doctors</h2>
                  <p className="text-body-sm text-body-sm text-muted-foreground">Digital Record Transmission</p>
                </div>
              </div>
              <button onClick={() => setShareModal(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-8 pb-8 space-y-8">
              <div className="bg-muted rounded-lg p-4 border border-border/30">
                <p className="text-body-md text-body-md text-foreground leading-relaxed">
                  Are you sure you want to share <span className="font-bold">{shareModal.patientName}'s</span> profile with all doctors in the clinic?
                </p>
              </div>
            </div>
            <div className="px-8 py-6 bg-muted/50 border-t border-border/50 flex gap-4 justify-end">
              <button onClick={() => setShareModal(null)} className="px-6 h-[48px] rounded-lg font-label-md text-label-md text-muted-foreground hover:bg-accent transition-all active:scale-95">
                Cancel
              </button>
              <button onClick={confirmShare} className="px-8 h-[48px] bg-primary text-primary-foreground rounded-lg font-label-md text-label-md hover:bg-primary/90 shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
                Confirm & Share
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
