import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, ArrowLeft, Lock, Loader2, XCircle, Eye, EyeOff } from "lucide-react";

const schema = z
  .object({
    newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function useQueryParam(key: string): string {
  // wouter's useLocation returns only pathname; use window.location.search for query params
  const params = new URLSearchParams(window.location.search);
  return params.get(key) ?? "";
}

export default function ResetPassword() {
  const token = useQueryParam("token");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: tokenCheck, isLoading: checkingToken } = trpc.auth.validateResetToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const resetMutation = trpc.auth.resetPasswordByToken.useMutation({
    onSuccess: () => setSuccess(true),
  });

  const onSubmit = (data: FormData) => {
    resetMutation.mutate({ token, newPassword: data.newPassword });
  };

  // Token ausente
  if (!token) {
    return (
      <ResetLayout>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Link de recuperação inválido. Solicite um novo link na tela de login.
          </AlertDescription>
        </Alert>
        <BackToLogin />
      </ResetLayout>
    );
  }

  // Verificando token
  if (checkingToken) {
    return (
      <ResetLayout>
        <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verificando link...</span>
        </div>
      </ResetLayout>
    );
  }

  // Token inválido ou expirado
  if (!tokenCheck?.valid) {
    return (
      <ResetLayout>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Este link de recuperação é inválido ou já expirou. Solicite um novo link.
          </AlertDescription>
        </Alert>
        <BackToLogin />
      </ResetLayout>
    );
  }

  // Senha redefinida com sucesso
  if (success) {
    return (
      <ResetLayout>
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 ml-2">
            Senha redefinida com sucesso! Você já pode fazer login com a nova senha.
          </AlertDescription>
        </Alert>
        <Link href="/login">
          <Button className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-[#1a1a2e] font-semibold">
            Ir para o login
          </Button>
        </Link>
      </ResetLayout>
    );
  }

  // Formulário de nova senha
  return (
    <ResetLayout>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              className="pl-9 pr-10"
              {...register("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-red-500">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Repita a nova senha"
              className="pl-9 pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {resetMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {resetMutation.error?.message || "Erro ao redefinir senha. Tente novamente."}
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-[#1a1a2e] font-semibold"
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar nova senha"
          )}
        </Button>
      </form>
      <BackToLogin />
    </ResetLayout>
  );
}

function ResetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f4f5] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1a1a2e] mb-3">
          <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#1a1a2e] tracking-tight">HorasExtra</h1>
        <p className="text-sm text-slate-500 mt-1">Sistema de Gestão — DAL/CBMPB</p>
      </div>

      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Redefinir senha</CardTitle>
          <CardDescription>Crie uma nova senha para sua conta</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

function BackToLogin() {
  return (
    <div className="mt-6 text-center">
      <Link href="/login">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o login
        </span>
      </Link>
    </div>
  );
}
