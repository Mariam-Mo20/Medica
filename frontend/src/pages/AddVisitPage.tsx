import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Patient, MedicalRecord, Prescription } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

const visitTypeOptions = [
  { value: "follow_up", label: "Follow-up" },
  { value: "consultation", label: "Consultation" },
];

interface RxForm {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export function AddVisitPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [visitType, setVisitType] = useState("consultation");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [rxForms, setRxForms] = useState<RxForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get<Patient>(`/patients/${id}`).then(setPatient);
  }, [id]);

  const addRx = () => setRxForms([...rxForms, { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  const removeRx = (idx: number) => setRxForms(rxForms.filter((_, i) => i !== idx));
  const updateRx = (idx: number, field: keyof RxForm, value: string) => {
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
        symptoms: chiefComplaint,
        visit_notes: clinicalNotes,
      });
      if (rxForms.length > 0) {
        await api.post<Prescription[]>(`/prescriptions/medical-record/${rec.id}`, rxForms);
      }
      navigate(`/patients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save visit");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(`/patients/${id}`)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Patient
      </Button>

      {patient && (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">
              {(patient.first_name?.[0] || "")}{(patient.last_name?.[0] || "")}
            </div>
            <div>
              <p className="font-label-md">{patient.first_name} {patient.last_name}</p>
              <p className="text-body-sm text-outline">{patient.medical_record_number} · DOB: {new Date(patient.date_of_birth).toLocaleDateString("en-GB")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>}

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Visit Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Visit Type</Label>
                    <Select options={visitTypeOptions} value={visitType} onChange={(e) => setVisitType(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Chief Complaint / Symptoms</Label>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="Describe patient's complaints..." />
                </div>
                <div className="space-y-2">
                  <Label>Diagnosis</Label>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Enter diagnosis..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Clinical Notes</CardTitle></CardHeader>
              <CardContent>
                <textarea className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Additional clinical notes..." />
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Prescriptions</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addRx}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {rxForms.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No prescriptions added</p>
                )}
                {rxForms.map((rx, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">#{idx + 1}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeRx(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <Input value={rx.medication_name} onChange={(e) => updateRx(idx, "medication_name", e.target.value)} placeholder="Medication name" className="h-8 text-sm" />
                    <Input value={rx.dosage} onChange={(e) => updateRx(idx, "dosage", e.target.value)} placeholder="Dosage" className="h-8 text-sm" />
                    <Input value={rx.frequency} onChange={(e) => updateRx(idx, "frequency", e.target.value)} placeholder="Frequency" className="h-8 text-sm" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(`/patients/${id}`)}>Cancel & Discard</Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Visit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
