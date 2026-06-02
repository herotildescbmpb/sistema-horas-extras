import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Users, Search, Edit2, KeyRound, Shield, UserCheck, UserX, Trash2,
  ChevronUp, ChevronDown, ChevronsUpDown, X, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Edit schema ──────────────────────────────────────────────────────────────
const ROLES = ["admin", "chefe", "auxiliar_administrativo"] as const;
type RoleValue = typeof ROLES[number];

const ROLE_LABELS: Record<RoleValue, string> = {
  admin: "Admin",
  chefe: "Chefe",
  auxiliar_administrativo: "Auxiliar Administrativo",
};

const editSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  department: z.string().optional(),
  position: z.string().optional(),
  matricula: z.string().optional(),
  role: z.enum(ROLES),
});
type EditForm = z.infer<typeof editSchema>;

// ─── Create schema ──────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  department: z.string().optional(),
  position: z.string().optional(),
  matricula: z.string().optional(),
  role: z.enum(ROLES),
});
type CreateForm = z.infer<typeof createSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-teal-500", "bg-cyan-500", "bg-blue-600", "bg-violet-500", "bg-pink-500",
];
function avatarColor(name?: string | null) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { user: me } = useAuth();
  const utils = trpc.useUtils();

  const { data: users = [], isLoading } = trpc.users.list.useQuery();
  const { data: departments = [] } = trpc.departments.list.useQuery();

  const adminUpdate = trpc.users.adminUpdate.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Usuário atualizado com sucesso.");
      setEditOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const setActive = trpc.users.setActive.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Status do usuário atualizado.");
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── State ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "chefe" | "auxiliar_administrativo" | "user">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterDept, setFilterDept] = useState("all");
  const [sortField, setSortField] = useState<"name" | "department" | "role">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<(typeof users)[0] | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<(typeof users)[0] | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ user: (typeof users)[0]; active: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<(typeof users)[0] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ─── Delete mutation
  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Usuário excluído com sucesso.");
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Create mutation ──────────────────────────────────────────────────────
  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Usuário cadastrado com sucesso.");
      setCreateOpen(false);
      createReset();
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register: createRegister,
    handleSubmit: createHandleSubmit,
    control: createControl,
    reset: createReset,
    formState: { errors: createErrors, isSubmitting: createSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", department: "", position: "", matricula: "", role: "chefe" as const },
  });

  function onCreateSubmit(data: CreateForm) {
    const dept = data.department === "none_dept" ? undefined : data.department;
    createUser.mutate({ ...data, department: dept, email: data.email || undefined });
  }

  // ─── Edit form ────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", email: "", department: "", position: "", matricula: "", role: "chefe" },
  });

  function openEdit(u: (typeof users)[0]) {
    setEditTarget(u);
    reset({
      name: u.name ?? "",
      email: u.email ?? "",
      department: u.department ?? "",
      position: u.position ?? "",
      matricula: u.matricula ?? "",
      role: (u.role === "user" ? "chefe" : u.role) as "admin" | "chefe" | "auxiliar_administrativo",
    });
    setEditOpen(true);
  }

  function onEditSubmit(data: EditForm) {
    if (!editTarget) return;
    const dept = data.department === "none_dept" ? "" : data.department;
    adminUpdate.mutate({ userId: editTarget.id, ...data, department: dept });
  }

  // ─── Filter + sort ────────────────────────────────────────────────────────
  const filtered = users
    .filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q);
      const matchRole = filterRole === "all" || u.role === filterRole;
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" ? u.isActive !== false : u.isActive === false);
      const matchDept = filterDept === "all" || u.department === filterDept;
      return matchSearch && matchRole && matchStatus && matchDept;
    })
    .sort((a, b) => {
      const va =
        (sortField === "name"
          ? a.name
          : sortField === "department"
          ? a.department
          : a.role) ?? "";
      const vb =
        (sortField === "name"
          ? b.name
          : sortField === "department"
          ? b.department
          : b.role) ?? "";
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field)
      return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 ml-1 text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1 text-primary" />;
  }

  const deptOptions = Array.from(new Set(users.map((u) => u.department).filter(Boolean)));
  const activeCount = users.filter((u) => u.isActive !== false).length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Usuários Cadastrados
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} usuário{users.length !== 1 ? "s" : ""} · {activeCount} ativo
            {activeCount !== 1 ? "s" : ""} · {adminCount} administrador
            {adminCount !== 1 ? "es" : ""}
          </p>
        </div>
        <Button
          onClick={() => { createReset(); setCreateOpen(true); }}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-border/60">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={(v) => setFilterRole(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="chefe">Chefe</SelectItem>
                <SelectItem value="auxiliar_administrativo">Aux. Administrativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {deptOptions.map((d) => (
                  <SelectItem key={d} value={d!}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || filterRole !== "all" || filterStatus !== "all" || filterDept !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilterRole("all");
                  setFilterStatus("all");
                  setFilterDept("all");
                }}
              >
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[280px]">
                    <button
                      className="flex items-center font-semibold text-xs uppercase tracking-wide"
                      onClick={() => toggleSort("name")}
                    >
                      Nome <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[220px]">E-mail</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center font-semibold text-xs uppercase tracking-wide"
                      onClick={() => toggleSort("department")}
                    >
                      Setor <SortIcon field="department" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center font-semibold text-xs uppercase tracking-wide"
                      onClick={() => toggleSort("role")}
                    >
                      Perfil <SortIcon field="role" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <div className="h-10 bg-muted/40 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback
                              className={`${avatarColor(u.name)} text-white text-xs font-semibold`}
                            >
                              {initials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {u.name ?? "—"}
                            </p>
                            {u.matricula && (
                              <p className="text-xs text-muted-foreground">Mat. {u.matricula}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="truncate block max-w-[200px]">{u.email ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        {u.department ? (
                          <span className="text-sm">{u.department}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.role === "admin" ? (
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs gap-1">
                            <Shield className="h-3 w-3" /> Admin
                          </Badge>
                        ) : u.role === "chefe" ? (
                          <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">
                            Chefe
                          </Badge>
                        ) : u.role === "auxiliar_administrativo" ? (
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
                            Aux. Adm.
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Usuário (legado)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.isActive !== false ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-600 border border-red-200 text-xs">
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => openEdit(u)}
                              >
                                <Edit2 className="h-3.5 w-3.5" /> Editar
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar dados do usuário</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => { setPwdTarget(u); setPwdOpen(true); }}
                              >
                                <KeyRound className="h-3.5 w-3.5" /> Senha
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Redefinir senha</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 gap-1.5 text-xs ${
                                  u.isActive !== false
                                    ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                }`}
                                onClick={() =>
                                  setConfirmToggle({ user: u, active: !(u.isActive !== false) })
                                }
                                disabled={u.id === me?.id}
                              >
                                {u.isActive !== false ? (
                                  <><UserX className="h-3.5 w-3.5" /> Desativar</>
                                ) : (
                                  <><UserCheck className="h-3.5 w-3.5" /> Ativar</>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {u.isActive !== false ? "Desativar acesso" : "Reativar acesso"}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setConfirmDelete(u)}
                                disabled={u.id === me?.id}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Excluir
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir usuário permanentemente</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border/50 text-xs text-muted-foreground">
              Exibindo {filtered.length} de {users.length} usuário{users.length !== 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Atualize os dados de <strong>{editTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1.5 block">Nome completo *</Label>
                <Input {...register("name")} placeholder="Nome do usuário" />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1.5 block">E-mail</Label>
                <Input {...register("email")} type="email" placeholder="email@exemplo.com" />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Matrícula</Label>
                <Input {...register("matricula")} placeholder="Ex: 527352" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Posto / Graduação</Label>
                <Input {...register("position")} placeholder="Ex: Capitão" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Setor</Label>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none_dept">Nenhum</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            {d.shortName ?? d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Perfil *</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="chefe">Chefe</SelectItem>
                        <SelectItem value="auxiliar_administrativo">Aux. Administrativo</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || adminUpdate.isPending}>
                {adminUpdate.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Password Reset Modal ──────────────────────────────────────────── */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Redefinir Senha
            </DialogTitle>
            <DialogDescription>
              O acesso ao sistema é feito via <strong>Manus OAuth</strong>. Para redefinir a senha
              de <strong>{pwdTarget?.name}</strong>, oriente o usuário a utilizar a opção "Esqueci
              minha senha" na tela de login.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Como proceder:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse o portal de login do sistema</li>
              <li>Clique em "Esqueci minha senha"</li>
              <li>
                Informe o e-mail cadastrado:{" "}
                <strong className="text-foreground">{pwdTarget?.email ?? "—"}</strong>
              </li>
              <li>Siga as instruções enviadas por e-mail</li>
            </ol>
          </div>
          <DialogFooter>
            <Button onClick={() => setPwdOpen(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Toggle Active Confirm ─────────────────────────────────────────── */}
      <Dialog open={!!confirmToggle} onOpenChange={() => setConfirmToggle(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmToggle?.active ? "Ativar usuário" : "Desativar usuário"}
            </DialogTitle>
            <DialogDescription>
              {confirmToggle?.active
                ? `Deseja reativar o acesso de ${confirmToggle.user.name}?`
                : `Deseja desativar o acesso de ${confirmToggle?.user.name}? O usuário não conseguirá mais acessar o sistema.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmToggle(null)}>
              Cancelar
            </Button>
            <Button
              variant={confirmToggle?.active ? "default" : "destructive"}
              onClick={() => {
                if (!confirmToggle) return;
                setActive.mutate({
                  userId: confirmToggle.user.id,
                  isActive: confirmToggle.active,
                });
                setConfirmToggle(null);
              }}
            >
              {confirmToggle?.active ? (
                <><UserCheck className="h-4 w-4 mr-1.5" /> Ativar</>
              ) : (
                <><UserX className="h-4 w-4 mr-1.5" /> Desativar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Create User Modal ───────────────────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Cadastrar Novo Usuário
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário. Ele poderá acessar o sistema após o primeiro login com o e-mail cadastrado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createHandleSubmit(onCreateSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1.5 block">Nome completo *</Label>
                <Input {...createRegister("name")} placeholder="Nome do usuário" />
                {createErrors.name && (
                  <p className="text-xs text-destructive mt-1">{createErrors.name.message}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1.5 block">E-mail</Label>
                <Input {...createRegister("email")} type="email" placeholder="email@exemplo.com" />
                {createErrors.email && (
                  <p className="text-xs text-destructive mt-1">{createErrors.email.message}</p>
                )}
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Matrícula</Label>
                <Input {...createRegister("matricula")} placeholder="Ex: 527352" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Posto / Graduação</Label>
                <Input {...createRegister("position")} placeholder="Ex: Capitão" />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Setor</Label>
                <Controller
                  name="department"
                  control={createControl}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none_dept">Nenhum</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            {d.shortName ?? d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Perfil *</Label>
                <Controller
                  name="role"
                  control={createControl}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="chefe">Chefe</SelectItem>
                        <SelectItem value="auxiliar_administrativo">Aux. Administrativo</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {createErrors.role && (
                  <p className="text-xs text-destructive mt-1">{createErrors.role.message}</p>
                )}
              </div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Observação:</strong> O usuário será pré-cadastrado e poderá acessar o sistema realizando login com o e-mail informado.
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createSubmitting || createUser.isPending} className="gap-2">
                <UserPlus className="h-4 w-4" />
                {createUser.isPending ? "Cadastrando..." : "Cadastrar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" /> Excluir usuário
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente{" "}
              <strong>{confirmDelete?.name}</strong>? Esta ação não pode ser desfeita e todos os dados do usuário serão removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteUserMutation.isPending}
              onClick={() => {
                if (!confirmDelete) return;
                deleteUserMutation.mutate({ userId: confirmDelete.id });
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
