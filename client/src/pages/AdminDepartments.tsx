import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2, Edit2, UserCog, Plus, Crown,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const deptSchema = z.object({
  name: z.string().min(3, "Nome obrigatório"),
  shortName: z.string().optional(),
  description: z.string().optional(),
});
type DeptForm = z.infer<typeof deptSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
const AVATAR_COLORS = [
  "bg-blue-600", "bg-indigo-500", "bg-violet-500", "bg-emerald-500",
  "bg-teal-500", "bg-orange-500", "bg-red-500", "bg-pink-500",
];
function avatarColor(name?: string | null) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDepartments() {
  const utils = trpc.useUtils();

  const { data: departments = [], isLoading } = trpc.departments.listWithChefe.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery();

  const createDept = trpc.departments.create.useMutation({
    onSuccess: () => {
      utils.departments.listWithChefe.invalidate();
      utils.departments.list.invalidate();
      toast.success("Setor criado com sucesso.");
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateDept = trpc.departments.update.useMutation({
    onSuccess: () => {
      utils.departments.listWithChefe.invalidate();
      utils.departments.list.invalidate();
      toast.success("Setor atualizado.");
      setEditOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const setChefe = trpc.departments.setChefe.useMutation({
    onSuccess: () => {
      utils.departments.listWithChefe.invalidate();
      toast.success("Chefe do setor atualizado.");
      setChefeOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── State ────────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<(typeof departments)[0] | null>(null);
  const [chefeOpen, setChefeOpen] = useState(false);
  const [chefeTarget, setChefeTarget] = useState<(typeof departments)[0] | null>(null);
  const [selectedChefeId, setSelectedChefeId] = useState<string>("none");

  // ─── Forms ────────────────────────────────────────────────────────────────
  const createForm = useForm<DeptForm>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: "", shortName: "", description: "" },
  });

  const editForm = useForm<DeptForm>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: "", shortName: "", description: "" },
  });

  function openEdit(d: (typeof departments)[0]) {
    setEditTarget(d);
    editForm.reset({
      name: d.name,
      shortName: d.shortName ?? "",
      description: d.description ?? "",
    });
    setEditOpen(true);
  }

  function openChefe(d: (typeof departments)[0]) {
    setChefeTarget(d);
    setSelectedChefeId(d.chefeId ? String(d.chefeId) : "none");
    setChefeOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Setores / Seções
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {departments.length} setor{departments.length !== 1 ? "es" : ""} cadastrado
            {departments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Setor
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <Card className="shadow-sm border-border/60">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum setor cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map((dept) => (
            <Card
              key={dept.id}
              className="shadow-sm border-border/60 hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-primary to-primary/30" />
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {dept.shortName && (
                        <Badge variant="secondary" className="text-xs font-mono shrink-0">
                          {dept.shortName}
                        </Badge>
                      )}
                      <CardTitle className="text-sm font-semibold leading-snug">
                        {dept.name}
                      </CardTitle>
                    </div>
                    {dept.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {dept.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(dept)}
                      title="Editar setor"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openChefe(dept)}
                      title="Definir chefe"
                    >
                      <UserCog className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-3 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  Chefe do Setor
                </p>
                {dept.chefeName ? (
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback
                        className={`${avatarColor(dept.chefeName)} text-white text-xs font-semibold`}
                      >
                        {initials(dept.chefeName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{dept.chefeName}</p>
                      {dept.chefePosition && (
                        <p className="text-xs text-muted-foreground">{dept.chefePosition}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                    onClick={() => openChefe(dept)}
                  >
                    <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 flex items-center justify-center transition-colors">
                      <Plus className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                    </div>
                    <span>Definir chefe do setor</span>
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create Modal ──────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Novo Setor
            </DialogTitle>
            <DialogDescription>Cadastre um novo setor ou seção no sistema.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((data) => createDept.mutate(data))}
            className="space-y-4 mt-2"
          >
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Nome completo *</Label>
              <Input
                {...createForm.register("name")}
                placeholder="Ex: DAL/1 – Seção de Aquisições"
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {createForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Sigla / Nome curto</Label>
              <Input {...createForm.register("shortName")} placeholder="Ex: DAL/1" />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Descrição</Label>
              <Input
                {...createForm.register("description")}
                placeholder="Descrição opcional do setor"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createDept.isPending}>
                {createDept.isPending ? "Criando..." : "Criar setor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Editar Setor
            </DialogTitle>
            <DialogDescription>
              Atualize os dados de <strong>{editTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((data) => {
              if (!editTarget) return;
              updateDept.mutate({ id: editTarget.id, ...data });
            })}
            className="space-y-4 mt-2"
          >
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Nome completo *</Label>
              <Input {...editForm.register("name")} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {editForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Sigla / Nome curto</Label>
              <Input {...editForm.register("shortName")} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Descrição</Label>
              <Input {...editForm.register("description")} />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateDept.isPending}>
                {updateDept.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Set Chefe Modal ───────────────────────────────────────────────── */}
      <Dialog open={chefeOpen} onOpenChange={setChefeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Definir Chefe do Setor
            </DialogTitle>
            <DialogDescription>
              Selecione o chefe responsável por{" "}
              <strong>{chefeTarget?.shortName ?? chefeTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Chefe do setor</Label>
              <Select value={selectedChefeId} onValueChange={setSelectedChefeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o chefe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (remover chefe)</SelectItem>
                  {users
                    .filter((u) => u.isActive !== false)
                    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}{u.position ? ` — ${u.position}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setChefeOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!chefeTarget) return;
                const chefeId =
                  selectedChefeId && selectedChefeId !== "none"
                    ? Number(selectedChefeId)
                    : null;
                setChefe.mutate({ departmentId: chefeTarget.id, chefeId });
              }}
              disabled={setChefe.isPending}
            >
              {setChefe.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
