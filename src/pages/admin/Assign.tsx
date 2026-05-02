import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";

export default function Assign() {
  const [sheets, setSheets] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const { data: s } = await supabase.from("answer_sheets").select("*").order("created_at", { ascending: false });
    setSheets(s ?? []);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role","faculty");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,name,email,department").in("id", ids);
      setFaculty(profs ?? []);
    }
  };
  useEffect(() => { load(); }, []);

  const assign = async (sheetId: string, facultyId: string) => {
    const { error } = await supabase.from("answer_sheets")
      .update({ assigned_faculty: facultyId, status: "assigned" })
      .eq("id", sheetId);
    if (error) return toast.error(error.message);
    toast.success("Assigned");
    load();
  };

  const filtered = sheets.filter((s) => {
    const m = `${s.register_no} ${s.subject_code} ${s.subject_name}`.toLowerCase().includes(q.toLowerCase());
    const f = filter === "all" ? true : filter === "unassigned" ? !s.assigned_faculty : s.status === filter;
    return m && f;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Assign Faculty</h1>
        <p className="text-muted-foreground">Distribute uploaded sheets to faculty for evaluation.</p>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No sheets match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="pb-2">Register</th>
                  <th className="pb-2">Subject</th>
                  <th className="pb-2">Sem</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Assign to</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{s.register_no}</td>
                    <td className="py-3">{s.subject_code}<div className="text-xs text-muted-foreground">{s.subject_name}</div></td>
                    <td className="py-3">{s.semester}</td>
                    <td className="py-3"><Badge variant="secondary" className="capitalize">{s.status.replace("_"," ")}</Badge></td>
                    <td className="py-3">
                      <Select value={s.assigned_faculty ?? ""} onValueChange={(v) => assign(s.id, v)} disabled={s.status === "submitted"}>
                        <SelectTrigger className="w-56"><SelectValue placeholder="Choose faculty" /></SelectTrigger>
                        <SelectContent>
                          {faculty.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.name} <span className="text-xs text-muted-foreground">{f.department || ""}</span></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
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
