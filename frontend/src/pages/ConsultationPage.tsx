import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/date";
import { Appointment, MedicalRecord, Prescription } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2, FileText, Pill } from "lucide-react";

interface PrescriptionForm {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export function ConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [prescriptionForms, setPrescriptionForms] = useState<PrescriptionForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appointmentId) return;
    api.get<Appointment>(`/appointments/${appointmentId}`).then(setAppointment);
  }, [appointmentId]);

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
        appointment_id: parseInt(appointmentId!),
        diagnosis,
        symptoms,
        visit_notes: visitNotes,
      });

      if (prescriptionForms.length > 0) {
        await api.post<Prescription[]>(`/prescriptions/medical-record/${rec.id}`, prescriptionForms);
      }

      navigate("/appointments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save consultation");
    } finally {
      setSaving(false);
    }
  };

  if (!appointment) {
    return <div className="animate-pulse space-y-4">Loading appointment...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/appointments")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Appointments
      </Button>

      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="font-h1 text-h1 text-foreground">Consultation</CardTitle>
              <p className="text-body-lg text-outline mt-1">
                Patient: {appointment.patient_name || `#${appointment.patient_id}`} · Doctor: {appointment.doctor_name || (appointment.doctor_id ? `#${appointment.doctor_id}` : "—")}
              </p>
            </div>
            <Badge>{formatDisplayDateTime(appointment.scheduled_at)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {appointment.reason && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <span className="text-sm font-medium">Reason for visit: </span>
              <span className="text-sm">{appointment.reason}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-600 rounded-md border border-red-200">
            {error}
          </div>
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
              <textarea
                id="symptoms"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describe patient symptoms..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <textarea
                id="diagnosis"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter diagnosis..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Visit Notes</Label>
              <textarea
                id="notes"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Additional visit notes..."
              />
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
              <p className="text-sm text-muted-foreground text-center py-4">
                No prescriptions added yet
              </p>
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
          <Button variant="outline" type="button" onClick={() => navigate("/appointments")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save & Complete"}
          </Button>
        </div>
      </form>
    </div>
  );
}
