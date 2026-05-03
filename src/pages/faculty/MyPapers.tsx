import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, ChevronLeft, ChevronRight, Download, FileSearch, History, MessageSquare, Search } from "lucide-react";

type FilterValue = "all" | "pending" | "completed";

const PAGE_SIZE = 8;

const getStatus = (sheet: any, evaluation?: any) => evaluation?.status ?? sheet.status ?? "assigned";
const isCompleted = (status: string) => status === "submitted" || status === "completed";
const isPending = (status: string) => !isCompleted(status);
const formatStatus = (status: string) => {
  if (isCompleted(status)) return "Completed";
  if (status === "draft" || status === "in_progress") return "Pending";
  return "Pending";
};

const statusClassName = (status: string) =>
  isCompleted(status)
    ? "bg-success/10 text-success hover:bg-success/10"
    : "bg-warning/10 text-warning hover:bg-warning/10";

export default function MyPapers({ historyOnly = false }: { historyOnly?: boolean }) {
  const { user } = useAuth();
  const [sheets, setSheets] = useState<any[]>([]);
  const [evalsMap, setEvalsMap] = useState<Record<string, any>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const downloadSheet = async (sheet: any) => {
    const { data, error } = await supabase.storage.from("answer-sheets").createSignedUrl(sheet.file_path, 300, {
      download: `${sheet.register_no}-${sheet.subject_code}-evaluated.pdf`,
    });
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "Download unavailable");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const showRemarks = async (evaluationId?: string) => {
    if (!evaluationId) return toast.info("No remarks stored yet");
    const { data } = await supabase.from("annotations").select("page_no,data").eq("evaluation_id", evaluationId).order("page_no");
    const remarks = (data ?? [])
      .map((row: any) => ({ page: row.page_no, comment: (row.data as any)?.comment }))
      .filter((row) => row.comment)
      .map((row) => `Page ${row.page}: ${row.comment}`)
      .join("\n");
    toast.info(remarks || "No faculty remarks stored yet");
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from("answer_sheets")
        .select("*")
        .eq("assigned_faculty", user.id)
        .order("created_at", { ascending: false });
      setSheets(s ?? []);

      const { data: ev } = await supabase
        .from("evaluations")
        .select("*")
        .eq("faculty_id", user.id)
        .order("submitted_at", { ascending: false, nullsFirst: false });
      const m: Record<string, any> = {};
      ev?.forEach((e) => (m[e.sheet_id] = e));
      setEvalsMap(m);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => setPage(1), [q, filter, historyOnly]);

  const filtered = useMemo(() => {
    return sheets
      .map((sheet) => {
        const evaluation = evalsMap[sheet.id];
        const status = getStatus(sheet, evaluation);
        return { sheet, evaluation, status };
      })
      .filter(({ sheet, status }) => {
        const haystack = `${sheet.register_no} ${sheet.subject_code} ${sheet.subject_name}`.toLowerCase();
        const matchesSearch = haystack.includes(q.trim().toLowerCase());
        const matchesFilter =
          filter === "all" ? true : filter === "completed" ? isCompleted(status) : isPending(status);
        return matchesSearch && (historyOnly ? isCompleted(status) : matchesFilter);
      })
      .sort((a, b) => {
        if (!historyOnly) return 0;
        const aDate = a.evaluation?.submitted_at ?? a.evaluation?.created_at ?? a.sheet.created_at;
        const bDate = b.evaluation?.submitted_at ?? b.evaluation?.created_at ?? b.sheet.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }, [evalsMap, filter, historyOnly, q, sheets]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const title = historyOnly ? "Past Evaluations" : "Assigned Papers";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3 rounded-lg">
            {historyOnly ? "Latest First" : "Evaluation Queue"}
          </Badge>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {historyOnly
              ? "Submitted evaluations sorted by most recent activity."
              : "Search, filter, and start evaluating assigned answer sheets."}
          </p>
        </div>
        {!historyOnly && (
          <Button asChild className="rounded-xl bg-primary hover:bg-primary/90">
            <Link to={pageRows[0] ? `/faculty/evaluate/${pageRows[0].sheet.id}` : "/faculty/papers"}>
              Start Evaluation <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <Card className="overflow-hidden rounded-xl border-border/70 shadow-soft">
        <div className="flex flex-col gap-3 border-b bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student, subject, code"
              className="h-10 rounded-xl pl-9"
              aria-label={`Search ${title.toLowerCase()}`}
            />
          </div>
          {!historyOnly && (
            <Select value={filter} onValueChange={(value) => setFilter(value as FilterValue)}>
              <SelectTrigger className="h-10 w-full rounded-xl md:w-44" aria-label="Filter assigned papers">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : pageRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {historyOnly ? <History className="h-8 w-8" /> : <FileSearch className="h-8 w-8" />}
            </div>
            <h3 className="font-semibold">{historyOnly ? "No evaluations submitted yet" : "No papers match your filters"}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {historyOnly
                ? "Completed evaluations will appear here with marks and submitted dates."
                : "Try changing the filter or search term to find the paper you need."}
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => { setQ(""); setFilter("all"); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Student ID</TableHead>
                    <TableHead>Subject</TableHead>
                    {historyOnly ? <TableHead>Marks Provided</TableHead> : <TableHead>Status</TableHead>}
                    {historyOnly ? <TableHead>Evaluated Date</TableHead> : <TableHead className="text-right">Action</TableHead>}
                    {historyOnly && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map(({ sheet, evaluation, status }) => (
                    <TableRow key={sheet.id} className="transition hover:bg-primary/5">
                      <TableCell className="font-medium">{sheet.register_no}</TableCell>
                      <TableCell>
                        <div className="font-medium">{sheet.subject_name}</div>
                        <div className="text-xs text-muted-foreground">{sheet.subject_code}</div>
                      </TableCell>
                      {historyOnly ? (
                        <>
                          <TableCell className="font-semibold">
                            {Number(evaluation?.total_marks ?? 0)} / {Number(evaluation?.max_marks ?? 100)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(evaluation?.submitted_at ?? sheet.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => showRemarks(evaluation?.id)}>
                                <MessageSquare className="mr-1 h-4 w-4" />Remarks
                              </Button>
                              <Button size="sm" className="rounded-xl" onClick={() => downloadSheet(sheet)}>
                                <Download className="mr-1 h-4 w-4" />Download
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <Badge variant="secondary" className={`rounded-lg capitalize ${statusClassName(status)}`}>
                              {formatStatus(status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              asChild
                              size="sm"
                              className="rounded-xl"
                              variant={isCompleted(status) ? "outline" : "default"}
                              onClick={() => toast.info(isCompleted(status) ? "Opening completed evaluation" : "Opening evaluation workspace")}
                            >
                              <Link to={`/faculty/evaluate/${sheet.id}`}>
                                {isCompleted(status) ? "View" : "Start Evaluation"}
                              </Link>
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {historyOnly && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Page {page} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={page === 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={page === pageCount}
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
