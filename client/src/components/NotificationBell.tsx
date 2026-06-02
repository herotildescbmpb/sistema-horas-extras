import { useState } from "react";
import { useLocation } from "wouter";
import { Bell, Check, CheckCheck, Clock, CalendarRange, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export default function NotificationBell({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: count = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000, // polling a cada 30s
    refetchIntervalInBackground: false,
  });

  const { data: items = [] } = trpc.notifications.list.useQuery(undefined, {
    enabled: open,
    refetchInterval: open ? 15_000 : false,
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
      toast.success("Todas as notificações marcadas como lidas");
    },
  });

  function handleClick(item: (typeof items)[number]) {
    if (!item.read) {
      markRead.mutate({ id: item.id });
    }
    setOpen(false);
    if (item.relatedType === "escala" && item.relatedId) {
      navigate(`/escalas/${item.relatedId}`);
    } else if (item.relatedType === "overtime") {
      // Navega para o painel do setor com filtro no mês atual
      navigate("/meu-setor?tab=horas");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            open && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-xl border border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Notificações</span>
            {count > 0 && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                {count} nova{count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="w-3 h-3" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[380px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Bell className="w-8 h-8 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 flex gap-3",
                    !item.read && "bg-primary/5"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    item.type === "escala_lancada"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-amber-100 text-amber-600"
                  )}>
                    {item.type === "escala_lancada"
                      ? <CalendarRange className="w-4 h-4" />
                      : <Clock className="w-4 h-4" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={cn(
                        "text-sm leading-snug",
                        !item.read ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                      )}>
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    {item.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2 text-center">
              <button
                onClick={() => { setOpen(false); navigate("/meu-setor"); }}
                className="text-xs text-primary hover:underline font-medium"
              >
                Ver painel do setor →
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
