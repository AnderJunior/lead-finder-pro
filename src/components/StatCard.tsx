import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  className?: string;
  iconBgClass?: string;
  iconClass?: string;
  subtitle?: string;
  subtitleClass?: string;
}

export function StatCard({ icon: Icon, label, value, change, positive, className, iconBgClass, iconClass, subtitle, subtitleClass }: StatCardProps) {
  return (
    <div className={cn("card-gradient rounded-xl border border-border p-5 animate-fade-in", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10", iconBgClass)}>
          <Icon className={cn("h-4 w-4 text-primary", iconClass)} />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {subtitle && (
        <p className={cn("text-xs mt-1.5", subtitleClass)}>{subtitle}</p>
      )}
    </div>
  );
}
