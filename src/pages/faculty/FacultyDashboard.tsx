import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, CheckCircle2, Hourglass, BarChart3, ArrowRight, FileSearch } from "lucide-react";
import { Link } from "react-router-dom";

const formatStatus = (status?: string) => (status ?? "assigned").replace("_", " ");

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ assigned: 0, pending: 0, submitted: 0, averageMarks: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: sheets } = await supabase.from("answer_sheets").select("*").eq("assigned_faculty", user.id).order("created_at", { ascending: false });
      const { data: evals } = await supabase.from("evaluations").select("*").eq("faculty_id", user.id);
      const submitted = evals?.filter((e) => e.status === "submitted").length ?? 0;
      const assigned = sheets?.length ?? 0;
      const marks = (evals ?? []).filter((e) => e.status === "submitted").map((e) => Number(e.total_marks) || 0);
      const averageMarks = marks.length ? Number((marks.reduce((sum, mark) => sum + mark, 0) / marks.length).toFixed(1)) : 0;
      setStats({ assigned, submitted, averageMarks, pending: Math.max(assigned - submitted, 0) });
      setRecent((sheets ?? []).slice(0, 6));
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3 rounded-lg">Online Exam Evaluation System</Badge>
          <h1 className="text-2xl font-bold md:text-3xl">Welcome back, faculty</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review assignments, finish pending papers, and track your evaluation velocity.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/faculty/history">Past Evaluations</Link>
          </Button>
          <Button asChild className="rounded-xl bg-primary hover:bg-primary/90">
            <Link to="/faculty/papers">Start Evaluation</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard title="Total Assigned Papers" value={stats.assigned} icon={ClipboardList} tone="primary" hint="All active allocations" />
            <StatCard title="Evaluated Papers" value={stats.submitted} icon={CheckCircle2} tone="success" hint="Submitted and locked" />
            <StatCard title="Pending Papers" value={stats.pending} icon={Hourglass} tone="warning" hint="Need evaluation" />
            <StatCard title="Average Marks Given" value={stats.averageMarks} icon={BarChart3} tone="accent" hint="Submitted papers only" />
          </>
        )}
      </div>

      <Card className="overflow-hidden rounded-xl border-border/70 shadow-soft">
        <div className="flex items-center justify-between border-b bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">Recent Assignments</h2>
            <p className="text-sm text-muted-foreground">The newest papers waiting in your queue.</p>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-xl"><Link to="/faculty/papers">View all</Link></Button>
        </div>
        {loading ? (
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSearch className="h-8 w-8" />
            </div>
            <h3 className="font-semibold">No assigned papers yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">New answer sheets will appear here as soon as the admin assigns them.</p>
            <Button asChild className="mt-4 rounded-xl"><Link to="/faculty/papers">Refresh Queue</Link></Button>
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((s) => (
              <Link key={s.id} to={`/faculty/evaluate/${s.id}`}
                className="group rounded-xl border bg-card p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-elegant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant="secondary" className="rounded-lg text-xs">{s.subject_code}</Badge>
                  <span className="text-xs capitalize text-muted-foreground">{formatStatus(s.status)}</span>
                </div>
                <p className="font-semibold group-hover:text-primary">{s.register_no}</p>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{s.subject_name}</p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary">
                  Start Evaluation <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
