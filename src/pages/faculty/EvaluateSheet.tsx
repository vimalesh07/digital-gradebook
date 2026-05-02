import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Highlighter, Pen, Eraser, Undo2, Redo2,
  ZoomIn, ZoomOut, RotateCw, Save, Send, ArrowLeft, Plus, Trash2, Lock,
} from "lucide-react";
import { toast } from "sonner";

type Tool = "tick" | "cross" | "highlight" | "pen" | "eraser";
interface Stroke { tool: Tool; color: string; size: number; points: { x: number; y: number }[]; }
interface QMark { id?: string; question_no: string; section: string; max_marks: number; obtained_marks: number; }

const COLORS: Record<Tool, string> = {
  tick: "#16a34a", cross: "#dc2626", highlight: "#fde047", pen: "#1e3a8a", eraser: "#ffffff",
};

export default function EvaluateSheet() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sheet, setSheet] = useState<any>(null);
  const [evalRow, setEvalRow] = useState<any>(null);
  const [marks, setMarks] = useState<QMark[]>([]);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [tool, setTool] = useState<Tool>("pen");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(Date.now());
  const isLocked = evalRow?.status === "submitted";
  const isPdf = sheet?.file_type === "application/pdf";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);

  // Load sheet, eval, marks, signed URL
  useEffect(() => {
    if (!sheetId || !user) return;
    (async () => {
      const { data: s } = await supabase.from("answer_sheets").select("*").eq("id", sheetId).maybeSingle();
      if (!s) { toast.error("Sheet not found"); navigate("/faculty"); return; }
      setSheet(s);

      const { data: signed } = await supabase.storage.from("answer-sheets").createSignedUrl(s.file_path, 3600);
      if (signed) setFileUrl(signed.signedUrl);

      let { data: ev } = await supabase.from("evaluations").select("*").eq("sheet_id", sheetId).maybeSingle();
      if (!ev) {
        const { data: created, error } = await supabase.from("evaluations").insert({
          sheet_id: sheetId, faculty_id: user.id,
        }).select().single();
        if (error) { toast.error(error.message); return; }
        ev = created;
        await supabase.from("answer_sheets").update({ status: "in_progress" }).eq("id", sheetId);
      }
      setEvalRow(ev);

      const { data: qm } = await supabase.from("question_marks").select("*").eq("evaluation_id", ev.id).order("created_at");
      setMarks((qm ?? []).map((q: any) => ({
        id: q.id, question_no: q.question_no, section: q.section ?? "A",
        max_marks: Number(q.max_marks), obtained_marks: Number(q.obtained_marks),
      })));

      const { data: ann } = await supabase.from("annotations").select("*").eq("evaluation_id", ev.id).maybeSingle();
      if (ann?.data && Array.isArray((ann.data as any).strokes)) setStrokes((ann.data as any).strokes);
    })();
  }, [sheetId, user, navigate]);

  // Draw all strokes
  const redraw = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    strokes.forEach((s) => drawStroke(ctx, s));
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    if (s.tool === "tick" || s.tool === "cross") {
      const p = s.points[0]; if (!p) return;
      ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath();
      if (s.tool === "tick") {
        ctx.moveTo(p.x - 10, p.y); ctx.lineTo(p.x - 2, p.y + 8); ctx.lineTo(p.x + 12, p.y - 10);
      } else {
        ctx.moveTo(p.x - 10, p.y - 10); ctx.lineTo(p.x + 10, p.y + 10);
        ctx.moveTo(p.x + 10, p.y - 10); ctx.lineTo(p.x - 10, p.y + 10);
      }
      ctx.stroke();
      return;
    }
    ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (s.tool === "highlight") ctx.globalAlpha = 0.35; else ctx.globalAlpha = 1;
    ctx.beginPath();
    s.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  };

  useEffect(() => { redraw(); }, [strokes]);

  // Resize canvas to overlay
  useEffect(() => {
    const update = () => {
      const c = canvasRef.current; if (!c) return;
      const parent = c.parentElement; if (!parent) return;
      c.width = parent.clientWidth;
      c.height = parent.clientHeight;
      redraw();
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [fileUrl, zoom, rotation]);

  const getPos = (e: React.PointerEvent) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if (isLocked) return;
    drawingRef.current = true;
    const p = getPos(e);
    if (tool === "tick" || tool === "cross") {
      const s: Stroke = { tool, color: COLORS[tool], size: 3, points: [p] };
      setStrokes((prev) => [...prev, s]); setRedoStack([]);
      drawingRef.current = false;
      return;
    }
    const s: Stroke = {
      tool, color: COLORS[tool],
      size: tool === "highlight" ? 14 : tool === "eraser" ? 18 : 2.5,
      points: [p],
    };
    currentStrokeRef.current = s;
    setStrokes((prev) => [...prev, s]); setRedoStack([]);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    const p = getPos(e);
    currentStrokeRef.current.points.push(p);
    setStrokes((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = { ...currentStrokeRef.current! };
      return copy;
    });
  };

  const onUp = () => { drawingRef.current = false; currentStrokeRef.current = null; };

  const undo = () => setStrokes((prev) => {
    if (prev.length === 0) return prev;
    setRedoStack((r) => [...r, prev[prev.length - 1]]);
    return prev.slice(0, -1);
  });
  const redo = () => setRedoStack((r) => {
    if (r.length === 0) return r;
    setStrokes((s) => [...s, r[r.length - 1]]);
    return r.slice(0, -1);
  });

  const addQuestion = () =>
    setMarks((prev) => [...prev, { question_no: `Q${prev.length + 1}`, section: "A", max_marks: 10, obtained_marks: 0 }]);

  const removeQuestion = (idx: number) => setMarks((prev) => prev.filter((_, i) => i !== idx));

  const updateQ = (idx: number, key: keyof QMark, val: any) =>
    setMarks((prev) => prev.map((q, i) => i === idx ? { ...q, [key]: val } : q));

  const sectionTotals: Record<string, { obtained: number; max: number }> = {};
  marks.forEach((m) => {
    sectionTotals[m.section] = sectionTotals[m.section] ?? { obtained: 0, max: 0 };
    sectionTotals[m.section].obtained += Number(m.obtained_marks) || 0;
    sectionTotals[m.section].max += Number(m.max_marks) || 0;
  });
  const grandTotal = Object.values(sectionTotals).reduce((a, b) => a + b.obtained, 0);
  const grandMax = Object.values(sectionTotals).reduce((a, b) => a + b.max, 0);

  const persistMarks = async () => {
    if (!evalRow) return;
    for (const m of marks) {
      if (Number(m.obtained_marks) > Number(m.max_marks)) {
        throw new Error(`${m.question_no}: marks exceed maximum`);
      }
    }
    await supabase.from("question_marks").delete().eq("evaluation_id", evalRow.id);
    if (marks.length) {
      const { error } = await supabase.from("question_marks").insert(
        marks.map((m) => ({
          evaluation_id: evalRow.id, question_no: m.question_no, section: m.section,
          max_marks: m.max_marks, obtained_marks: m.obtained_marks,
        }))
      );
      if (error) throw error;
    }
    await supabase.from("annotations").delete().eq("evaluation_id", evalRow.id);
    if (strokes.length) {
      await supabase.from("annotations").insert({
        evaluation_id: evalRow.id, page_no: 1, data: { strokes } as any,
      });
    }
  };

  const saveDraft = async () => {
    if (isLocked) return;
    setBusy(true);
    try {
      await persistMarks();
      const { error } = await supabase.from("evaluations").update({
        total_marks: grandTotal, max_marks: grandMax || 100,
      }).eq("id", evalRow.id);
      if (error) throw error;
      toast.success("Draft saved");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const submitFinal = async () => {
    if (isLocked) return;
    if (marks.length === 0) return toast.error("Add at least one question");
    if (!confirm("Submit final evaluation? This locks editing.")) return;
    setBusy(true);
    try {
      await persistMarks();
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      const { error } = await supabase.from("evaluations").update({
        total_marks: grandTotal, max_marks: grandMax || 100,
        status: "submitted", submitted_at: new Date().toISOString(),
        time_taken_seconds: seconds,
      }).eq("id", evalRow.id);
      if (error) throw error;
      await supabase.from("answer_sheets").update({ status: "submitted" }).eq("id", sheetId);
      await supabase.from("audit_logs").insert({
        user_id: user!.id, action: "submit_evaluation", entity: "evaluation",
        entity_id: evalRow.id, details: { total: grandTotal, max: grandMax },
      });
      toast.success("Submitted and locked");
      navigate("/faculty");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  if (!sheet) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: "tick", icon: Check, label: "Tick" },
    { id: "cross", icon: X, label: "Cross" },
    { id: "highlight", icon: Highlighter, label: "Highlight" },
    { id: "pen", icon: Pen, label: "Pen" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
  ];

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col md:-m-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-card px-4 py-2">
        <Button size="sm" variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div>
          <p className="text-sm font-semibold">{sheet.register_no} <span className="text-muted-foreground">· {sheet.subject_code}</span></p>
          <p className="text-xs text-muted-foreground">{sheet.subject_name} · Sem {sheet.semester}</p>
        </div>
        {isLocked && <Badge className="ml-2 bg-success text-success-foreground"><Lock className="mr-1 h-3 w-3" />Locked</Badge>}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={saveDraft} disabled={isLocked || busy}>
            <Save className="mr-1 h-4 w-4" />Save draft
          </Button>
          <Button size="sm" className="bg-gradient-primary" onClick={submitFinal} disabled={isLocked || busy}>
            <Send className="mr-1 h-4 w-4" />Submit final
          </Button>
        </div>
      </div>

      <div className="grid flex-1 overflow-hidden md:grid-cols-[1fr_380px]">
        {/* LEFT: viewer + canvas */}
        <div className="flex flex-col border-r bg-muted/30">
          {/* viewer toolbar */}
          <div className="flex flex-wrap items-center gap-1 border-b bg-card/80 px-3 py-2 backdrop-blur">
            {tools.map((t) => (
              <Button key={t.id} size="icon" variant={tool === t.id ? "default" : "ghost"}
                className={tool === t.id ? "bg-primary" : ""}
                onClick={() => setTool(t.id)} disabled={isLocked} title={t.label}>
                <t.icon className="h-4 w-4" />
              </Button>
            ))}
            <div className="mx-1 h-6 w-px bg-border" />
            <Button size="icon" variant="ghost" onClick={undo} disabled={isLocked}><Undo2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={redo} disabled={isLocked}><Redo2 className="h-4 w-4" /></Button>
            <div className="mx-1 h-6 w-px bg-border" />
            <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
            <span className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setRotation((r) => (r + 90) % 360)}><RotateCw className="h-4 w-4" /></Button>
          </div>

          {/* viewer + overlay */}
          <div className="relative flex-1 overflow-auto p-4">
            <div className="relative mx-auto" style={{ width: `${zoom * 100}%`, maxWidth: 1200 }}>
              <div className="relative" style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center" }}>
                {fileUrl ? (
                  isPdf ? (
                    <iframe src={fileUrl} title="Answer sheet"
                      className="h-[1100px] w-full rounded-md border bg-white shadow-elegant" />
                  ) : (
                    <img src={fileUrl} alt="Answer sheet" className="w-full rounded-md border bg-white shadow-elegant" />
                  )
                ) : (
                  <div className="flex h-96 items-center justify-center rounded-md border bg-white">Loading sheet…</div>
                )}
                {!isPdf && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerLeave={onUp}
                  />
                )}
              </div>
            </div>
            {isPdf && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                PDF preview shown. Annotation drawing is available for image sheets; for PDFs use the marks panel.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT: marks panel */}
        <div className="flex flex-col overflow-hidden bg-background">
          <div className="border-b p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Marks entry</h2>
              <Button size="sm" variant="outline" onClick={addQuestion} disabled={isLocked}>
                <Plus className="mr-1 h-4 w-4" />Question
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border bg-secondary/40 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">{grandTotal} <span className="text-base text-muted-foreground">/ {grandMax}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Sections</p>
                <p className="text-sm font-medium">
                  {Object.entries(sectionTotals).map(([k, v]) => (
                    <span key={k} className="ml-2">{k}: {v.obtained}/{v.max}</span>
                  ))}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {marks.length === 0 && (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No questions yet. Click <strong>+ Question</strong> to start entering marks.
              </p>
            )}
            {marks.map((m, i) => {
              const over = Number(m.obtained_marks) > Number(m.max_marks);
              return (
                <Card key={i} className={`p-3 ${over ? "border-destructive" : ""}`}>
                  <div className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-3">
                      <label className="text-xs text-muted-foreground">Q.No</label>
                      <Input value={m.question_no} disabled={isLocked} onChange={(e) => updateQ(i, "question_no", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Sec</label>
                      <Input value={m.section} disabled={isLocked} onChange={(e) => updateQ(i, "section", e.target.value.toUpperCase())} />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs text-muted-foreground">Max</label>
                      <Input type="number" min={0} value={m.max_marks} disabled={isLocked}
                        onChange={(e) => updateQ(i, "max_marks", Number(e.target.value))} />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs text-muted-foreground">Obtained</label>
                      <Input type="number" min={0} value={m.obtained_marks} disabled={isLocked}
                        onChange={(e) => updateQ(i, "obtained_marks", Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Button size="icon" variant="ghost" disabled={isLocked} onClick={() => removeQuestion(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {over && <p className="mt-1 text-xs text-destructive">Obtained exceeds max</p>}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
