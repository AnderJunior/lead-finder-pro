import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, change, positive, className }: StatCardProps) {
  return (
    <div className={cn("card-gradient rounded-xl border border-border p-5 animate-fade-in", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {change && (
        <p className={cn("text-xs mt-1 font-medium", positive ? "text-success" : "text-destructive")}>
          {change}
        </p>
      )}
    </div>
  );
}
