import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Check,
  Expand,
  Highlighter,
  Loader2,
  Minus,
  PenLine,
  Plus,
  Save,
  Send,
  SquarePen,
  Trash2,
  Underline,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Tool = "tick" | "cross" | "underline" | "highlight" | "pen";
type Point = { x: number; y: number };
type Stroke = { tool: Tool; color: string; size: number; points: Point[] };
type PageAnnotations = Record<number, Stroke[]>;
type PageComments = Record<number, string>;
type QMark = { id?: string; question_no: string; section: string; max_marks: number; obtained_marks: number };

const TOOL_META: Record<Tool, { color: string; size: number }> = {
  tick: { color: "#16a34a", size: 3 },
  cross: { color: "#dc2626", size: 3 },
  underline: { color: "#4f46e5", size: 4 },
  highlight: { color: "#f59e0b", size: 14 },
  pen: { color: "#111827", size: 2.5 },
};

const defaultQuestions = () =>
  Array.from({ length: 5 }).map((_, index) => ({
    question_no: `Q${index + 1}`,
    section: "A",
    max_marks: 10,
    obtained_marks: 0,
  }));

const countPdfPagesFromUrl = async (url: string) => {
  const response = await fetch(url);
  const text = await response.text();
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return Math.max(matches?.length ?? 0, 1);
};

export default function EvaluateSheet() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [sheet, setSheet] = useState<any>(null);
  const [evalRow, setEvalRow] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [pageCount, setPageCount] = useState(6);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>("pen");
  const [annotations, setAnnotations] = useState<PageAnnotations>({});
  const [comments, setComments] = useState<PageComments>({});
  const [marks, setMarks] = useState<QMark[]>(defaultQuestions);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startedAt] = useState(Date.now());

  const isLocked = evalRow?.status === "submitted";
  const activeStrokes = annotations[page] ?? [];
  const grandTotal = marks.reduce((sum, mark) => sum + (Number(mark.obtained_marks) || 0), 0);
  const grandMax = marks.reduce((sum, mark) => sum + (Number(mark.max_marks) || 0), 0);
  const pdfSrc = useMemo(() => fileUrl ? `${fileUrl}#page=${page}&zoom=${Math.round(zoom * 100)}&toolbar=0&navpanes=0` : "", [fileUrl, page, zoom]);

  useEffect(() => {
    if (!sheetId || !user) return;
    (async () => {
      const { data: s } = await supabase.from("answer_sheets").select("*").eq("id", sheetId).maybeSingle();
      if (!s) {
        toast.error("Sheet not found");
        navigate("/faculty");
        return;
      }
      setSheet(s);

      const { data: signed } = await supabase.storage.from("answer-sheets").createSignedUrl(s.file_path, 3600);
      if (signed?.signedUrl) {
        setFileUrl(signed.signedUrl);
        countPdfPagesFromUrl(signed.signedUrl).then(setPageCount).catch(() => setPageCount(6));
      }

      let { data: ev } = await supabase.from("evaluations").select("*").eq("sheet_id", sheetId).maybeSingle();
      if (!ev) {
        const { data: created, error } = await supabase.from("evaluations").insert({
          sheet_id: sheetId,
          faculty_id: user.id,
          max_marks: 50,
        }).select().single();
        if (error) throw error;
        ev = created;
        await supabase.from("answer_sheets").update({ status: "in_progress" }).eq("id", sheetId);
      }
      setEvalRow(ev);

      const { data: qm } = await supabase.from("question_marks").select("*").eq("evaluation_id", ev.id).order("created_at");
      if (qm?.length) {
        setMarks(qm.map((q: any) => ({
          id: q.id,
          question_no: q.question_no,
          section: q.section ?? "A",
          max_marks: Number(q.max_marks),
          obtained_marks: Number(q.obtained_marks),
        })));
      }

      const { data: annRows } = await supabase.from("annotations").select("*").eq("evaluation_id", ev.id);
      const nextAnnotations: PageAnnotations = {};
      const nextComments: PageComments = {};
      annRows?.forEach((row: any) => {
        const data = row.data as any;
        nextAnnotations[row.page_no] = Array.isArray(data?.strokes) ? data.strokes : [];
        if (typeof data?.comment === "string") nextComments[row.page_no] = data.comment;
      });
      setAnnotations(nextAnnotations);
      setComments(nextComments);
    })().catch((error) => toast.error(error.message ?? "Unable to load evaluation"));
  }, [navigate, sheetId, user]);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    activeStrokes.forEach((stroke) => drawStroke(ctx, stroke));
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    redraw();
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [page, zoom, activeStrokes.length]);

  useEffect(() => { redraw(); }, [annotations, page]);

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const p = stroke.points[0];
    if (!p) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = stroke.tool === "highlight" ? 0.35 : 1;

    if (stroke.tool === "tick") {
      ctx.beginPath();
      ctx.moveTo(p.x - 12, p.y);
      ctx.lineTo(p.x - 3, p.y + 10);
      ctx.lineTo(p.x + 15, p.y - 12);
      ctx.stroke();
    } else if (stroke.tool === "cross") {
      ctx.beginPath();
      ctx.moveTo(p.x - 12, p.y - 12);
      ctx.lineTo(p.x + 12, p.y + 12);
      ctx.moveTo(p.x + 12, p.y - 12);
      ctx.lineTo(p.x - 12, p.y + 12);
      ctx.stroke();
    } else {
      ctx.beginPath();
      stroke.points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const getPos = (event: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const commitStroke = (stroke: Stroke) => {
    setAnnotations((prev) => ({ ...prev, [page]: [...(prev[page] ?? []), stroke] }));
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (isLocked) return;
    const point = getPos(event);
    const meta = TOOL_META[tool];
    if (tool === "tick" || tool === "cross") {
      commitStroke({ tool, color: meta.color, size: meta.size, points: [point] });
      return;
    }
    drawingRef.current = true;
    currentStrokeRef.current = { tool, color: meta.color, size: meta.size, points: [point] };
    commitStroke(currentStrokeRef.current);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drawingRef.current || !currentStrokeRef.current || isLocked) return;
    currentStrokeRef.current.points.push(getPos(event));
    setAnnotations((prev) => {
      const pageStrokes = [...(prev[page] ?? [])];
      pageStrokes[pageStrokes.length - 1] = { ...currentStrokeRef.current! };
      return { ...prev, [page]: pageStrokes };
    });
  };

  const onPointerUp = () => {
    drawingRef.current = false;
    currentStrokeRef.current = null;
  };

  const persist = async (silent = false) => {
    if (!evalRow || isLocked) return;
    for (const mark of marks) {
      if (Number(mark.obtained_marks) > Number(mark.max_marks)) {
        toast.error(`${mark.question_no}: marks exceed maximum`);
        throw new Error("Invalid marks");
      }
    }
    setSaving(true);
    try {
      await supabase.from("question_marks").delete().eq("evaluation_id", evalRow.id);
      if (marks.length) {
        const { error } = await supabase.from("question_marks").insert(marks.map((mark) => ({
          evaluation_id: evalRow.id,
          question_no: mark.question_no,
          section: mark.section,
          max_marks: Number(mark.max_marks),
          obtained_marks: Number(mark.obtained_marks),
        })));
        if (error) throw error;
      }

      await supabase.from("annotations").delete().eq("evaluation_id", evalRow.id);
      const rows = Array.from({ length: pageCount }).map((_, index) => {
        const pageNo = index + 1;
        return {
          evaluation_id: evalRow.id,
          page_no: pageNo,
          data: { strokes: annotations[pageNo] ?? [], comment: comments[pageNo] ?? "" } as any,
        };
      }).filter((row) => (row.data.strokes.length || row.data.comment));
      if (rows.length) {
        const { error } = await supabase.from("annotations").insert(rows);
        if (error) throw error;
      }

      const { error } = await supabase.from("evaluations").update({
        total_marks: grandTotal,
        max_marks: grandMax || 50,
      }).eq("id", evalRow.id);
      if (error) throw error;
      if (!silent) toast.success("Evaluation progress saved");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!evalRow || isLocked) return;
    const timer = window.setInterval(() => persist(true).catch(() => undefined), 30000);
    return () => window.clearInterval(timer);
  }, [evalRow, isLocked, annotations, comments, marks, pageCount]);

  const submitFinal = async () => {
    if (!evalRow || isLocked) return;
    setBusy(true);
    try {
      await persist(true);
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      const { error } = await supabase.from("evaluations").update({
        total_marks: grandTotal,
        max_marks: grandMax || 50,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        time_taken_seconds: seconds,
      }).eq("id", evalRow.id);
      if (error) throw error;
      await supabase.from("answer_sheets").update({ status: "submitted" }).eq("id", sheetId);
      await supabase.from("audit_logs").insert([
        {
          user_id: user!.id,
          action: "evaluation_completed",
          entity: "evaluation",
          entity_id: evalRow.id,
          details: { register_no: sheet.register_no, subject_code: sheet.subject_code, total_marks: grandTotal, max_marks: grandMax },
        },
        {
          user_id: user!.id,
          action: "marks_provided",
          entity: "answer_sheet",
          entity_id: sheetId,
          details: {
            register_no: sheet.register_no,
            subject_code: sheet.subject_code,
            obtained_marks: grandTotal,
            total_marks: grandMax || 50,
            provided_to_user: true,
          },
        },
      ]);
      toast.success("Evaluation submitted and marks provided.");
      navigate("/faculty/history");
    } catch (error: any) {
      toast.error(error.message ?? "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  const updateMark = (index: number, key: keyof QMark, value: string | number) =>
    setMarks((prev) => prev.map((mark, i) => i === index ? { ...mark, [key]: value } : mark));

  const removeLastAnnotation = () =>
    setAnnotations((prev) => ({ ...prev, [page]: (prev[page] ?? []).slice(0, -1) }));

  if (!sheet) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading evaluation workspace</div>;
  }

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] flex-col overflow-hidden md:-m-6">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-4 py-3">
        <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => navigate(-1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{sheet.register_no} <span className="text-muted-foreground">- {sheet.subject_code}</span></p>
          <p className="truncate text-xs text-muted-foreground">{sheet.subject_name} - 6-page / 50-mark evaluation workflow</p>
        </div>
        <Badge className="ml-0 rounded-lg md:ml-2" variant={isLocked ? "secondary" : "default"}>{isLocked ? "Completed" : "In Evaluation"}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{saving ? "Auto-saving..." : "Auto-save every 30s"}</span>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => persist()} disabled={isLocked || saving}>
            <Save className="mr-1 h-4 w-4" />Save
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90" disabled={isLocked || busy}>
                <Send className="mr-1 h-4 w-4" />Submit Marks
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Submit evaluated answer sheet?</AlertDialogTitle>
                <AlertDialogDescription>
                  This stores marks, annotations, and remarks permanently, then provides the final marks in completed history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction className="rounded-xl bg-primary hover:bg-primary/90" onClick={submitFinal}>Submit Evaluation</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_380px]">
        <div className="grid min-h-0 bg-muted/30 md:grid-cols-[96px_1fr]">
          <aside className="hidden overflow-y-auto border-r bg-card p-3 md:block">
            <div className="space-y-2">
              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={index}
                  className={`flex aspect-[3/4] w-full items-center justify-center rounded-xl border text-sm font-semibold transition hover:border-primary hover:text-primary ${page === index + 1 ? "border-primary bg-primary/10 text-primary" : "bg-background"}`}
                  onClick={() => setPage(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b bg-card/90 px-3 py-2">
              {([
                ["tick", Check],
                ["cross", X],
                ["underline", Underline],
                ["highlight", Highlighter],
                ["pen", PenLine],
              ] as const).map(([id, Icon]) => (
                <Button key={id} size="icon" variant={tool === id ? "default" : "ghost"} className="rounded-xl" onClick={() => setTool(id)} disabled={isLocked} title={id}>
                  <Icon className="h-4 w-4" />
                </Button>
              ))}
              <Button size="icon" variant="ghost" className="rounded-xl" onClick={removeLastAnnotation} disabled={isLocked}><Trash2 className="h-4 w-4" /></Button>
              <div className="mx-1 h-6 w-px bg-border" />
              <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
              <span className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><Minus className="mr-1 h-4 w-4" />Page</Button>
                <span className="text-sm font-medium">{page} / {pageCount}</span>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Page <Plus className="ml-1 h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => viewerRef.current?.requestFullscreen()}><Expand className="h-4 w-4" /></Button>
              </div>
            </div>

            <div ref={viewerRef} className="relative flex-1 overflow-auto bg-muted p-4">
              <div className="relative mx-auto h-[1040px] max-w-4xl overflow-hidden rounded-xl border bg-white shadow-elegant" style={{ width: `${Math.round(820 * zoom)}px` }}>
                {pdfSrc ? (
                  <iframe key={pdfSrc} src={pdfSrc} title="PDF answer sheet" className="absolute inset-0 h-full w-full bg-white" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">Loading PDF...</div>
                )}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="flex min-h-0 flex-col border-l bg-background">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Smart Marks Panel</h2>
                <p className="text-xs text-muted-foreground">Questions inferred for a 50-mark paper. Edit as needed.</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl" disabled={isLocked} onClick={() => setMarks((prev) => [...prev, { question_no: `Q${prev.length + 1}`, section: "A", max_marks: 10, obtained_marks: 0 }])}>
                <Plus className="mr-1 h-4 w-4" />Question
              </Button>
            </div>
            <div className="mt-3 rounded-xl border bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">Obtained / Total Marks</p>
              <p className="text-2xl font-bold text-primary">{grandTotal} <span className="text-base text-muted-foreground">/ {grandMax || 50}</span></p>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {marks.map((mark, index) => {
              const over = Number(mark.obtained_marks) > Number(mark.max_marks);
              return (
                <Card key={index} className={`rounded-xl p-3 ${over ? "border-destructive" : ""}`}>
                  <div className="grid grid-cols-12 gap-2">
                    <Input className="col-span-3 rounded-xl" value={mark.question_no} disabled={isLocked} onChange={(e) => updateMark(index, "question_no", e.target.value)} aria-label="Question number" />
                    <Input className="col-span-2 rounded-xl" value={mark.section} disabled={isLocked} onChange={(e) => updateMark(index, "section", e.target.value.toUpperCase())} aria-label="Section" />
                    <Input className="col-span-3 rounded-xl" type="number" min={0} value={mark.max_marks} disabled={isLocked} onChange={(e) => updateMark(index, "max_marks", Number(e.target.value))} aria-label="Maximum marks" />
                    <Input className="col-span-3 rounded-xl" type="number" min={0} value={mark.obtained_marks} disabled={isLocked} onChange={(e) => updateMark(index, "obtained_marks", Number(e.target.value))} aria-label="Obtained marks" />
                    <Button size="icon" variant="ghost" className="col-span-1 rounded-xl" disabled={isLocked} onClick={() => setMarks((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  {over && <p className="mt-2 text-xs text-destructive">Obtained marks cannot exceed max marks.</p>}
                </Card>
              );
            })}

            <Card className="rounded-xl p-3">
              <div className="mb-2 flex items-center gap-2">
                <SquarePen className="h-4 w-4 text-primary" />
                <h3 className="font-medium">Page {page} Remarks</h3>
              </div>
              <Textarea
                className="min-h-28 rounded-xl"
                value={comments[page] ?? ""}
                disabled={isLocked}
                onChange={(e) => setComments((prev) => ({ ...prev, [page]: e.target.value }))}
                placeholder="Add faculty remarks for this page or answer."
              />
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
