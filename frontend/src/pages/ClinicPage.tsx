import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hospital, ArrowLeft } from "lucide-react";

export function ClinicPage() {
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const raw = sessionStorage.getItem("signup_data");
      if (!raw) { navigate("/signup"); return; }
      const data = JSON.parse(raw);

      const body: Record<string, unknown> = {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        role: "doctor",
        phone: data.phone || null,
        clinic_name: clinicName,
      };
      const reg = await api.post<{ access_token: string; refresh_token: string }>("/auth/register", body);
      localStorage.setItem("access_token", reg.access_token);
      localStorage.setItem("refresh_token", reg.refresh_token);
      sessionStorage.removeItem("signup_data");
      sessionStorage.removeItem("signup_role");
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <Card className="w-full max-w-md border-0 shadow-xl relative">
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Hospital className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Create Your Clinic</CardTitle>
          <CardDescription>Set up your clinic to get started</CardDescription>
        </CardHeader>
        <CardContent className="pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="clinic_name">Clinic Name</Label>
              <Input id="clinic_name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required placeholder="e.g. My Medical Clinic" className="h-11" />
              <p className="text-xs text-muted-foreground">This will be your clinic's name used across the system</p>
            </div>
            <Button type="submit" className="w-full h-11 text-base" disabled={saving}>
              {saving ? "Creating..." : "Create Clinic & Complete Registration"}
            </Button>
            <div className="flex justify-center">
              <Button type="button" variant="link" size="sm" onClick={() => navigate("/signup")}>
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to personal details
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
