import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldCheck, Activity, HeartPulse } from "lucide-react";

export function LandingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [terms, setTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.full_name || !form.email || !form.password) {
      setError("All fields are required"); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match"); return;
    }
    if (!terms) {
      setError("You must agree to the terms"); return;
    }
    sessionStorage.setItem("signup_data", JSON.stringify({
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      phone: "",
    }));
    navigate("/signup/role");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-surface">
      <div className="hidden md:flex flex-col justify-center p-12 bg-gradient-to-br from-primary/5 via-surface to-tertiary/5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/30">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-h2 text-h2 text-foreground">Medica</span>
          </div>
          <h1 className="font-h1 text-4xl leading-tight text-foreground mb-4">
            A focused workspace for safer, faster clinical operations.
          </h1>
          <p className="text-body-lg text-outline mb-8">
            Coordinate appointments, records, and daily tasks from one reliable hub built for your clinic team.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/80 border border-slate-200 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <p className="text-body-md text-foreground">HIPAA-compliant data protection with role-based access</p>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/80 border border-slate-200 shadow-sm">
              <HeartPulse className="h-5 w-5 text-primary shrink-0" />
              <p className="text-body-md text-foreground">Real-time appointment and queue visibility</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 md:hidden">
            <div className="flex justify-center mb-2">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
                <Activity className="h-6 w-6" />
              </div>
            </div>
            <h1 className="font-h2 text-h2 text-foreground">Medica</h1>
          </div>
          <h2 className="font-h2 text-h2 text-foreground mb-2">Get started</h2>
          <p className="text-body-md text-outline mb-6">Create your account to join or start a clinic.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="h-11" placeholder="Dr. Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="h-11" placeholder="name@clinic.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="h-11 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input id="confirm_password" type={showPassword ? "text" : "password"} value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} required className="h-11" placeholder="••••••••" />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <span className="text-sm text-outline">I agree to the Terms of Service and Privacy Policy</span>
            </label>
            <Button type="submit" className="w-full h-11 text-base">Create Account</Button>
            <p className="text-center text-sm text-outline">
              Already have an account?{" "}
              <button type="button" onClick={() => navigate("/login")} className="text-primary font-medium underline-offset-4 hover:underline">Sign In</button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
