import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "primary" | "accent" | "success" | "warning";
}

const tones = {
  primary: "from-primary to-primary-glow",
  accent: "from-accent to-primary-glow",
  success: "from-success to-accent",
  warning: "from-warning to-destructive",
};

export function StatCard({ title, value, icon: Icon, hint, tone = "primary" }: Props) {
  return (
    <Card className="group relative overflow-hidden rounded-xl border-border/70 bg-card p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-elegant">
      <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${tones[tone]} opacity-10 transition group-hover:opacity-20`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-soft`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
