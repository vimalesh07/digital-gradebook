import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Profile() {
  const { user, role } = useAuth();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setName(data.name); setDepartment(data.department ?? ""); }
    });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ name, department }).eq("id", user!.id);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Profile updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground capitalize">Signed in as {role}</p>
      </div>
      <Card className="max-w-xl p-6">
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Department</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <Button type="submit" className="bg-gradient-primary" disabled={busy}>Save changes</Button>
        </form>
      </Card>
    </div>
  );
}
