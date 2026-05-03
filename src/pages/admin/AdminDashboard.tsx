import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, CheckCircle2, FileStack, Hourglass, Users } from "lucide-react";

const statusLabel = (status: string) => {
  if (status === "submitted") return "Completed";
  if (status === "in_progress") return "In Evaluation";
  return "Pending";
};

export default function AdminDashboard() {
  const [sheets, setSheets] = useState<any[]>([]);
  const [evals, setEvals] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: sheetRows }, { data: evalRows }, { data: roles }] = await Promise.all([
        supabase.from("answer_sheets").select("*").order("created_at", { ascending: false }),
        supabase.from("evaluations").select("*"),
        supabase.from("user_roles").select("user_id").eq("role", "faculty"),
      ]);
      setSheets(sheetRows ?? []);
      setEvals(evalRows ?? []);

      const ids = (roles ?? []).map((role) => role.user_id);
      if (ids.length) {
        const { data: profiles } = await supabase.from("profiles").select("id,name,department,email").in("id", ids);
        setFaculty(profiles ?? []);
      }
    })();
  }, []);

  const analytics = useMemo(() => {
    const completed = sheets.filter((sheet) => sheet.status === "submitted").length;
    const pending = sheets.filter((sheet) => sheet.status !== "submitted").length;
    const submittedEvals = evals.filter((row) => row.status === "submitted");
    const averageMarks = submittedEvals.length
      ? (submittedEvals.reduce((sum, row) => sum + Number(row.total_marks || 0), 0) / submittedEvals.length).toFixed(1)
      : "0";
    const facultyCounts = faculty.map((member) => {
      const mine = evals.filter((row) => row.faculty_id === member.id);
      return {
        ...member,
        assigned: sheets.filter((sheet) => sheet.assigned_faculty === member.id).length,
        completed: mine.filter((row) => row.status === "submitted").length,
        average: mine.length ? (mine.reduce((sum, row) => sum + Number(row.total_marks || 0), 0) / mine.length).toFixed(1) : "0",
      };
    });
    return { completed, pending, averageMarks, facultyCounts };
  }, [evals, faculty, sheets]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3 rounded-lg">Analytics Dashboard</Badge>
        <h1 className="text-2xl font-bold md:text-3xl">COE Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload volume, pending evaluations, completion rate, faculty load, and marks statistics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Uploaded Papers" value={sheets.length} icon={FileStack} tone="primary" />
        <StatCard title="Pending Papers" value={analytics.pending} icon={Hourglass} tone="warning" />
        <StatCard title="Completed Papers" value={analytics.completed} icon={CheckCircle2} tone="success" />
        <StatCard title="Faculty Evaluators" value={faculty.length} icon={Users} tone="accent" />
        <StatCard title="Average Marks" value={analytics.averageMarks} icon={BarChart3} tone="primary" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-xl border-border/70 shadow-soft">
          <div className="border-b p-4">
            <h2 className="font-semibold">Recent Papers</h2>
            <p className="text-sm text-muted-foreground">Latest uploaded answer sheets across the evaluation workflow.</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Register No.</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.slice(0, 10).map((paper) => (
                  <TableRow key={paper.id}>
                    <TableCell className="font-medium">{paper.register_no}</TableCell>
                    <TableCell>{paper.subject_code}<div className="text-xs text-muted-foreground">{paper.subject_name}</div></TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-lg">{statusLabel(paper.status)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{new Date(paper.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-xl border-border/70 shadow-soft">
          <div className="border-b p-4">
            <h2 className="font-semibold">Faculty-wise Evaluation Count</h2>
            <p className="text-sm text-muted-foreground">Assigned, completed, and average marks by faculty.</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Avg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.facultyCounts.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}<div className="text-xs text-muted-foreground">{member.department || member.email}</div></TableCell>
                    <TableCell>{member.assigned}</TableCell>
                    <TableCell>{member.completed}</TableCell>
                    <TableCell>{member.average}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
