import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

interface ChangePasswordModalProps {
  /** Se true, o modal não pode ser fechado sem trocar a senha */
  mandatory?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ChangePasswordModal({
  mandatory = false,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: ChangePasswordModalProps) {
  const [internalOpen, setInternalOpen] = useState(true);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = (val: boolean) => {
    if (mandatory && !val) return; // Não permite fechar se obrigatório
    if (onOpenChange) onOpenChange(val);
    else setInternalOpen(val);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const utils = trpc.useUtils();
  const changeMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      reset();
      handleOpenChange(false);
      utils.auth.me.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao alterar senha");
    },
  });

  const onSubmit = (data: FormData) => {
    changeMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => { if (mandatory) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (mandatory) e.preventDefault(); }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            {mandatory ? (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <DialogTitle>
                {mandatory ? "Troca de senha obrigatória" : "Alterar senha"}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {mandatory
                  ? "Este é seu primeiro acesso. Por segurança, defina uma nova senha antes de continuar."
                  : "Informe sua senha atual e escolha uma nova senha."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Senha atual */}
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">
              {mandatory ? "Senha padrão (20262026)" : "Senha atual"}
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                {...register("currentPassword")}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>

          {/* Nova senha */}
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nova senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirmar nova senha */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Repita a nova senha"
                className="pr-10"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            {!mandatory && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={changeMutation.isPending}
            >
              {changeMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
