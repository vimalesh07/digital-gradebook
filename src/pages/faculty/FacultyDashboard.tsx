import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { ClipboardList, CheckCircle2, Hourglass, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ assigned: 0, pending: 0, submitted: 0, draft: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: sheets } = await supabase.from("answer_sheets").select("*").eq("assigned_faculty", user.id).order("created_at", { ascending: false });
      const { data: evals } = await supabase.from("evaluations").select("*").eq("faculty_id", user.id);
      const submitted = evals?.filter((e) => e.status === "submitted").length ?? 0;
      const draft = evals?.filter((e) => e.status === "draft").length ?? 0;
      const assigned = sheets?.length ?? 0;
      setStats({ assigned, submitted, draft, pending: assigned - submitted });
      setRecent((sheets ?? []).slice(0, 6));
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Your assigned answer sheets at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Assigned" value={stats.assigned} icon={ClipboardList} tone="primary" />
        <StatCard title="Pending" value={stats.pending} icon={Hourglass} tone="warning" />
        <StatCard title="In draft" value={stats.draft} icon={Clock} tone="accent" />
        <StatCard title="Submitted" value={stats.submitted} icon={CheckCircle2} tone="success" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent assignments</h2>
          <Button asChild size="sm" variant="outline"><Link to="/faculty/papers">View all</Link></Button>
        </div>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing assigned yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((s) => (
              <Link key={s.id} to={`/faculty/evaluate/${s.id}`}
                className="group rounded-lg border bg-card p-4 transition hover:border-primary hover:shadow-md">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.subject_code}</p>
                <p className="mt-1 font-semibold group-hover:text-primary">{s.register_no}</p>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{s.subject_name}</p>
                <p className="mt-3 text-xs capitalize text-muted-foreground">{s.status.replace("_"," ")}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
