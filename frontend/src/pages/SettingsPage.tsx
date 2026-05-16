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
    <div className="space-y-5 lg:space-y-4">
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-foreground">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage your clinic and account preferences.</p>
      </div>
      {error && <div className="p-3 text-sm rounded-lg border border-red-200 bg-red-50 text-red-600">{error}</div>}

      <Card className="border-border/70 shadow-sm rounded-xl">
        <CardHeader className="p-4 lg:p-3 pb-2 lg:pb-2">
          <CardTitle className="text-sm font-semibold">Clinic Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:p-3 pt-0 space-y-3">
          <div>
            <Label htmlFor="clinic_name" className="text-xs font-medium text-muted-foreground">Clinic Name</Label>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Input id="clinic_name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="flex-1 h-9 rounded-lg text-sm" />
              <Button onClick={saveClinic} disabled={saving} size="sm" className="h-9 rounded-lg">
                <Save className="h-3.5 w-3.5 mr-1" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
            {saved && (
              <p className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm rounded-xl">
        <CardHeader className="p-4 lg:p-3 pb-2 lg:pb-2">
          <CardTitle className="text-sm font-semibold">Profile</CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:p-3 pt-0 space-y-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Full Name</Label>
            <Input className="h-9 rounded-lg text-sm mt-1" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <Input value={profile.email} disabled className="h-9 rounded-lg text-sm mt-1 bg-gray-50" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Role</Label>
            <div className="mt-1">
              <Select options={roleOptions} value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
            <Input className="h-9 rounded-lg text-sm mt-1" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <Button onClick={saveProfile} disabled={saving} size="sm" className="h-9 rounded-lg">
            <Save className="h-3.5 w-3.5 mr-1" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
          {saved && (
            <p className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
