import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";

interface FacultyRow {
  id: string;
  name: string;
  email: string;
  department: string | null;
  evaluations: number;
  submitted: number;
}

export default function FacultyManagement() {
  const [rows, setRows] = useState<FacultyRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "faculty");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
    const { data: evals } = await supabase.from("evaluations").select("faculty_id,status").in("faculty_id", ids);
    const list: FacultyRow[] = (profiles ?? []).map((p) => {
      const mine = evals?.filter((e) => e.faculty_id === p.id) ?? [];
      return {
        id: p.id, name: p.name, email: p.email, department: p.department,
        evaluations: mine.length,
        submitted: mine.filter((e) => e.status === "submitted").length,
      };
    });
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) =>
    [r.name, r.email, r.department ?? ""].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Faculty</h1>
          <p className="text-muted-foreground">Manage faculty members and view their evaluation status.</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, department" className="pl-9" />
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No faculty found. Faculty members can register from the login page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Submitted</th>
                  <th className="pb-2">Pending</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3 text-muted-foreground">{r.email}</td>
                    <td className="py-3">{r.department || "—"}</td>
                    <td className="py-3">{r.evaluations}</td>
                    <td className="py-3"><Badge variant="secondary" className="bg-success/10 text-success">{r.submitted}</Badge></td>
                    <td className="py-3"><Badge variant="secondary" className="bg-warning/10 text-warning">{r.evaluations - r.submitted}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
