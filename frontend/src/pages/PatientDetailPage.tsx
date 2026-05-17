import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import { Patient, MedicalRecord, Prescription } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, FileText, Save, Plus, Trash2, Stethoscope, AlertCircle, Eye, Printer } from "lucide-react";

interface PrescriptionForm {
  id?: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  saved?: boolean;
}

interface MedicationSuggestion {
  medication_name: string;
  usage_count: number;
}

const MS_PER_YEAR = 31557600000;
const MS_PER_DAY = 86400000;

function getAgeFromDateOfBirth(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  return Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / MS_PER_YEAR);
}

function getDaysSince(dateTime?: string): string {
  if (!dateTime) return "No visits recorded";
  const diff = Math.floor((Date.now() - new Date(dateTime).getTime()) / MS_PER_DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
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
  const [expandedVisits, setExpandedVisits] = useState<Record<number, boolean>>({});
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editSymptoms, setEditSymptoms] = useState("");
  const [editVisitNotes, setEditVisitNotes] = useState("");
  const [editRxForms, setEditRxForms] = useState<PrescriptionForm[]>([]);
  const [rxSuggestions, setRxSuggestions] = useState<Record<number, MedicationSuggestion[]>>({});
  const [activeRxSuggestionRow, setActiveRxSuggestionRow] = useState<number | null>(null);

  const getRecordPrescriptions = (recordId: number) => prescriptions.filter((p) => p.medical_record_id === recordId);

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
    setRxForms([...rxForms, { medication_name: "", dosage: "", frequency: "", saved: false }]);
  const removeRx = (idx: number) => setRxForms(rxForms.filter((_, i) => i !== idx));
  const updateRx = (idx: number, field: keyof PrescriptionForm, value: string) => {
    const next = [...rxForms];
    next[idx] = { ...next[idx], [field]: value, saved: false };
    setRxForms(next);
  };

  const handleMedicationNameChange = async (idx: number, value: string) => {
    updateRx(idx, "medication_name", value);
    setActiveRxSuggestionRow(idx);
    if (value.trim().length < 1) {
      setRxSuggestions((prev) => ({ ...prev, [idx]: [] }));
      return;
    }
    try {
      const data = await api.get<MedicationSuggestion[]>(`/prescriptions/suggestions?q=${encodeURIComponent(value)}&limit=6`);
      setRxSuggestions((prev) => ({ ...prev, [idx]: data }));
    } catch {
      setRxSuggestions((prev) => ({ ...prev, [idx]: [] }));
    }
  };

  const applyMedicationSuggestion = (idx: number, name: string) => {
    updateRx(idx, "medication_name", name);
    setRxSuggestions((prev) => ({ ...prev, [idx]: [] }));
    setActiveRxSuggestionRow(null);
  };

  const saveRxDraft = (idx: number) => {
    const next = [...rxForms];
    if (!next[idx].medication_name.trim()) {
      setError("Medication name is required before saving medication");
      return;
    }
    next[idx] = { ...next[idx], saved: true };
    setRxForms(next);
    setError("");
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
      const medsToSubmit = rxForms.filter((rx) => rx.medication_name.trim().length > 0);
      if (medsToSubmit.length > 0) {
        await api.post<Prescription[]>(`/prescriptions/medical-record/${rec.id}`,
          medsToSubmit.map((rx) => ({
            medication_name: rx.medication_name,
            dosage: rx.dosage,
            frequency: rx.frequency,
          }))
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

  const toggleVisit = (recordId: number) => {
    const opening = !expandedVisits[recordId];
    if (!opening) {
      setExpandedVisits((prev) => ({ ...prev, [recordId]: false }));
      if (editingRecordId === recordId) cancelEditVisit();
      return;
    }

    const record = records.find((r) => r.id === recordId);
    if (record) {
      setEditingRecordId(record.id);
      setEditDiagnosis(record.diagnosis || "");
      setEditSymptoms(record.symptoms || "");
      setEditVisitNotes(record.visit_notes || "");
      setEditRxForms(getRecordPrescriptions(record.id).map((p) => ({
        id: p.id,
        medication_name: p.medication_name,
        dosage: p.dosage,
        frequency: p.frequency,
      })));
    }
    setExpandedVisits((prev) => ({ ...prev, [recordId]: true }));
  };

  const cancelEditVisit = () => {
    setEditingRecordId(null);
    setEditDiagnosis("");
    setEditSymptoms("");
    setEditVisitNotes("");
    setEditRxForms([]);
  };

  const updateEditRx = (idx: number, field: keyof PrescriptionForm, value: string) => {
    const next = [...editRxForms];
    next[idx] = { ...next[idx], [field]: value };
    setEditRxForms(next);
  };

  const saveVisitEdit = async (recordId: number) => {
    setSaving(true);
    setError("");
    try {
      await api.put<MedicalRecord>(`/medical-records/${recordId}`, {
        diagnosis: editDiagnosis,
        symptoms: editSymptoms,
        visit_notes: editVisitNotes,
      });
      await Promise.all(
        editRxForms
          .filter((rx) => rx.id)
          .map((rx) =>
            api.put(`/prescriptions/${rx.id}`, {
              medication_name: rx.medication_name,
              dosage: rx.dosage,
              frequency: rx.frequency,
            }),
          ),
      );
      const updated = await api.get<MedicalRecord[]>(`/medical-records/patient/${id}`);
      setRecords(updated);
      const updatedRx = await Promise.all(
        updated.map((r) => api.get<Prescription[]>(`/prescriptions/medical-record/${r.id}`).catch(() => [] as Prescription[])),
      );
      setPrescriptions(updatedRx.flat());
      cancelEditVisit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update visit");
    } finally {
      setSaving(false);
    }
  };

  const printPrescription = (record: MedicalRecord) => {
    if (!patient) return;
    const meds = getRecordPrescriptions(record.id);
    if (meds.length === 0) return;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;

    const visitDate = record.created_at ? formatDisplayDateTime(record.created_at) : "";
    const body = meds
      .map(
        (p, idx) =>
          `<tr><td>${idx + 1}</td><td>${p.medication_name}</td><td>${p.dosage || "-"}</td><td>${p.frequency || "-"}</td></tr>`,
      )
      .join("");

    w.document.write(`<!doctype html><html><head><title>Prescription - ${fullName}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}h1{margin:0 0 8px}p{margin:4px 0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #d1d5db;padding:8px;text-align:left}th{background:#f3f4f6}.muted{color:#6b7280;font-size:12px}</style></head><body><h1>Prescription</h1><p><strong>Patient:</strong> ${fullName}</p><p><strong>MRN:</strong> ${patient.medical_record_number}</p><p><strong>Visit Date:</strong> ${visitDate}</p><p><strong>Doctor:</strong> ${record.doctor_name || "-"}</p><table><thead><tr><th>#</th><th>Medication</th><th>Dosage</th><th>Frequency</th></tr></thead><tbody>${body}</tbody></table><p class="muted">Generated from Medica</p></body></html>`);
    w.document.close();
    w.focus();
    w.print();
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
  const age = getAgeFromDateOfBirth(patient.date_of_birth);
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
                  {lastRecord?.created_at ? formatDisplayDate(lastRecord.created_at) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getDaysSince(lastRecord?.created_at)}
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
                  {formatDisplayDate(patient.date_of_birth)}
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
            <div />
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
                    <Label className="text-xs font-medium">Diagnosis</Label>
                    <textarea
                      className="flex min-h-[70px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Enter diagnosis..."
                    />
                  </div>
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
                          <div className="relative">
                            <Input value={pf.medication_name} onChange={(e) => handleMedicationNameChange(idx, e.target.value)} onFocus={() => setActiveRxSuggestionRow(idx)} placeholder="Medication name *" className="h-9 text-sm border-border rounded-lg" required disabled={pf.saved} />
                            {!pf.saved && activeRxSuggestionRow === idx && (rxSuggestions[idx]?.length || 0) > 0 && (
                              <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-white shadow-md overflow-hidden">
                                {rxSuggestions[idx].map((s) => (
                                  <button
                                    key={`${idx}-${s.medication_name}`}
                                    type="button"
                                    className="w-full px-3 py-2 text-left hover:bg-accent/60"
                                    onClick={() => applyMedicationSuggestion(idx, s.medication_name)}
                                  >
                                    <span className="text-sm text-foreground">{s.medication_name}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">used {s.usage_count}x</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Input value={pf.dosage} onChange={(e) => updateRx(idx, "dosage", e.target.value)} placeholder="Dosage (optional)" className="h-9 text-sm border-border rounded-lg" disabled={pf.saved} />
                            <Input value={pf.frequency} onChange={(e) => updateRx(idx, "frequency", e.target.value)} placeholder="Frequency (optional)" className="h-9 text-sm border-border rounded-lg" disabled={pf.saved} />
                            <div className="flex justify-end gap-2">
                              {pf.saved ? (
                                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateRx(idx, "medication_name", pf.medication_name)}>
                                  Edit Medication
                                </Button>
                              ) : (
                                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => saveRxDraft(idx)}>
                                  Save Medication
                                </Button>
                              )}
                            </div>
                          </div>
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
                          {record.created_at ? formatDisplayDateTime(record.created_at) : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => toggleVisit(record.id)}>
                            <Eye className="h-3 w-3 mr-1" />
                            {expandedVisits[record.id] ? "Hide Visit" : "View Visit"}
                          </Button>
                          {getRecordPrescriptions(record.id).length > 0 && (
                            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => printPrescription(record)}>
                              <Printer className="h-3 w-3 mr-1" />
                              Print Prescription
                            </Button>
                          )}
                        </div>
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
                      {expandedVisits[record.id] && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Symptoms</p>
                            {editingRecordId === record.id ? (
                              <textarea className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm" value={editSymptoms} onChange={(e) => setEditSymptoms(e.target.value)} />
                            ) : (
                              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{record.symptoms || "-"}</p>
                            )}
                          </div>
                          <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Visit Notes</p>
                            {editingRecordId === record.id ? (
                              <textarea className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm" value={editVisitNotes} onChange={(e) => setEditVisitNotes(e.target.value)} />
                            ) : (
                              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{record.visit_notes || "-"}</p>
                            )}
                          </div>
                          <div className="rounded-lg border border-border bg-muted/20 p-3 sm:col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Medication</p>
                            {getRecordPrescriptions(record.id).length === 0 ? (
                              <p className="mt-1 text-sm text-muted-foreground">No medication prescribed</p>
                            ) : editingRecordId === record.id ? (
                              <div className="mt-1 space-y-2">
                                {editRxForms.map((rx, rxIdx) => (
                                  <div key={`edit-rx-${rx.id || rxIdx}`} className="grid gap-2 md:grid-cols-2">
                                    <Input value={rx.medication_name} onChange={(e) => updateEditRx(rxIdx, "medication_name", e.target.value)} placeholder="Medication" className="h-8 text-sm" />
                                    <div className="space-y-2">
                                      <Input value={rx.dosage} onChange={(e) => updateEditRx(rxIdx, "dosage", e.target.value)} placeholder="Dosage" className="h-8 text-sm" />
                                      <Input value={rx.frequency} onChange={(e) => updateEditRx(rxIdx, "frequency", e.target.value)} placeholder="Frequency" className="h-8 text-sm" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <ul className="mt-1 space-y-1">
                                {getRecordPrescriptions(record.id).map((p) => (
                                    <li key={`expanded-${p.id}`} className="text-sm text-foreground">
                                      <div className="font-medium">{p.medication_name}</div>
                                      <div className="text-xs text-muted-foreground">{p.dosage || "-"}</div>
                                      <div className="text-xs text-muted-foreground">{p.frequency || "-"}</div>
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </div>
                          {editingRecordId === record.id && (
                            <div className="rounded-lg border border-border bg-muted/20 p-3 sm:col-span-2">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Diagnosis</p>
                              <textarea className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm" value={editDiagnosis} onChange={(e) => setEditDiagnosis(e.target.value)} />
                              <div className="mt-3 flex gap-2 justify-end">
                                <Button type="button" variant="outline" size="sm" onClick={cancelEditVisit}>Cancel</Button>
                                <Button type="button" size="sm" onClick={() => saveVisitEdit(record.id)} disabled={saving}>Save</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {(record.diagnosis || getRecordPrescriptions(record.id).length > 0) && (
                      <div className="bg-muted/30 p-5 border-t border-border flex flex-col sm:flex-row gap-6">
                        {record.diagnosis && (
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Diagnosis</p>
                            <p className="text-sm font-bold text-foreground">{record.diagnosis}</p>
                          </div>
                        )}
                        {getRecordPrescriptions(record.id).length > 0 && (
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Prescription</p>
                            <ul className="space-y-1">
                              {getRecordPrescriptions(record.id).map((p) => (
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
