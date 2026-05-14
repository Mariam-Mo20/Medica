import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Invitation } from "@/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Copy, Check, Share2, ArrowRight } from "lucide-react";

const roleOptions = [
  { value: "assistant", label: "Assistant" },
  { value: "doctor", label: "Doctor" },
];

export function SignupCompletePage() {
  const navigate = useNavigate();
  const [inviteRole, setInviteRole] = useState("assistant");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setGenerating(true);
    try {
      const inv = await api.post<Invitation>("/invitations/", { role: inviteRole });
      setLink(`${window.location.origin}/signup?token=${inv.token}`);
    } catch { /* ignore */ } finally { setGenerating(false); }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clinicName = sessionStorage.getItem("clinic_name") || "your clinic";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-lg border-0 shadow-xl">
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Medica!</CardTitle>
          <p className="text-body-md text-outline mt-2">
            Your clinic <span className="font-semibold text-foreground">{clinicName}</span> is ready.
          </p>
        </CardHeader>
        <CardContent className="pb-8 px-8 space-y-6">
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="font-label-md text-foreground">Invite your team</h3>
            </div>
            <div className="flex gap-3 items-end">
              <div className="space-y-1.5 flex-1">
                <label className="text-label-sm text-outline uppercase tracking-wider">Role</label>
                <Select options={roleOptions} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} />
              </div>
              <Button onClick={generateLink} disabled={generating}>
                {generating ? "Generating..." : "Generate Link"}
              </Button>
            </div>
            {link && (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                <input readOnly value={link} className="flex-1 text-sm border-0 bg-transparent px-2 py-1.5 font-mono focus:outline-none" onClick={(e) => (e.target as HTMLInputElement).select()} />
                <Button size="sm" variant="default" className="shrink-0" onClick={copyLink}>
                  {copied ? <><Check className="h-4 w-4 mr-1" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                </Button>
              </div>
            )}
          </div>

          <Button className="w-full h-11 text-base" onClick={() => navigate("/login")}>
            Go to Login
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
