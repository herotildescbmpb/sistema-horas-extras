import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

type Status = "pending" | "approved" | "rejected";

const config: Record<Status, { label: string; icon: React.ElementType; className: string }> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50",
  },
  approved: {
    label: "Aprovado",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50",
  },
  rejected: {
    label: "Rejeitado",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50",
  },
};

export function StatusBadge({ status, size = "sm" }: { status: Status; size?: "sm" | "md" }) {
  const { label, icon: Icon, className } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
      {label}
    </span>
  );
}

export function DayTypeBadge({ type }: { type: "weekday" | "saturday" | "sunday_holiday" }) {
  const labels = { weekday: "Dia Útil", saturday: "Sábado", sunday_holiday: "Dom/Feriado" };
  const colors = {
    weekday: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50",
    saturday: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/50",
    sunday_holiday: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/50",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5", colors[type])}>
      {labels[type]}
    </span>
  );
}
