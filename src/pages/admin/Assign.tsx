import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bell, FileSearch, Search } from "lucide-react";
import { toast } from "sonner";

const displayStatus = (status: string) => {
  if (status === "submitted") return "Completed";
  if (status === "in_progress") return "In Evaluation";
  return "Pending";
};

const statusClassName = (status: string) => {
  if (status === "submitted") return "bg-success/10 text-success hover:bg-success/10";
  if (status === "in_progress") return "bg-primary/10 text-primary hover:bg-primary/10";
  return "bg-warning/10 text-warning hover:bg-warning/10";
};

export default function Assign() {
  const [sheets, setSheets] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const { data: s } = await supabase.from("answer_sheets").select("*").order("created_at", { ascending: false });
    setSheets(s ?? []);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "faculty");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,name,email,department").in("id", ids);
      setFaculty(profs ?? []);
    }
  };

  useEffect(() => { load(); }, []);

  const facultyById = useMemo(() => {
    const map: Record<string, any> = {};
    faculty.forEach((f) => { map[f.id] = f; });
    return map;
  }, [faculty]);

  const assign = async (sheet: any, facultyId: string) => {
    const { error } = await supabase.from("answer_sheets")
      .update({ assigned_faculty: facultyId, status: "assigned" })
      .eq("id", sheet.id);
    if (error) return toast.error(error.message);

    await supabase.from("audit_logs").insert({
      user_id: facultyId,
      action: "paper_assigned",
      entity: "answer_sheet",
      entity_id: sheet.id,
      details: { register_no: sheet.register_no, subject_code: sheet.subject_code },
    });
    toast.success("Faculty notified about the assignment");
    load();
  };

  const filtered = sheets.filter((s) => {
    const facultyName = s.assigned_faculty ? facultyById[s.assigned_faculty]?.name ?? "" : "";
    const matches = `${s.register_no} ${s.subject_code} ${s.subject_name} ${facultyName}`.toLowerCase().includes(q.toLowerCase());
    const matchesFilter =
      filter === "all" ? true :
      filter === "unassigned" ? !s.assigned_faculty :
      filter === "pending" ? s.status === "uploaded" || s.status === "assigned" :
      filter === "in_progress" ? s.status === "in_progress" :
      s.status === "submitted";
    return matches && matchesFilter;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3 rounded-lg">Faculty Assignment</Badge>
        <h1 className="text-2xl font-bold md:text-3xl">Assign Uploaded Papers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Assign uploaded PDFs to faculty. Faculty access remains limited to their own assigned papers.</p>
      </div>

      <Card className="overflow-hidden rounded-xl border-border/70 shadow-soft">
        <div className="flex flex-col gap-3 border-b bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search register, subject, faculty" className="rounded-xl pl-9" />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="rounded-xl md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Evaluation</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSearch className="h-8 w-8" />
            </div>
            <h2 className="font-semibold">No papers match</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Upload answer sheets first or adjust your search and status filters.</p>
            <Button className="mt-4 rounded-xl" variant="outline" onClick={() => { setQ(""); setFilter("all"); }}>Clear Filters</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Register</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Faculty</TableHead>
                  <TableHead>Assign / Reassign</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="transition hover:bg-primary/5">
                    <TableCell className="font-medium">{s.register_no}</TableCell>
                    <TableCell>{s.subject_code}<div className="text-xs text-muted-foreground">{s.subject_name}</div></TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`rounded-lg ${statusClassName(s.status)}`}>{displayStatus(s.status)}</Badge>
                    </TableCell>
                    <TableCell>{s.assigned_faculty ? facultyById[s.assigned_faculty]?.name ?? "Assigned" : <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select value={s.assigned_faculty ?? ""} onValueChange={(v) => assign(s, v)} disabled={s.status === "submitted"}>
                          <SelectTrigger className="w-60 rounded-xl"><SelectValue placeholder="Choose faculty" /></SelectTrigger>
                          <SelectContent>
                            {faculty.map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.name} {f.department ? `- ${f.department}` : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {s.assigned_faculty && <Bell className="h-4 w-4 text-primary" aria-label="Faculty has been notified" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
