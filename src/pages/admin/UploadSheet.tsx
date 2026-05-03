import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, CheckCircle2, FileText, Loader2, Plus, Search, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

type UploadItem = {
  id: string;
  file: File;
  paperId: string;
  registerNo: string;
  studentName: string;
  totalPages: number;
  progress: number;
  status: "ready" | "uploading" | "uploaded" | "error";
  error?: string;
};

const makePaperId = () => `PPR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const extractFromName = (fileName: string) => {
  const base = fileName.replace(/\.pdf$/i, "");
  const parts = base.split(/[_\-\s]+/).filter(Boolean);
  const registerNo = parts.find((part) => /[A-Z0-9]{6,}/i.test(part)) ?? base.slice(0, 18).toUpperCase();
  const studentName = parts
    .filter((part) => part.toLowerCase() !== registerNo.toLowerCase() && !/^[A-Z]{2,}\d{2,}$/i.test(part))
    .slice(0, 3)
    .join(" ");
  return { registerNo, studentName };
};

const countPdfPages = async (file: File) => {
  const text = await file.text();
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return Math.max(matches?.length ?? 0, 1);
};

export default function UploadSheet() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const [subjectId, setSubjectId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [semester, setSemester] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSemester, setNewSubjectSemester] = useState("");

  const selectedSubject = useMemo(() => subjects.find((s) => s.id === subjectId), [subjectId, subjects]);

  const load = async () => {
    const [{ data: subjectRows }, { data: sheetRows }] = await Promise.all([
      supabase.from("subjects").select("*").order("subject_code"),
      supabase.from("answer_sheets").select("*").order("created_at", { ascending: false }).limit(25),
    ]);
    setSubjects(subjectRows ?? []);
    setPapers(sheetRows ?? []);
  };

  useEffect(() => { load(); }, []);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: UploadItem[] = [];

    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      const { registerNo, studentName } = extractFromName(file.name);
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        next.push({ id, file, paperId: makePaperId(), registerNo, studentName, totalPages: 0, progress: 0, status: "error", error: "PDF only" });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        next.push({ id, file, paperId: makePaperId(), registerNo, studentName, totalPages: 0, progress: 0, status: "error", error: "Max 20MB" });
        continue;
      }
      const totalPages = await countPdfPages(file).catch(() => 6);
      next.push({ id, file, paperId: makePaperId(), registerNo, studentName, totalPages, progress: 0, status: "ready" });
    }

    setQueue((prev) => [...prev, ...next]);
  };

  const updateQueue = (id: string, patch: Partial<UploadItem>) =>
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addSubject = async () => {
    if (!newSubjectCode || !newSubjectName || !newSubjectSemester) {
      return toast.error("Subject code, name, and semester are required");
    }

    const { data, error } = await supabase.from("subjects").insert({
      subject_code: newSubjectCode.trim().toUpperCase(),
      subject_name: newSubjectName.trim(),
      semester: parseInt(newSubjectSemester, 10),
    }).select("*").single();

    if (error) return toast.error(error.message);
    setSubjects((prev) => [...prev, data].sort((a, b) => a.subject_code.localeCompare(b.subject_code)));
    setSubjectId(data.id);
    setSemester(String(data.semester));
    setNewSubjectCode("");
    setNewSubjectName("");
    setNewSubjectSemester("");
    toast.success("Subject added and selected");
  };

  const uploadAll = async () => {
    if (!selectedSubject || !examDate || !semester) return toast.error("Select subject, exam date, and semester");
    const uploadable = queue.filter((item) => item.status === "ready");
    if (!uploadable.length) return toast.error("Add at least one valid PDF");

    setBusy(true);
    try {
      for (const item of uploadable) {
        updateQueue(item.id, { status: "uploading", progress: 12 });
        const path = `${selectedSubject.subject_code}/${item.paperId}-${item.registerNo}.pdf`;
        const progressTimer = window.setInterval(() => {
          setQueue((prev) =>
            prev.map((row) =>
              row.id === item.id && row.status === "uploading"
                ? { ...row, progress: Math.min(row.progress + 12, 88) }
                : row,
            ),
          );
        }, 350);

        const { error: upErr } = await supabase.storage.from("answer-sheets").upload(path, item.file, {
          contentType: "application/pdf",
          upsert: false,
        });
        window.clearInterval(progressTimer);
        if (upErr) {
          updateQueue(item.id, { status: "error", progress: 100, error: upErr.message });
          continue;
        }

        const { data: inserted, error: insErr } = await supabase.from("answer_sheets").insert({
          register_no: item.registerNo,
          student_name: item.studentName || null,
          subject_id: selectedSubject.id,
          subject_code: selectedSubject.subject_code,
          subject_name: selectedSubject.subject_name,
          exam_date: examDate,
          semester: parseInt(semester, 10),
          file_path: path,
          file_type: "application/pdf",
          uploaded_by: user!.id,
        }).select("id").single();
        if (insErr) {
          updateQueue(item.id, { status: "error", progress: 100, error: insErr.message });
          continue;
        }

        await supabase.from("audit_logs").insert({
          user_id: user!.id,
          action: "upload_sheet",
          entity: "answer_sheet",
          entity_id: inserted?.id,
          details: {
            paper_id: item.paperId,
            register_no: item.registerNo,
            total_pages: item.totalPages,
            file_size: item.file.size,
          },
        });
        updateQueue(item.id, { status: "uploaded", progress: 100 });
      }

      toast.success("Upload queue processed");
      load();
    } finally {
      setBusy(false);
    }
  };

  const filteredPapers = papers.filter((paper) =>
    `${paper.register_no} ${paper.student_name ?? ""} ${paper.subject_code} ${paper.subject_name}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3 rounded-lg">Admin / COE Upload</Badge>
          <h1 className="text-2xl font-bold md:text-3xl">Answer Sheet Upload</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload multiple PDF answer sheets, validate metadata, and track every paper in the evaluation pipeline.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl bg-primary hover:bg-primary/90" onClick={uploadAll} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Queue
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/admin/assign">Assign for Evaluation <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-xl border-border/70 p-4 shadow-soft">
          <p className="text-xs font-medium uppercase text-muted-foreground">Step 1</p>
          <h2 className="mt-1 font-semibold">Upload answer sheets</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add one or more PDF answer sheets to secure storage.</p>
        </Card>
        <Card className="rounded-xl border-border/70 p-4 shadow-soft">
          <p className="text-xs font-medium uppercase text-muted-foreground">Step 2</p>
          <h2 className="mt-1 font-semibold">Assign to faculty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Send uploaded papers to faculty for evaluation.</p>
        </Card>
        <Card className="rounded-xl border-border/70 p-4 shadow-soft">
          <p className="text-xs font-medium uppercase text-muted-foreground">Step 3</p>
          <h2 className="mt-1 font-semibold">Submit and provide marks</h2>
          <p className="mt-1 text-sm text-muted-foreground">Submitted marks are stored and visible in completed evaluation history.</p>
        </Card>
      </div>

      <Card className="rounded-xl border-border/70 p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Subject</Label>
            <select
              value={subjectId}
              onChange={(event) => {
                const id = event.target.value;
                setSubjectId(id);
                const subject = subjects.find((item) => item.id === id);
                if (subject?.semester) setSemester(String(subject.semester));
              }}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Select subject"
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
              ))}
            </select>
            {subjects.length === 0 && (
              <p className="text-xs text-warning">No subjects found. Add one below, then upload.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Exam date</Label>
            <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Semester</Label>
            <Input type="number" min={1} value={semester} onChange={(e) => setSemester(e.target.value)} className="rounded-xl" />
          </div>
        </div>

        <div className="mt-5 rounded-xl border bg-muted/20 p-4">
          <div className="mb-3">
            <h2 className="font-semibold">Quick Add Subject</h2>
            <p className="text-sm text-muted-foreground">Use this if the subject is not available in the dropdown.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_2fr_1fr_auto]">
            <Input value={newSubjectCode} onChange={(e) => setNewSubjectCode(e.target.value)} placeholder="Code e.g. CS301" className="rounded-xl" />
            <Input value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject name" className="rounded-xl" />
            <Input type="number" min={1} value={newSubjectSemester} onChange={(e) => setNewSubjectSemester(e.target.value)} placeholder="Sem" className="rounded-xl" />
            <Button type="button" variant="outline" className="rounded-xl" onClick={addSubject}>
              <Plus className="mr-2 h-4 w-4" />Add
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed bg-muted/30 p-6 text-center">
          <FileText className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 font-semibold">Drop or choose PDF answer sheets</h2>
          <p className="mt-1 text-sm text-muted-foreground">PDF only. Up to 20MB per file. Metadata is inferred from filename and PDF structure.</p>
          <Input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            multiple
            className="mx-auto mt-4 max-w-md rounded-xl"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>

        {queue.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paper ID</TableHead>
                  <TableHead>File / Metadata</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.paperId}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.file.name}</div>
                      <div className="text-xs text-muted-foreground">{item.registerNo} {item.studentName ? `- ${item.studentName}` : ""}</div>
                    </TableCell>
                    <TableCell>{item.totalPages || "-"}</TableCell>
                    <TableCell className="min-w-40"><Progress value={item.progress} className="h-2" /></TableCell>
                    <TableCell>
                      {item.status === "uploaded" ? (
                        <Badge className="rounded-lg bg-success text-success-foreground"><CheckCircle2 className="mr-1 h-3 w-3" />Uploaded</Badge>
                      ) : item.status === "error" ? (
                        <Badge variant="destructive" className="rounded-lg"><XCircle className="mr-1 h-3 w-3" />{item.error}</Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-lg capitalize">{item.status}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden rounded-xl border-border/70 shadow-soft">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Uploaded Papers</h2>
            <p className="text-sm text-muted-foreground">Recently uploaded answer sheets stored in secure cloud storage.</p>
          </div>
          <div className="relative md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search register or subject" className="rounded-xl pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Register No.</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Next Step</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPapers.map((paper) => (
                <TableRow key={paper.id}>
                  <TableCell className="font-medium">{paper.register_no}</TableCell>
                  <TableCell>{paper.student_name ?? "Not extracted"}</TableCell>
                  <TableCell>{paper.subject_code}<div className="text-xs text-muted-foreground">{paper.subject_name}</div></TableCell>
                  <TableCell><Badge variant="secondary" className="rounded-lg capitalize">{paper.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(paper.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" className="rounded-xl" variant={paper.status === "submitted" ? "outline" : "default"}>
                      <Link to="/admin/assign">
                        {paper.status === "submitted" ? "View Status" : "Assign / Evaluate"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
