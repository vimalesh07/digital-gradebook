import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { toast } from "sonner";

function downloadCSV(filename: string, rows: any[]) {
  if (rows.length === 0) return toast.error("Nothing to export");
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [bySubject, setBySubject] = useState<any[]>([]);
  const [byFaculty, setByFaculty] = useState<any[]>([]);
  const [byStudent, setByStudent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sheets } = await supabase.from("answer_sheets").select("*");
      const { data: evals } = await supabase.from("evaluations").select("*");
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role","faculty");
      const ids = (roles ?? []).map((r) => r.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,name").in("id", ids)
        : { data: [] as any[] };

      // by subject
      const subjMap = new Map<string, any>();
      sheets?.forEach((s) => {
        const ev = evals?.find((e) => e.sheet_id === s.id);
        const k = s.subject_code;
        const cur = subjMap.get(k) ?? { subject: k, name: s.subject_name, sheets: 0, submitted: 0, totalMarks: 0, count: 0 };
        cur.sheets++;
        if (ev?.status === "submitted") {
          cur.submitted++;
          cur.totalMarks += Number(ev.total_marks);
          cur.count++;
        }
        subjMap.set(k, cur);
      });
      setBySubject(Array.from(subjMap.values()).map((r) => ({
        ...r, average: r.count ? (r.totalMarks / r.count).toFixed(2) : "—",
      })));

      // by faculty
      const facMap = new Map<string, any>();
      profs?.forEach((p) => facMap.set(p.id, { faculty: p.name, assigned: 0, submitted: 0 }));
      sheets?.forEach((s) => {
        if (s.assigned_faculty && facMap.has(s.assigned_faculty)) {
          facMap.get(s.assigned_faculty).assigned++;
        }
      });
      evals?.forEach((e) => {
        if (e.status === "submitted" && facMap.has(e.faculty_id)) {
          facMap.get(e.faculty_id).submitted++;
        }
      });
      setByFaculty(Array.from(facMap.values()));

      // by student
      const studs = sheets?.map((s) => {
        const ev = evals?.find((e) => e.sheet_id === s.id);
        return {
          register_no: s.register_no, subject: s.subject_code,
          marks: ev?.status === "submitted" ? Number(ev.total_marks) : "—",
          status: ev?.status ?? s.status,
        };
      }) ?? [];
      setByStudent(studs);
    })();
  }, []);

  const Section = ({ title, data, file }: { title: string; data: any[]; file: string }) => (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button size="sm" variant="outline" onClick={() => downloadCSV(file, data)}>
          <Download className="mr-2 h-4 w-4" />Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>{Object.keys(data[0]).map((k) => <th key={k} className="pb-2 capitalize">{k.replace(/_/g," ")}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  {Object.values(r).map((v, j) => <td key={j} className="py-2">{String(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Generate and export evaluation reports.</p>
      </div>

      <Tabs defaultValue="subject">
        <TabsList>
          <TabsTrigger value="subject">By Subject</TabsTrigger>
          <TabsTrigger value="faculty">By Faculty</TabsTrigger>
          <TabsTrigger value="student">By Student</TabsTrigger>
        </TabsList>
        <TabsContent value="subject" className="mt-4"><Section title="Subject-wise report" data={bySubject} file="subject-report.csv" /></TabsContent>
        <TabsContent value="faculty" className="mt-4"><Section title="Faculty-wise report" data={byFaculty} file="faculty-report.csv" /></TabsContent>
        <TabsContent value="student" className="mt-4"><Section title="Student marks report" data={byStudent} file="student-report.csv" /></TabsContent>
      </Tabs>
    </div>
  );
}
