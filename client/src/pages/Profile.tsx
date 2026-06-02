import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Shield, UserCheck, Save, Loader2, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import ChangePasswordModal from "@/components/ChangePasswordModal";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  department: z.string().optional(),
  position: z.string().optional(),
  hourlyRate: z.string().optional(),
  matricula: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Profile() {
  const { user } = useAuth();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      department: user?.department ?? "",
      position: user?.position ?? "",
      hourlyRate: user?.hourlyRate ?? "",
      matricula: (user as any)?.matricula ?? "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? "",
        department: user.department ?? "",
        position: user.position ?? "",
        hourlyRate: user.hourlyRate ?? "",
        matricula: (user as any)?.matricula ?? "",
      });
    }
  }, [user, reset]);

  const updateMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar perfil"),
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate({
      name: data.name,
      department: data.department || undefined,
      position: data.position || undefined,
      hourlyRate: data.hourlyRate || undefined,
    });
  };

  const initials = (user?.name ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas informações pessoais</p>
        </div>
      </div>

      {/* Profile card */}
      <Card className="shadow-sm border-border/60 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold text-foreground">{user?.name ?? "Usuário"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="text-xs">
                  {user?.role === "admin" ? (
                    <><Shield className="w-3 h-3 mr-1" />Administrador</>
                  ) : (
                    <><UserCheck className="w-3 h-3 mr-1" />Funcionário</>
                  )}
                </Badge>
                {user?.department && (
                  <Badge variant="outline" className="text-xs">{user.department}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Informações Pessoais</CardTitle>
            <CardDescription className="text-xs">
              Atualize seus dados de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">Nome Completo *</Label>
              <Input id="name" {...register("name")} className="h-10" placeholder="Seu nome completo" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-medium">Setor</Label>
                <Input
                  id="department"
                  {...register("department")}
                  className="h-10"
                  placeholder="Ex: TI, RH, Financeiro"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="position" className="text-xs font-medium">Cargo</Label>
                <Input
                  id="position"
                  {...register("position")}
                  className="h-10"
                  placeholder="Ex: Analista, Gerente"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="hourlyRate" className="text-xs font-medium">Valor por Hora (R$)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  {...register("hourlyRate")}
                  className="h-10"
                  placeholder="Ex: 35.00"
                />
                <p className="text-xs text-muted-foreground">
                  Utilizado para calcular o valor estimado das horas extras
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="matricula" className="text-xs font-medium">Matrícula (Servidor)</Label>
                <Input
                  id="matricula"
                  {...register("matricula")}
                  className="h-10"
                  placeholder="Ex: 527352"
                />
                <p className="text-xs text-muted-foreground">
                  Número de matrícula funcional do servidor
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={!isDirty || isSubmitting || updateMutation.isPending}
                className="gap-2"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Alterar senha */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Segurança</CardTitle>
          <CardDescription className="text-xs">
            Altere sua senha de acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowChangePwd(true)}
          >
            <KeyRound className="w-4 h-4" />
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      {showChangePwd && (
        <ChangePasswordModal
          open={showChangePwd}
          onOpenChange={setShowChangePwd}
        />
      )}
    </div>
  );
}
