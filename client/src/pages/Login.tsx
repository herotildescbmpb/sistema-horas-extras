import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, Eye, EyeOff, LogIn, Shield } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import ChangePasswordModal from "@/components/ChangePasswordModal";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const loginMutation = trpc.auth.localLogin.useMutation({
    onSuccess: (data) => {
      if (data.mustChangePassword) {
        setShowChangePassword(true);
      } else {
        window.location.href = "/";
      }
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao fazer login");
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Clock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">HorasExtra</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de Gestão — DAL/CBMPB</p>
        </div>

        {/* Login local */}
        <Card className="shadow-md border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Acesso ao Sistema</CardTitle>
            <CardDescription>Use o e-mail e senha cadastrados pelo administrador</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@cbmpb.pb.gov.br"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password">
                  <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    Esqueci minha senha
                  </span>
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Login Manus OAuth */}
        <Button
          variant="outline"
          className="w-full h-11 font-medium bg-background"
          onClick={() => (window.location.href = getLoginUrl())}
        >
          <Shield className="w-4 h-4 mr-2" />
          Entrar com conta Manus
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Senha padrão: <strong>20262026</strong> — altere no primeiro acesso
        </p>
      </div>

      {/* Modal de troca obrigatória de senha */}
      {showChangePassword && (
        <ChangePasswordModal
          mandatory
          onSuccess={() => {
            window.location.href = "/";
          }}
        />
      )}
    </div>
  );
}
