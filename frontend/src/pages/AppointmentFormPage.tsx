import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Patient, Appointment, PatientSearchResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { daysAgo, parseDateToISO } from "@/lib/date";
import { splitFullName } from "@/lib/name";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Save, Search, UserPlus, ArrowLeft, Loader2 } from "lucide-react";

const reasonOptions = [
  { value: "Consultation", label: "Consultation" },
  { value: "Follow-up", label: "Follow-up" },
];

const durationOptions = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
];

export function AppointmentFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    full_name: "", date_of_birth: "", phone: "", email: "",
  });
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const [form, setForm] = useState({
    scheduled_at: `${dd}/${mm}/${yyyy}`,
    scheduled_time: "09:00",
    duration_minutes: "30",
    reason: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const patientId = searchParams.get("patientId");
    if (!patientId) return;

    api
      .get<Patient>(`/patients/${patientId}`)
      .then((p) => {
        setSelectedPatient(p);
        setShowNewPatient(false);
        setPatientSearch("");
        setPatients([]);
      })
      .catch(() => {});
  }, [searchParams]);

  const handlePatientSearch = async (q: string) => {
    setPatientSearch(q);
    setError("");
    if (q.length >= 2) {
      try {
        const results = await api.get<PatientSearchResult[]>(`/patients/search?q=${encodeURIComponent(q)}`);
        setPatients(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search patients");
      }
    } else {
      setPatients([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      let patientId: number;

      if (selectedPatient) {
        patientId = selectedPatient.id;
      } else if (showNewPatient) {
        if (!newPatient.full_name.trim()) {
          throw new Error("Patient full name is required");
        }
        if (!newPatient.date_of_birth) {
          throw new Error("Patient date of birth is required");
        }
        const dob = parseDateToISO(newPatient.date_of_birth);
        if (!dob) {
          throw new Error("Invalid date of birth format. Use dd/mm/yyyy");
        }
        const { firstName, lastName } = splitFullName(newPatient.full_name);
        if (!firstName || !lastName || lastName === "-") {
          throw new Error("Please enter full name (first and last)");
        }
        const patientPayload: Record<string, unknown> = {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob,
        };
        if (newPatient.phone) patientPayload.phone = newPatient.phone;
        if (newPatient.email) patientPayload.email = newPatient.email;
        const created = await api.post<Patient>("/patients/", patientPayload);
        patientId = created.id;
      } else {
        throw new Error("Please select a patient or register a new one");
      }

      if (!form.scheduled_at) throw new Error("Date is required");
      if (!form.reason) throw new Error("Reason of visit is required");
      const isoDate = parseDateToISO(form.scheduled_at);
      if (!isoDate) throw new Error("Invalid date format. Use dd/mm/yyyy");

      const scheduledAt = new Date(`${isoDate}T${form.scheduled_time || "09:00"}`);
      if (isNaN(scheduledAt.getTime())) throw new Error("Invalid date or time");

      const payload: Record<string, unknown> = {
        patient_id: patientId,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(form.duration_minutes) || 30,
        reason: form.reason,
      };

      await api.post<Appointment>("/appointments/", payload);
      navigate("/appointments");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to schedule appointment";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/appointments")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Schedule Appointment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 text-sm bg-red-50 text-destructive rounded-md border border-red-200">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Patient</Label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                  <span className="text-sm">
                    {selectedPatient.first_name} {selectedPatient.last_name} · {selectedPatient.medical_record_number}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setShowNewPatient(false); }}>
                    Change
                  </Button>
                </div>
              ) : showNewPatient ? (
                <div className="border rounded-md p-3 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">New Patient</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewPatient(false)}>
                      Cancel
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Full Name *</Label>
                      <Input className="h-8 text-sm bg-white" value={newPatient.full_name} onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date of Birth *</Label>
                      <DateInput className="h-8 text-sm bg-white" value={newPatient.date_of_birth} onChange={(v) => setNewPatient({ ...newPatient, date_of_birth: v })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input className="h-8 text-sm bg-white" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input className="h-8 text-sm bg-white" type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="Search existing patient by name or MRN..."
                      value={patientSearch}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                    />
                  </div>
                  {patients.length > 0 && (
                    <div className="border border-border rounded-lg divide-y max-h-52 overflow-y-auto bg-white shadow-sm">
                      {patients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent/60 transition-colors"
                          onClick={() => {
                            setSelectedPatient({
                              id: p.id,
                              tenant_id: 0,
                              medical_record_number: p.medical_record_number,
                              first_name: p.first_name,
                              last_name: p.last_name,
                              date_of_birth: p.date_of_birth,
                              is_active: true,
                              created_at: "",
                              updated_at: "",
                            });
                            setPatients([]);
                            setPatientSearch("");
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(`${p.first_name} ${p.last_name}`)}&background=E8F0FE&color=0F4C81&size=64`}
                              alt={`${p.first_name} ${p.last_name}`}
                              className="w-8 h-8 rounded-full border border-border"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.first_name} {p.last_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {daysAgo(p.last_visit_at)} · {p.last_visit_type || "Consultation"}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => { setShowNewPatient(true); setPatients([]); setPatientSearch(""); }}>
                    <UserPlus className="h-3 w-3 mr-2" />
                    Register New Patient
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <DateInput value={form.scheduled_at} onChange={(v) => setForm({ ...form, scheduled_at: v })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input id="time" type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                id="duration"
                options={durationOptions}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason of Visit *</Label>
              <Select
                id="reason"
                options={reasonOptions}
                placeholder="Select reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={() => navigate("/appointments")}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scheduling...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Schedule Appointment</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
