import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function UploadSheet() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [registerNo, setRegisterNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [semester, setSemester] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    supabase.from("subjects").select("*").order("subject_code").then(({ data }) => setSubjects(data ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a PDF or image file");
    if (!registerNo || !subjectId || !examDate || !semester) return toast.error("Fill all fields");
    if (file.size > 25 * 1024 * 1024) return toast.error("Max 25MB");

    setBusy(true);
    try {
      const subj = subjects.find((s) => s.id === subjectId);
      const ext = file.name.split(".").pop();
      const path = `${subj.subject_code}/${registerNo}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("answer-sheets").upload(path, file);
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("answer_sheets").insert({
        register_no: registerNo,
        student_name: studentName || null,
        subject_id: subjectId,
        subject_code: subj.subject_code,
        subject_name: subj.subject_name,
        exam_date: examDate,
        semester: parseInt(semester),
        file_path: path,
        file_type: file.type,
        uploaded_by: user!.id,
      });
      if (insErr) throw insErr;

      await supabase.from("audit_logs").insert({
        user_id: user!.id, action: "upload_sheet", entity: "answer_sheet", details: { register_no: registerNo },
      });

      toast.success("Answer sheet uploaded");
      setRegisterNo(""); setStudentName(""); setSubjectId(""); setExamDate(""); setSemester(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Answer Sheet</h1>
        <p className="text-muted-foreground">Securely upload a scanned answer sheet (PDF / JPG / PNG).</p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Student register no.</Label>
            <Input value={registerNo} onChange={(e) => setRegisterNo(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Student name (optional)</Label>
            <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subjects.length === 0 && (
              <p className="text-xs text-muted-foreground">No subjects yet. Add one in Subjects.</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Exam date</Label>
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Semester</Label>
            <Input type="number" value={semester} onChange={(e) => setSemester(e.target.value)} required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Scanned file</Label>
            <Input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="bg-gradient-primary" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload sheet
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
