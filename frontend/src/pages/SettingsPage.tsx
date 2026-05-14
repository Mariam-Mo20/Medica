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
    try {
      await api.put(`/tenants/${user?.tenant_id}`, { name: clinicName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${user?.id}`, {
        full_name: profile.full_name,
        role: profile.role,
        phone: profile.phone || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-h1 text-h1 text-foreground">Settings</h1>
        <p className="text-body-lg text-outline mt-1">Manage your clinic and account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">Clinic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinic_name">Clinic Name</Label>
            <div className="flex gap-2">
              <Input id="clinic_name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="flex-1" />
              <Button onClick={saveClinic} disabled={saving}>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select options={roleOptions} value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <Button onClick={saveProfile} disabled={saving}>
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
