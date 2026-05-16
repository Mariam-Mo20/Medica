import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { isSameDayInTimezone } from "@/lib/date";
import { Patient } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Users,
  Activity,
  Filter,
  ArrowUpDown,
  Phone,
} from "lucide-react";

const PAGE_SIZE = 10;

function getInitials(first: string, last: string) {
  const f = first?.[0] || "";
  const l = last?.[0] || "";
  return (f + l).toUpperCase().slice(0, 2) || "?";
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-primary-container text-primary",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [newTodayCount, setNewTodayCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    const run = async () => {
      try {
        if (searchTerm.length < 2) {
          const dashboard = await api.get<{ new_patients_today: number }>("/dashboard/");
          setNewTodayCount(dashboard.new_patients_today || 0);
        }
        if (searchTerm.length >= 2) {
          const results = await api.get<Patient[]>(`/patients/search?q=${encodeURIComponent(searchTerm)}`);
          setPatients(results);
        } else {
          const results = await api.get<Patient[]>("/patients/?limit=100");
          setPatients(results);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load patients");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [searchTerm]);

  const newToday = searchTerm.length >= 2
    ? patients.filter((p) => isSameDayInTimezone(p.created_at)).length
    : newTodayCount;

  const displayed = patients;
  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const paginated = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and monitor patient health records and clinical status.</p>
        </div>
        <Button onClick={() => navigate("/patients/new")} className="rounded-xl shadow-sm gap-2 h-11 px-5">
          <UserPlus className="h-4 w-4" />
          Add New Patient
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-border/70 shadow-sm rounded-2xl relative overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Patients</p>
            <p className="text-2xl font-bold text-foreground mt-1">{patients.length}</p>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="h-28 w-28" />
          </div>
        </Card>

        <Card className="border-border/70 shadow-sm rounded-2xl relative overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Admissions Today</p>
            <p className="text-2xl font-bold text-foreground mt-1">{newToday}</p>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity className="h-28 w-28" />
          </div>
        </Card>


      </div>

      <div className="bg-white/70 backdrop-blur-xl border border-border/50 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or clinical condition..."
            className="pl-11 h-12 bg-white border-border/60 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-xl border-border/60 h-12 px-4 bg-white">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl border-border/60 h-12 px-4 bg-white">
            <ArrowUpDown className="h-4 w-4" />
            Sort by: Recent
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border/70 shadow-sm overflow-hidden">
        {error && <div className="m-4 p-3 text-sm rounded-lg border border-red-200 bg-red-50 text-red-600">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    <div className="animate-pulse space-y-3 max-w-md mx-auto">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-16 text-center">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No patients found</p>
                  </td>
                </tr>
              ) : (
                paginated.map((patient) => {
                  const fullName = `${patient.first_name} ${patient.last_name}`;
                  const initials = getInitials(patient.first_name, patient.last_name);
                  const avatarColor = getAvatarColor(fullName);
                  const age = patient.date_of_birth
                    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
                    : null;

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-primary/5 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor}`}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {age ?? "-"} yrs
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title={patient.phone ? `Call ${patient.phone}` : "No phone number"}
                            disabled={!patient.phone}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (patient.phone) window.location.href = `tel:${patient.phone}`;
                            }}
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="View patient"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && displayed.length > 0 && (
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-surface/50">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">1-{paginated.length}</span> of{" "}
              <span className="font-medium text-foreground">{displayed.length}</span> patients
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="w-9 h-9 flex items-center justify-center border border-border/60 rounded-lg text-muted-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {(() => {
                const pages: (number | string)[] = [];
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
                return pages.map((p, i) =>
                  typeof p === "string" ? (
                    <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === p
                          ? "bg-primary text-on-primary shadow-sm"
                          : "hover:bg-accent text-foreground border border-border/60"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                );
              })()}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="w-9 h-9 flex items-center justify-center border border-border/60 rounded-lg text-muted-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
