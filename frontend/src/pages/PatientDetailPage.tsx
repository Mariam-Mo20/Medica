import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Patient, MedicalRecord, Prescription } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Phone,
  FileText,
  Pill,
  Save,
  Plus,
  Trash2,
  Stethoscope,
  MoreHorizontal,
  PersonStanding,
  MapPin,
  Cake,
  Activity,
} from "lucide-react";

interface PrescriptionForm {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "prescriptions" | "consultation">("history");

  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [rxForms, setRxForms] = useState<PrescriptionForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Patient>(`/patients/${id}`).then(setPatient),
      api.get<MedicalRecord[]>(`/medical-records/patient/${id}`).then(setRecords),
    ]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (records.length > 0) {
      Promise.all(
        records.map((r) =>
          api.get<Prescription[]>(`/prescriptions/medical-record/${r.id}`).catch(() => [] as Prescription[]),
        ),
      ).then((results) => {
        setPrescriptions(results.flat());
      });
    }
  }, [records]);

  const addRx = () =>
    setRxForms([...rxForms, { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  const removeRx = (idx: number) => setRxForms(rxForms.filter((_, i) => i !== idx));
  const updateRx = (idx: number, field: keyof PrescriptionForm, value: string) => {
    const u = [...rxForms];
    u[idx] = { ...u[idx], [field]: value };
    setRxForms(u);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const rec = await api.post<MedicalRecord>("/medical-records/", {
        patient_id: parseInt(id!),
        diagnosis,
        symptoms,
        visit_notes: visitNotes,
      });
      if (rxForms.length > 0) {
        await api.post<Prescription[]>(`/prescriptions/medical-record/${rec.id}`, rxForms);
      }
      setDiagnosis("");
      setSymptoms("");
      setVisitNotes("");
      setRxForms([]);
      const updated = await api.get<MedicalRecord[]>(`/medical-records/patient/${id}`);
      setRecords(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !patient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  const lastRecord = records[records.length - 1];
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
    : null;

  return (
    <div className="space-y-8">
      <Button variant="ghost" onClick={() => navigate("/patients")} className="gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Button>

      <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm bg-white">
        <div className="px-8 pb-8 relative flex flex-col md:flex-row items-end gap-6 pt-8">
          <div className="w-28 h-28 rounded-2xl bg-white p-1 shadow-md">
            <div className="w-full h-full bg-primary-container rounded-xl flex items-center justify-center border-2 border-white">
              <span className="text-3xl font-bold text-primary">
                {(patient.first_name?.[0] || "")}{(patient.last_name?.[0] || "")}
              </span>
            </div>
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-foreground">{patient.first_name} {patient.last_name}</h2>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider">
                {patient.medical_record_number}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <PersonStanding className="h-4 w-4" />
                {age ?? "—"} Years Old {patient.gender ? (patient.gender === "male" ? "Male" : patient.gender === "female" ? "Female" : "") : ""}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-border" />
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {patient.address || "No address"}
              </span>
            </div>
          </div>
          <div className="flex gap-3 pb-2">
            <Button className="rounded-xl gap-2 shadow-sm" onClick={() => setActiveTab("consultation")}>
              <Plus className="h-4 w-4" />
              Add Visit
            </Button>
            <Button variant="outline" className="rounded-xl border-border p-2.5">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Last Visit</p>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-foreground">
                {lastRecord?.created_at ? new Date(lastRecord.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
              </span>
              <Calendar className="h-5 w-5 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Last Diagnosis</p>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-foreground">{lastRecord?.diagnosis || "—"}</span>
              <FileText className="h-5 w-5 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Age</p>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-foreground">{age ?? "—"} Years</span>
              <Cake className="h-5 w-5 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Phone</p>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-foreground">{patient.phone || "—"}</span>
              <Phone className="h-5 w-5 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-8 border-b border-border px-2">
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-3.5 border-b-2 transition-all text-sm font-medium ${
                activeTab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Medical History
            </button>
            <button
              onClick={() => setActiveTab("prescriptions")}
              className={`pb-3.5 border-b-2 transition-all text-sm font-medium ${
                activeTab === "prescriptions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Prescriptions
            </button>
            <button
              onClick={() => setActiveTab("consultation")}
              className={`pb-3.5 border-b-2 transition-all text-sm font-medium ${
                activeTab === "consultation" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              New Consultation
            </button>
          </div>

          {activeTab === "history" && (
            <div className="space-y-5 relative">
              <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border" />
              {records.length === 0 ? (
                <div className="pl-10 py-8 text-center text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No medical records yet
                </div>
              ) : (
                [...records].reverse().map((record, idx) => (
                  <div key={record.id} className="relative flex gap-6">
                    <div className="z-10 mt-2">
                      <div className="w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center">
                        <div className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-primary" : "bg-border"}`} />
                      </div>
                    </div>
                    <div className="flex-1 border border-border rounded-xl p-5 hover:border-primary/30 transition-colors bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-foreground">
                          {record.doctor_name || "Doctor"} · {record.created_at ? new Date(record.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </h4>
                      </div>
                      {record.diagnosis && (
                        <p className="text-sm text-foreground mb-1"><span className="font-medium">Diagnosis:</span> {record.diagnosis}</p>
                      )}
                      {record.symptoms && (
                        <p className="text-sm text-muted-foreground mb-1"><span className="font-medium">Symptoms:</span> {record.symptoms}</p>
                      )}
                      {record.visit_notes && (
                        <p className="text-sm text-muted-foreground"><span className="font-medium">Notes:</span> {record.visit_notes}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "prescriptions" && (
            <div className="space-y-3">
              {prescriptions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No prescriptions yet
                </div>
              ) : (
                prescriptions.map((rx) => (
                  <div key={rx.id} className="border border-border rounded-xl p-5 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">{rx.medication_name}</span>
                      <span className="text-xs text-muted-foreground">{rx.doctor_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p>{rx.dosage} · {rx.frequency}{rx.duration ? ` · ${rx.duration}` : ""}</p>
                      {rx.instructions && <p className="italic">{rx.instructions}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "consultation" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="p-3 text-sm bg-red-50 text-destructive rounded-lg border border-red-200">{error}</div>}

              <Card className="border-border shadow-sm rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    Medical Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Symptoms</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Describe patient symptoms..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Diagnosis</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Enter diagnosis..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Visit Notes</Label>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                      placeholder="Additional visit notes..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm rounded-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Pill className="h-4 w-4 text-primary" />
                      Prescriptions
                    </CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addRx} className="rounded-lg border-border">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Medication
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {rxForms.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No prescriptions added yet</p>
                  )}
                  {rxForms.map((pf, idx) => (
                    <div key={idx} className="border border-border rounded-xl p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Medication #{idx + 1}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRx(idx)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Medication Name</Label>
                          <Input
                            value={pf.medication_name}
                            onChange={(e) => updateRx(idx, "medication_name", e.target.value)}
                            placeholder="e.g. Amoxicillin"
                            required
                            className="h-9 text-sm border-border rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Dosage</Label>
                          <Input
                            value={pf.dosage}
                            onChange={(e) => updateRx(idx, "dosage", e.target.value)}
                            placeholder="e.g. 500mg"
                            required
                            className="h-9 text-sm border-border rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Frequency</Label>
                          <Input
                            value={pf.frequency}
                            onChange={(e) => updateRx(idx, "frequency", e.target.value)}
                            placeholder="e.g. 3 times daily"
                            required
                            className="h-9 text-sm border-border rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Duration</Label>
                          <Input
                            value={pf.duration}
                            onChange={(e) => updateRx(idx, "duration", e.target.value)}
                            placeholder="e.g. 7 days"
                            className="h-9 text-sm border-border rounded-lg"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label className="text-xs text-muted-foreground">Instructions</Label>
                          <Input
                            value={pf.instructions}
                            onChange={(e) => updateRx(idx, "instructions", e.target.value)}
                            placeholder="e.g. Take with food"
                            className="h-9 text-sm border-border rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => navigate("/patients")} className="rounded-lg border-border">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="rounded-lg shadow-sm">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save & Complete"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border shadow-sm rounded-xl">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Patient Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  DOB: {new Date(patient.date_of_birth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                {patient.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    {patient.phone}
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-4 w-4 shrink-0" />
                    {patient.email}
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {patient.address}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm rounded-xl">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Current Medications</h3>
              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active medications</p>
              ) : (
                <div className="space-y-4">
                  {prescriptions.slice(0, 3).map((rx, idx) => {
                    const barColors = ["bg-primary", "bg-secondary", "bg-amber-500"];
                    return (
                      <div key={rx.id} className="flex gap-3">
                        <div className={`w-1.5 h-10 rounded-full ${barColors[idx % 3]}`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {rx.medication_name} <span className="font-normal text-muted-foreground">{rx.dosage}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{rx.frequency}</p>
                        </div>
                      </div>
                    );
                  })}
                  {prescriptions.length > 3 && (
                    <p className="text-xs text-primary font-medium cursor-pointer">+{prescriptions.length - 3} more</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm rounded-xl">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  className="w-full rounded-lg justify-start gap-2"
                  size="sm"
                  onClick={() => setActiveTab("consultation")}
                >
                  <Plus className="h-4 w-4" />
                  Add Visit
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-lg justify-start gap-2 border-border"
                  size="sm"
                  onClick={() => navigate(`/appointments/new?patientId=${id}`)}
                >
                  <Stethoscope className="h-4 w-4" />
                  Schedule Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
