import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, ClipboardList, ArrowLeft } from "lucide-react";

type RoleType = "doctor" | "assistant";

export function RolePage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleType>("doctor");
  const [invitationToken, setInvitationToken] = useState("");
  const [checkingToken, setCheckingToken] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("signup_data");
    if (!raw) {
      navigate("/signup");
      return;
    }
    try {
      const data = JSON.parse(raw);
      if (data.invitation_token) {
        setRole("assistant");
        setInvitationToken(data.invitation_token);
      }
    } catch {
      navigate("/signup");
    }
  }, [navigate]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const raw = sessionStorage.getItem("signup_data");
    if (!raw) {
      navigate("/signup");
      return;
    }

    if (role === "doctor") {
      sessionStorage.setItem("signup_role", "doctor");
      navigate("/signup/clinic");
      return;
    }

    if (!invitationToken.trim()) {
      setError("Invitation token is required for assistant registration");
      return;
    }

    let tokenValue = invitationToken.trim();
    try {
      if (tokenValue.startsWith("http://") || tokenValue.startsWith("https://")) {
        const u = new URL(tokenValue);
        tokenValue = u.searchParams.get("token") || tokenValue;
      }
    } catch {
      // keep raw value
    }

    setCheckingToken(true);
    try {
      const check = await api.get<{ valid: boolean; message?: string }>(
        `/invitations/check?token=${encodeURIComponent(tokenValue)}`
      );
      if (!check.valid) {
        setError(check.message || "Invalid invitation token");
        return;
      }
    } catch {
      setError("Failed to validate invitation token");
      return;
    } finally {
      setCheckingToken(false);
    }

    setSaving(true);
    try {
      const data = JSON.parse(raw);
      const reg = await api.post<{ access_token: string; refresh_token: string }>("/auth/register", {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        role: "assistant",
        phone: data.phone || null,
        invitation_token: tokenValue,
      });
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
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-md border-border shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Choose Your Role</CardTitle>
          <CardDescription>Select how you want to join Medica</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleContinue} className="space-y-4">
            {error && <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`border rounded-lg p-3 text-left transition-colors ${role === "doctor" ? "border-primary bg-primary-container" : "border-border hover:bg-accent/50"}`}
              >
                <Stethoscope className="h-4 w-4 mb-2 text-primary" />
                <p className="text-sm font-semibold">Doctor</p>
              </button>
              <button
                type="button"
                onClick={() => setRole("assistant")}
                className={`border rounded-lg p-3 text-left transition-colors ${role === "assistant" ? "border-primary bg-primary-container" : "border-border hover:bg-accent/50"}`}
              >
                <ClipboardList className="h-4 w-4 mb-2 text-primary" />
                <p className="text-sm font-semibold">Assistant</p>
              </button>
            </div>

            {role === "assistant" && (
              <div className="space-y-2">
                <Label htmlFor="invite">Invitation Link or Token</Label>
                <Input
                  id="invite"
                  value={invitationToken}
                  onChange={(e) => setInvitationToken(e.target.value)}
                  placeholder="Paste invitation link or token"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={saving || checkingToken}>
              {saving || checkingToken ? "Please wait..." : role === "doctor" ? "Continue to Clinic Setup" : "Complete Registration"}
            </Button>

            <Button type="button" variant="link" size="sm" onClick={() => navigate("/signup")} className="w-full">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to signup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
