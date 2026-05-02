import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Subjects() {
  const [list, setList] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sem, setSem] = useState("");
  const [dept, setDept] = useState("");

  const load = async () => {
    const { data } = await supabase.from("subjects").select("*").order("subject_code");
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !sem) return toast.error("Code, name, semester required");
    const { error } = await supabase.from("subjects").insert({
      subject_code: code, subject_name: name, semester: parseInt(sem), department: dept || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Subject added");
    setCode(""); setName(""); setSem(""); setDept("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subjects</h1>
        <p className="text-muted-foreground">Maintain the catalogue of subjects offered.</p>
      </div>

      <Card className="p-5">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-5">
          <div className="space-y-1">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CS301" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Operating Systems" />
          </div>
          <div className="space-y-1">
            <Label>Semester</Label>
            <Input type="number" value={sem} onChange={(e) => setSem(e.target.value)} placeholder="5" />
          </div>
          <div className="space-y-1">
            <Label>Dept</Label>
            <Input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="CSE" />
          </div>
          <Button type="submit" className="sm:col-span-5 sm:w-fit bg-gradient-primary"><Plus className="mr-1 h-4 w-4" />Add subject</Button>
        </form>
      </Card>

      <Card className="p-5">
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No subjects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr><th className="pb-2">Code</th><th className="pb-2">Name</th><th className="pb-2">Semester</th><th className="pb-2">Dept</th><th /></tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{s.subject_code}</td>
                    <td className="py-3">{s.subject_name}</td>
                    <td className="py-3">Sem {s.semester}</td>
                    <td className="py-3">{s.department || "—"}</td>
                    <td className="py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
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
