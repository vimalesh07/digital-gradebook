import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PASSWORD_REQUIREMENT, passwordSchema } from "@/lib/password";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const loginPasswordSchema = z.string().min(1, "Password required");

export default function Login() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  // login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup state
  const [sName, setSName] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPass, setSPass] = useState("");
  const [sDept, setSDept] = useState("");
  const [sRole, setSRole] = useState<"faculty" | "admin">("faculty");

  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "admin" ? "/admin" : "/faculty", { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      emailSchema.parse(email);
      loginPasswordSchema.parse(password);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
    } catch (err: any) {
      toast.error(err.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      emailSchema.parse(sEmail);
      passwordSchema.parse(sPass);
      if (!sName.trim()) throw new Error("Name required");
      const { error } = await supabase.auth.signUp({
        email: sEmail,
        password: sPass,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { name: sName, department: sDept, role: sRole },
        },
      });
      if (error) throw error;
      toast.success("Account created — signing you in…");
    } catch (err: any) {
      toast.error(err.message ?? "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email) return toast.error("Enter your email above first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Reset link sent — check your inbox");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container flex min-h-screen items-center justify-center py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="hidden flex-col justify-center text-primary-foreground lg:flex">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h1 className="mb-4 text-5xl font-bold leading-tight">
              Digital Answer Sheet Evaluation
            </h1>
            <p className="text-lg text-primary-foreground/80">
              A secure platform for universities to digitize the exam paper correction
              process — upload, assign, and evaluate answer sheets online with annotations
              and structured marks entry.
            </p>
            <ul className="mt-8 space-y-2 text-primary-foreground/90">
              <li>• Role-based access for COE and faculty</li>
              <li>• Encrypted file storage</li>
              <li>• Real-time evaluation monitoring</li>
              <li>• Auditable, exportable reports</li>
            </ul>
          </div>

          <Card className="border-0 p-6 shadow-lg sm:p-8">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">University email</Label>
                    <Input id="email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pw">Password</Label>
                      <button type="button" onClick={handleReset}
                        className="text-xs text-primary hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <PasswordInput id="pw" value={password}
                      onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sname">Full name</Label>
                    <Input id="sname" value={sName} onChange={(e) => setSName(e.target.value)} required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sdept">Department</Label>
                      <Input id="sdept" value={sDept} onChange={(e) => setSDept(e.target.value)} placeholder="CSE" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="flex rounded-md border p-1 text-sm">
                        <button type="button"
                          className={`flex-1 rounded px-2 py-1 ${sRole === "faculty" ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => setSRole("faculty")}>Faculty</button>
                        <button type="button"
                          className={`flex-1 rounded px-2 py-1 ${sRole === "admin" ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => setSRole("admin")}>Admin</button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semail">Email</Label>
                    <Input id="semail" type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spass">Password</Label>
                    <PasswordInput
                      id="spass"
                      value={sPass}
                      onChange={(e) => setSPass(e.target.value)}
                      required
                      title={PASSWORD_REQUIREMENT}
                    />
                    <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENT}.</p>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={busy}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    For demo: choose Admin to access the COE dashboard.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
