import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ArrowRight } from "lucide-react";

export default function MyPapers({ historyOnly = false }: { historyOnly?: boolean }) {
  const { user } = useAuth();
  const [sheets, setSheets] = useState<any[]>([]);
  const [evalsMap, setEvalsMap] = useState<Record<string, any>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase.from("answer_sheets").select("*").eq("assigned_faculty", user.id).order("created_at", { ascending: false });
      setSheets(s ?? []);
      const { data: ev } = await supabase.from("evaluations").select("*").eq("faculty_id", user.id);
      const m: Record<string, any> = {};
      ev?.forEach((e) => (m[e.sheet_id] = e));
      setEvalsMap(m);
    })();
  }, [user]);

  const filtered = sheets.filter((s) => {
    const ev = evalsMap[s.id];
    const status = ev?.status ?? s.status;
    if (historyOnly && status !== "submitted") return false;
    if (!historyOnly && status === "submitted" && filter === "all") {} // include all
    const m = `${s.register_no} ${s.subject_code} ${s.subject_name}`.toLowerCase().includes(q.toLowerCase());
    const f = filter === "all" ? true : status === filter;
    return m && f;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{historyOnly ? "Past Evaluations" : "Assigned Papers"}</h1>
        <p className="text-muted-foreground">{historyOnly ? "Submitted evaluations are read-only." : "Open a paper to begin digital evaluation."}</p>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
          </div>
          {!historyOnly && (
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="assigned">Not started</SelectItem>
                <SelectItem value="draft">In draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const ev = evalsMap[s.id];
              const status = ev?.status ?? s.status;
              return (
                <Link key={s.id} to={`/faculty/evaluate/${s.id}`}
                  className="group flex flex-col rounded-lg border bg-card p-4 transition hover:border-primary hover:shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{s.subject_code}</Badge>
                    <Badge variant="secondary" className={
                      status === "submitted" ? "bg-success/10 text-success" :
                      status === "draft" ? "bg-warning/10 text-warning" :
                      "bg-secondary"
                    }>{status.replace("_"," ")}</Badge>
                  </div>
                  <p className="font-semibold">{s.register_no}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{s.subject_name}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Exam: {new Date(s.exam_date).toLocaleDateString()} · Sem {s.semester}</p>
                  <div className="mt-3 flex items-center text-sm font-medium text-primary group-hover:underline">
                    {status === "submitted" ? "View" : "Evaluate"} <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
