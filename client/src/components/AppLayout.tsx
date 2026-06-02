import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  permissionKey?: string; // se definido, só aparece se o perfil tiver essa permissão
  badge?: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",    href: "/",                icon: LayoutDashboard, permissionKey: "view_dashboard" },
  { label: "Minhas Horas", href: "/horas",           icon: Clock,           permissionKey: "view_own_overtime" },
  { label: "Novo Registro",href: "/novo",            icon: ClipboardList,   permissionKey: "create_overtime" },
  { label: "Relatórios",   href: "/relatorios",     icon: BarChart3,       permissionKey: "view_reports" },
  { label: "Meu Setor",    href: "/meu-setor",      icon: Building2,       permissionKey: "view_setor", badge: "Setor" },
  { label: "Painel Admin", href: "/admin",           icon: Shield,          adminOnly: true },
  { label: "Usuários",     href: "/admin/usuarios", icon: Users,           adminOnly: true },
  { label: "Setores",      href: "/admin/setores",  icon: Building2,       adminOnly: true },
  { label: "Permissões",   href: "/admin/permissoes", icon: Settings,      adminOnly: true },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: () => toast.error("Erro ao sair"),
  });
  // MUST be called unconditionally before any early returns
  const { data: myDept } = trpc.chefe.myDepartment.useQuery(undefined, { enabled: !!user });
  const { data: myPerms } = trpc.permissions.mine.useQuery(undefined, { enabled: !!user, staleTime: 60_000 });

  const isAdmin = user?.role === "admin";
  const visibleNav = useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.adminOnly) return isAdmin;
      if (item.permissionKey && myPerms) return !!myPerms[item.permissionKey];
      return true;
    });
  }, [isAdmin, myPerms]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Clock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Horas Extras</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Sistema de controle e gestão de horas extras. Faça login para continuar.
          </p>
          <Button
            className="w-full h-11 text-sm font-semibold shadow-md"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            Entrar com Manus
          </Button>
        </div>
      </div>
    );
  }

  const initials = (user?.name ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-2")}>
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0 shadow-md">
          <Clock className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-sidebar-foreground leading-tight">HorasExtra</p>
            <p className="text-[10px] text-sidebar-foreground/50 leading-tight">Sistema de Gestão</p>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border/50 mx-3" />

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.adminOnly && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-sidebar-primary/20 text-sidebar-primary px-1.5 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
                {!collapsed && item.badge && !item.adminOnly && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Notification Bell */}
      <div className={cn("px-2 py-2 flex", collapsed ? "justify-center" : "justify-end pr-3")}>
        <NotificationBell collapsed={collapsed} />
      </div>

      <Separator className="bg-sidebar-border/50 mx-3" />

      {/* User */}
      <div className={cn("p-3", collapsed && "flex justify-center")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left",
                collapsed && "w-auto justify-center"
              )}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name ?? "Usuário"}</p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate capitalize">{user?.role === "admin" ? "Administrador" : user?.role === "chefe" ? "Chefe" : user?.role === "auxiliar_administrativo" ? "Aux. Administrativo" : "Usuário"}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link href="/perfil">
                <Settings className="w-4 h-4 mr-2" />
                Meu Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => logout.mutate()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%-1px)] w-5 h-10 bg-sidebar border border-sidebar-border rounded-r-md flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors z-10"
          style={{ marginLeft: collapsed ? "4rem" : "15rem" }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">HorasExtra</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
