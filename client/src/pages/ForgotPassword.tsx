import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, ArrowLeft, Mail, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: (_, variables) => {
      setSubmittedEmail(variables.email);
      setSubmitted(true);
    },
  });

  const onSubmit = (data: FormData) => {
    forgotMutation.mutate({ email: data.email, origin: window.location.origin });
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] flex flex-col items-center justify-center px-4">
      {/* Logo */}
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
          <CardTitle className="text-xl">Recuperar senha</CardTitle>
          <CardDescription>
            {submitted
              ? "Verifique seu e-mail"
              : "Informe seu e-mail cadastrado para receber o link de recuperação"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 ml-2">
                  Se o e-mail <strong>{submittedEmail}</strong> estiver cadastrado no sistema, você
                  receberá um link de recuperação em instantes. Verifique também a pasta de spam.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-slate-500 text-center">
                O link expira em <strong>1 hora</strong>.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSubmitted(false);
                  setSubmittedEmail("");
                }}
              >
                Enviar novamente
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@cbmpb.pb.gov.br"
                    className="pl-9"
                    autoComplete="email"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {forgotMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Ocorreu um erro ao processar sua solicitação. Tente novamente.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-[#1a1a2e] font-semibold"
                disabled={forgotMutation.isPending}
              >
                {forgotMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login">
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para o login
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
