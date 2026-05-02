import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, UserCheck, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function AdminUsers() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const [editUser, setEditUser] = useState<{
    id: number;
    name: string;
    department: string;
    position: string;
    hourlyRate: string;
    role: "user" | "admin";
  } | null>(null);

  const setRoleMutation = trpc.users.setRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Perfil do usuário atualizado");
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar perfil"),
  });

  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Dados do usuário atualizados");
      setEditUser(null);
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar dados"),
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <Users className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users?.length ?? 0} usuário{users?.length !== 1 ? "s" : ""} cadastrado{users?.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !users?.length ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {user.name ?? "Sem nome"}
                      </span>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className="text-xs h-5"
                      >
                        {user.role === "admin" ? (
                          <><Shield className="w-3 h-3 mr-1" />Admin</>
                        ) : (
                          <><UserCheck className="w-3 h-3 mr-1" />Funcionário</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {user.email && (
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      )}
                      {user.department && (
                        <>
                          {user.email && <span className="text-muted-foreground/40">·</span>}
                          <span className="text-xs text-muted-foreground">{user.department}</span>
                        </>
                      )}
                      {user.position && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground">{user.position}</span>
                        </>
                      )}
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-xs text-muted-foreground">
                        Desde {format(new Date(user.createdAt), "MMM yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() =>
                        setEditUser({
                          id: user.id,
                          name: user.name ?? "",
                          department: user.department ?? "",
                          position: user.position ?? "",
                          hourlyRate: user.hourlyRate ?? "",
                          role: user.role,
                        })
                      }
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Button>
                    <Select
                      value={user.role}
                      onValueChange={(v) =>
                        setRoleMutation.mutate({ userId: user.id, role: v as "user" | "admin" })
                      }
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Funcionário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editUser !== null} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize as informações do funcionário</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nome</Label>
                <Input
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  placeholder="Nome completo"
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Setor</Label>
                  <Input
                    value={editUser.department}
                    onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}
                    placeholder="Ex: TI, RH"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cargo</Label>
                  <Input
                    value={editUser.position}
                    onChange={(e) => setEditUser({ ...editUser, position: e.target.value })}
                    placeholder="Ex: Analista"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Valor/hora (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editUser.hourlyRate}
                  onChange={(e) => setEditUser({ ...editUser, hourlyRate: e.target.value })}
                  placeholder="Ex: 35.00"
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Usado para calcular o valor estimado das horas extras
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button
              disabled={updateProfileMutation.isPending}
              onClick={() => {
                if (!editUser) return;
                updateProfileMutation.mutate({
                  targetUserId: editUser.id,
                  name: editUser.name || undefined,
                  department: editUser.department || undefined,
                  position: editUser.position || undefined,
                  hourlyRate: editUser.hourlyRate || undefined,
                });
              }}
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
