import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hospital, ArrowLeft } from "lucide-react";

export function RolePage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"doctor" | "assistant">("assistant");
  const [invitationToken, setInvitationToken] = useState("");
  const [invitationRole, setInvitationRole] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("signup_data");
    if (!raw) {
      navigate("/signup");
      return;
    }
    let token = "";
    try {
      const data = JSON.parse(raw);
      if (data.invitation_token) {
        token = data.invitation_token;
        setInvitationToken(token);
        setRole("assistant");
      }
    } catch { navigate("/signup"); }

    if (token) {
      setCheckingToken(true);
      api.get<{ valid: boolean; email?: string; role?: string; message?: string }>(
        `/invitations/check?token=${encodeURIComponent(token)}`
      ).then((res) => {
        if (res.valid) {
          setInvitationEmail(res.email || null);
          setInvitationRole(res.role || null);
          if (res.role === "doctor") setRole("doctor");
        } else {
          setError(res.message || "Invalid invitation token");
          setInvitationToken("");
        }
      }).catch(() => {
        setError("Failed to validate invitation token");
        setInvitationToken("");
      }).finally(() => setCheckingToken(false));
    }
  }, [navigate]);

  const validateToken = async (token: string) => {
    setCheckingToken(true);
    setError("");
    try {
      const res = await api.get<{ valid: boolean; email?: string; role?: string; message?: string }>(
        `/invitations/check?token=${encodeURIComponent(token)}`
      );
      if (res.valid) {
        setInvitationEmail(res.email || null);
        setInvitationRole(res.role || null);
        if (res.role === "doctor") setRole("doctor");
        else setRole("assistant");
      } else {
        setError(res.message || "Invalid invitation token");
        setInvitationToken("");
      }
    } catch {
      setError("Failed to validate invitation token");
      setInvitationToken("");
    } finally {
      setCheckingToken(false);
    }
  };

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
        role,
        phone: data.phone || null,
        invitation_token: invitationToken,
      };
      await api.post("/auth/register", body);
      sessionStorage.removeItem("signup_data");
      navigate("/login");
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
          <CardTitle className="text-2xl">Accept Invitation</CardTitle>
          <CardDescription>You were invited to join a clinic</CardDescription>
        </CardHeader>
        <CardContent className="pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>
            )}

            {invitationRole ? (
              <div className="rounded-xl p-5 bg-primary/5 border border-primary/10 text-center">
                <p className="text-2xl mb-2">
                  {invitationRole === "doctor" ? "🩺" : "📋"}
                </p>
                <p className="text-sm font-medium text-foreground">
                  You were invited as a <span className="text-primary font-semibold">{invitationRole === "doctor" ? "Doctor" : "Assistant"}</span>
                </p>
                {invitationEmail && (
                  <p className="text-xs text-muted-foreground mt-1">for {invitationEmail}</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl p-5 bg-gray-50 border">
                <p className="text-sm font-medium mb-3">Enter your invitation token</p>
                <div className="space-y-3">
                  <Label htmlFor="token">Invitation Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="token"
                      value={invitationToken}
                      onChange={(e) => setInvitationToken(e.target.value)}
                      placeholder="Paste your invitation token"
                      required
                      className="h-11 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 px-4"
                      disabled={!invitationToken || checkingToken}
                      onClick={() => validateToken(invitationToken)}
                    >
                      {checkingToken ? "..." : "Verify"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste the token from the invitation link your clinic sent you
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base" disabled={saving || checkingToken || !invitationToken}>
              {saving ? "Please wait..." : "Complete Registration"}
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
