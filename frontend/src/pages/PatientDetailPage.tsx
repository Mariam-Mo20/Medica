import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Patient, MedicalRecord, Prescription } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Phone, Mail, MapPin, FileText, Pill, Save, Plus, Trash2, Stethoscope } from "lucide-react";

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

  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [prescriptionForms, setPrescriptionForms] = useState<PrescriptionForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get<Patient>(`/patients/${id}`).then(setPatient);
    api.get<MedicalRecord[]>(`/medical-records/patient/${id}`).then(setRecords);
    loadPrescriptions();
  }, [id]);

  const loadPrescriptions = async () => {
    if (!id) return;
    try {
      const recordsData = await api.get<MedicalRecord[]>(`/medical-records/patient/${id}`);
      const allRx: Prescription[] = [];
      for (const rec of recordsData) {
        const rx = await api.get<Prescription[]>(`/prescriptions/medical-record/${rec.id}`);
        allRx.push(...rx);
      }
      setPrescriptions(allRx);
    } catch { /* ignore */ }
  };

  const addPrescriptionForm = () => {
    setPrescriptionForms([...prescriptionForms, {
      medication_name: "", dosage: "", frequency: "", duration: "", instructions: "",
    }]);
  };

  const removePrescriptionForm = (idx: number) => {
    setPrescriptionForms(prescriptionForms.filter((_, i) => i !== idx));
  };

  const updatePrescriptionForm = (idx: number, field: keyof PrescriptionForm, value: string) => {
    const updated = [...prescriptionForms];
    updated[idx] = { ...updated[idx], [field]: value };
    setPrescriptionForms(updated);
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
      if (prescriptionForms.length > 0) {
        await api.post<Prescription[]>(`/prescriptions/medical-record/${rec.id}`, prescriptionForms);
      }
      setDiagnosis("");
      setSymptoms("");
      setVisitNotes("");
      setPrescriptionForms([]);
      const updated = await api.get<MedicalRecord[]>(`/medical-records/patient/${id}`);
      setRecords(updated);
      loadPrescriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!patient) {
    return <div className="animate-pulse space-y-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <a onClick={() => navigate("/patients")} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patients
        </a>
      </Button>

      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-h1 text-h1 text-foreground">{patient.first_name} {patient.last_name}</CardTitle>
              <p className="text-body-lg text-outline mt-1">{patient.medical_record_number}</p>
            </div>
            <Badge variant={patient.is_active ? "success" : "destructive"}>
              {patient.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>DOB: {new Date(patient.date_of_birth).toLocaleDateString("en-GB")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Gender:</span>
              <span>{patient.gender || "—"}</span>
            </div>
            {patient.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{patient.phone}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{patient.email}</span>
              </div>
            )}
            {patient.address && (
              <div className="flex items-center gap-2 text-sm md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{patient.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Medical History
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger value="consultation" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            New Consultation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-6">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <CardContent className="p-4">
              {records.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No medical records yet</p>
              ) : (
                <div className="space-y-4">
                  {records.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">{record.doctor_name || "Doctor"}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {record.created_at ? new Date(record.created_at).toLocaleDateString("en-GB") : ""}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      {record.diagnosis && (
                        <div className="mb-2">
                          <span className="text-sm font-medium">Diagnosis: </span>
                          <span className="text-sm">{record.diagnosis}</span>
                        </div>
                      )}
                      {record.symptoms && (
                        <div className="mb-2">
                          <span className="text-sm font-medium">Symptoms: </span>
                          <span className="text-sm">{record.symptoms}</span>
                        </div>
                      )}
                      {record.visit_notes && (
                        <div>
                          <span className="text-sm font-medium">Notes: </span>
                          <span className="text-sm">{record.visit_notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-6">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <CardContent className="p-4">
              {prescriptions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No prescriptions yet</p>
              ) : (
                <div className="space-y-3">
                  {prescriptions.map((rx) => (
                    <div key={rx.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{rx.medication_name}</span>
                        <span className="text-sm text-muted-foreground">{rx.doctor_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{rx.dosage} · {rx.frequency}{rx.duration ? ` · ${rx.duration}` : ""}</p>
                        {rx.instructions && <p className="italic">{rx.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultation" className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm bg-red-50 text-red-600 rounded-md border border-red-200">{error}</div>
            )}

            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Medical Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms</Label>
                  <textarea id="symptoms" className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Describe patient symptoms..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <textarea id="diagnosis" className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Enter diagnosis..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Visit Notes</Label>
                  <textarea id="notes" className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} placeholder="Additional visit notes..." />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Prescriptions
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addPrescriptionForm}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Medication
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {prescriptionForms.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No prescriptions added yet</p>
                )}
                {prescriptionForms.map((pf, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Medication #{idx + 1}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removePrescriptionForm(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Medication Name</Label>
                        <Input value={pf.medication_name} onChange={(e) => updatePrescriptionForm(idx, "medication_name", e.target.value)} placeholder="e.g. Amoxicillin" required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Dosage</Label>
                        <Input value={pf.dosage} onChange={(e) => updatePrescriptionForm(idx, "dosage", e.target.value)} placeholder="e.g. 500mg" required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Frequency</Label>
                        <Input value={pf.frequency} onChange={(e) => updatePrescriptionForm(idx, "frequency", e.target.value)} placeholder="e.g. 3 times daily" required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Duration</Label>
                        <Input value={pf.duration} onChange={(e) => updatePrescriptionForm(idx, "duration", e.target.value)} placeholder="e.g. 7 days" />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs">Instructions</Label>
                        <Input value={pf.instructions} onChange={(e) => updatePrescriptionForm(idx, "instructions", e.target.value)} placeholder="e.g. Take with food" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Consultation"}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
