import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function Monitoring() {
  const [rows, setRows] = useState<any[]>([]);
  const [overall, setOverall] = useState({ total: 0, done: 0 });

  useEffect(() => {
    (async () => {
      const { data: sheets } = await supabase.from("answer_sheets").select("id,assigned_faculty,status");
      const { data: evals } = await supabase.from("evaluations").select("faculty_id,status,total_marks,time_taken_seconds,sheet_id");
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role","faculty");
      const ids = (roles ?? []).map((r) => r.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,name,department").in("id", ids)
        : { data: [] as any[] };

      const list = (profs ?? []).map((p) => {
        const assigned = sheets?.filter((s) => s.assigned_faculty === p.id) ?? [];
        const evalsMine = evals?.filter((e) => e.faculty_id === p.id) ?? [];
        const submitted = evalsMine.filter((e) => e.status === "submitted");
        const avgTime = submitted.length
          ? Math.round(submitted.reduce((a, e) => a + (e.time_taken_seconds || 0), 0) / submitted.length / 60)
          : 0;
        return {
          id: p.id, name: p.name, department: p.department,
          assigned: assigned.length, submitted: submitted.length,
          pct: assigned.length ? Math.round((submitted.length / assigned.length) * 100) : 0,
          avgMins: avgTime,
        };
      });
      setRows(list);
      setOverall({
        total: sheets?.length ?? 0,
        done: evals?.filter((e) => e.status === "submitted").length ?? 0,
      });
    })();
  }, []);

  const pct = overall.total ? Math.round((overall.done / overall.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Evaluation Monitoring</h1>
        <p className="text-muted-foreground">Track progress per faculty and overall completion.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Overall progress</h2>
          <span className="text-sm font-medium">{overall.done} / {overall.total} ({pct}%)</span>
        </div>
        <Progress value={pct} className="mt-3 h-3" />
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Per-faculty progress</h2>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.department || "—"}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{r.submitted} / {r.assigned} submitted</p>
                    <p className="text-xs text-muted-foreground">avg {r.avgMins} min</p>
                  </div>
                </div>
                <Progress value={r.pct} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
