import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { PASSWORD_REQUIREMENT, passwordSchema } from "@/lib/password";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = passwordSchema.safeParse(pw);
    if (!result.success) return toast.error(PASSWORD_REQUIREMENT);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); navigate("/login"); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-6 text-2xl font-bold">Set new password</h1>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">New password</Label>
            <PasswordInput
              id="pw"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              title={PASSWORD_REQUIREMENT}
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENT}.</p>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={busy}>Update password</Button>
        </form>
      </Card>
    </div>
  );
}
