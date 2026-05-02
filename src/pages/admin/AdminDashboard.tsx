import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { FileStack, Users, Hourglass, CheckCircle2, BookOpen } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ sheets: 0, faculty: 0, pending: 0, completed: 0, subjects: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: sheets }, { count: subjects }, facultyRes, evals, recentSheets] = await Promise.all([
        supabase.from("answer_sheets").select("*", { count: "exact", head: true }),
        supabase.from("subjects").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact" }).eq("role", "faculty"),
        supabase.from("evaluations").select("status"),
        supabase.from("answer_sheets").select("id,register_no,subject_code,status,created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      const completed = evals.data?.filter((e) => e.status === "submitted").length ?? 0;
      const pending = (sheets ?? 0) - completed;
      setStats({
        sheets: sheets ?? 0,
        subjects: subjects ?? 0,
        faculty: facultyRes.count ?? 0,
        completed,
        pending: Math.max(pending, 0),
      });
      setRecent(recentSheets.data ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">COE Dashboard</h1>
        <p className="text-muted-foreground">Overview of evaluation activity across the institution.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Answer sheets" value={stats.sheets} icon={FileStack} tone="primary" />
        <StatCard title="Faculty" value={stats.faculty} icon={Users} tone="accent" />
        <StatCard title="Pending" value={stats.pending} icon={Hourglass} tone="warning" />
        <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} tone="success" />
        <StatCard title="Subjects" value={stats.subjects} icon={BookOpen} tone="primary" />
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-lg font-semibold">Recent uploads</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No answer sheets uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="pb-2">Register No.</th>
                  <th className="pb-2">Subject</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{r.register_no}</td>
                    <td className="py-2">{r.subject_code}</td>
                    <td className="py-2"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{r.status.replace("_"," ")}</span></td>
                    <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
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
