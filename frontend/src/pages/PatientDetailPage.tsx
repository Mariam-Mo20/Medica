import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Patient, MedicalRecord, Prescription } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Phone, FileText, Pill, Save, Plus, Trash2, Stethoscope, AlertCircle, MoreHorizontal } from "lucide-react";

interface PrescriptionForm {
  medication_name: string;
  dosage: string;
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [rxForms, setRxForms] = useState<PrescriptionForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showConsultForm, setShowConsultForm] = useState(false);

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
    setRxForms([...rxForms, { medication_name: "", dosage: "" }]);
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
        await api.post<Prescription[]>(`/prescriptions/medical-record/${rec.id}`,
          rxForms.map((rx) => ({ ...rx, frequency: rx.dosage ? "As directed" : "As needed" }))
        );
      }
      setDiagnosis("");
      setSymptoms("");
      setVisitNotes("");
      setRxForms([]);
      setShowConsultForm(false);
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
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  const lastRecord = records[records.length - 1];
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
    : null;
  const fullName = `${patient.first_name} ${patient.last_name}`;
  const initials = ((patient.first_name?.[0] || "") + (patient.last_name?.[0] || "")).toUpperCase();

  return (
    <div>
      <header className="pb-4">
        <button onClick={() => navigate("/patients")} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Patients
        </button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-primary-container text-primary flex items-center justify-center text-2xl font-bold border-2 border-white shadow-sm">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{fullName}</h2>
                <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs font-semibold uppercase">ID: {patient.medical_record_number}</span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {age ?? "—"} Years Old {patient.gender ? `• ${patient.gender === "male" ? "Male" : patient.gender === "female" ? "Female" : patient.gender}` : ""}
                {patient.phone ? ` • ${patient.phone}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowConsultForm(true)} className="rounded-lg gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Add Visit
            </Button>
            <Button variant="outline" className="rounded-lg border-border gap-2">
              More Actions
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="mb-8">
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
          <Card className="border-border shadow-sm rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-xl text-primary shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Visit</p>
                <p className="text-foreground font-bold">
                  {lastRecord?.created_at ? new Date(lastRecord.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lastRecord?.created_at
                    ? (() => {
                        const diff = Math.floor((Date.now() - new Date(lastRecord.created_at).getTime()) / 86400000);
                        return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff} days ago`;
                      })()
                    : "No visits recorded"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="bg-orange-50 p-3 rounded-xl text-orange-600 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Diagnosis</p>
                <p className="text-foreground font-bold">{lastRecord?.diagnosis || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {lastRecord?.diagnosis ? "Active" : "No diagnosis recorded"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-1/4 flex flex-col gap-5">
          <Card className="border-border shadow-sm rounded-xl">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Patient Information</h3>
            </div>
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Date of Birth</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(patient.date_of_birth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Phone</p>
                <p className="text-sm font-medium text-foreground">{patient.phone || "—"}</p>
              </div>
              {patient.email && (
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Email</p>
                  <p className="text-sm font-medium text-foreground">{patient.email}</p>
                </div>
              )}
              {patient.address && (
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Address</p>
                  <p className="text-sm font-medium text-foreground">{patient.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm rounded-xl">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Current Medications</h3>
            </div>
            <CardContent className="p-5 space-y-2">
              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medications prescribed</p>
              ) : (
                prescriptions.slice(0, 4).map((rx) => (
                  <div key={rx.id} className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    {rx.medication_name} {rx.dosage}
                  </div>
                ))
              )}
              {prescriptions.length > 4 && (
                <p className="text-xs text-primary font-medium cursor-pointer">+{prescriptions.length - 4} more</p>
              )}
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full rounded-xl border-border justify-start gap-2"
            onClick={() => navigate(`/appointments/new?patientId=${id}`)}
          >
            <Stethoscope className="h-4 w-4" />
            Schedule Appointment
          </Button>
        </aside>

        <section className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-foreground">Medical History</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-lg border-border text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>

          {showConsultForm && (
            <form onSubmit={handleSubmit} className="mb-8">
              <Card className="border-border shadow-sm rounded-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />
                      New Consultation
                    </CardTitle>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowConsultForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 p-3 text-sm bg-red-50 text-destructive rounded-lg border border-red-200">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Symptoms</Label>
                    <textarea
                      className="flex min-h-[70px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Describe patient symptoms..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Diagnosis</Label>
                    <textarea
                      className="flex min-h-[70px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Enter diagnosis..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Visit Notes</Label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                      placeholder="Additional visit notes..."
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-xs font-medium">Medication</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addRx} className="h-7 text-xs rounded-lg border-border">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Medication
                      </Button>
                    </div>
                    {rxForms.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">No medication added</p>
                    )}
                    {rxForms.map((pf, idx) => (
                      <div key={idx} className="border border-border rounded-lg p-3 space-y-2 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">Medication #{idx + 1}</span>
                          <button type="button" onClick={() => removeRx(idx)} className="text-destructive hover:text-destructive/80">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <Input value={pf.medication_name} onChange={(e) => updateRx(idx, "medication_name", e.target.value)} placeholder="Medication name *" className="h-9 text-sm border-border rounded-lg" required />
                          <Input value={pf.dosage} onChange={(e) => updateRx(idx, "dosage", e.target.value)} placeholder="Dosage (optional)" className="h-9 text-sm border-border rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="submit" disabled={saving} className="rounded-lg shadow-sm">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Visit"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}

          <div className="relative pl-8 space-y-6">
            <div className="absolute left-3 top-3 bottom-0 w-0.5 bg-border" />
            {records.length === 0 ? (
              <div className="pl-4 py-8 text-center text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No medical history recorded</p>
                <Button variant="outline" size="sm" className="mt-3 rounded-lg border-border" onClick={() => setShowConsultForm(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add First Visit
                </Button>
              </div>
            ) : (
              [...records].reverse().map((record, idx) => (
                <div key={record.id} className="relative">
                  <div className={`absolute -left-8 mt-4 w-6 h-6 rounded-full border-4 border-white z-10 ${idx === 0 ? "bg-primary" : "bg-border"}`} />
                  <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-muted-foreground">
                          {record.created_at
                            ? new Date(record.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " • " +
                              new Date(record.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-foreground mb-2">
                        {record.diagnosis || "Medical Visit"}
                      </h4>
                      {record.symptoms && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{record.symptoms}</p>
                      )}
                      {record.visit_notes && !record.symptoms && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{record.visit_notes}</p>
                      )}
                    </div>
                    {(record.diagnosis || prescriptions.filter((p) => p.medical_record_id === record.id).length > 0) && (
                      <div className="bg-muted/30 p-5 border-t border-border flex flex-col sm:flex-row gap-6">
                        {record.diagnosis && (
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Diagnosis</p>
                            <p className="text-sm font-bold text-foreground">{record.diagnosis}</p>
                          </div>
                        )}
                        {prescriptions.filter((p) => p.medical_record_id === record.id).length > 0 && (
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Prescription</p>
                            <ul className="space-y-1">
                              {prescriptions
                                .filter((p) => p.medical_record_id === record.id)
                                .map((p) => (
                                  <li key={p.id} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    {p.medication_name} {p.dosage} ({p.frequency})
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
