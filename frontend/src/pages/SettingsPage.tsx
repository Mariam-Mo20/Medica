import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, CheckCircle2 } from "lucide-react";

const roleOptions = [
  { value: "doctor", label: "Doctor" },
  { value: "assistant", label: "Assistant" },
];

export function SettingsPage() {
  const { user } = useAuthStore();
  const [clinicName, setClinicName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState({
    full_name: "", email: "", role: "", phone: "",
  });

  useEffect(() => {
    if (user?.tenant_name) setClinicName(user.tenant_name);
    if (user) {
      setProfile({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
      });
    }
  }, [user]);

  const saveClinic = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put(`/tenants/${user?.tenant_id}`, { name: clinicName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save clinic settings");
    } finally { setSaving(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put(`/users/${user?.id}`, {
        full_name: profile.full_name,
        role: profile.role,
        phone: profile.phone || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your clinic and account preferences.</p>
      </div>
      {error && <div className="p-3 text-sm rounded-lg border border-red-200 bg-red-50 text-red-600">{error}</div>}

      <Card className="border-border shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">Clinic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinic_name" className="text-sm font-medium">Clinic Name</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input id="clinic_name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="flex-1 h-10 rounded-lg" />
              <Button onClick={saveClinic} disabled={saving} className="h-10 rounded-lg">
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
            {saved && (
              <p className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Full Name</Label>
            <Input className="h-10 rounded-lg" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email</Label>
            <Input value={profile.email} disabled className="h-10 rounded-lg bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <Select options={roleOptions} value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phone</Label>
            <Input className="h-10 rounded-lg" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <Button onClick={saveProfile} disabled={saving} className="h-10 rounded-lg">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
          {saved && (
            <p className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
