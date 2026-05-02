import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Building2, Plus, Loader2, CheckCircle2 } from "lucide-react";

export default function AdminDepartments() {
  const utils = trpc.useUtils();
  const { data: departments, isLoading } = trpc.departments.list.useQuery();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = trpc.departments.create.useMutation({
    onSuccess: () => {
      utils.departments.list.invalidate();
      toast.success("Setor criado com sucesso!");
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: (err) => toast.error(err.message || "Erro ao criar setor"),
  });

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Setores / Projetos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie os setores disponíveis para classificação de horas extras
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm h-10">
              <Plus className="w-4 h-4" />
              Novo Setor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Setor</DialogTitle>
              <DialogDescription>Adicione um novo setor ou projeto ao sistema</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nome do Setor *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Tecnologia da Informação"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional do setor..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                disabled={!name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ name: name.trim(), description: description || undefined })}
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Setor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : !departments?.length ? (
            <div className="py-16 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">Nenhum setor cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Crie o primeiro setor para organizar as horas extras</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {departments.map((dept) => (
                <div key={dept.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{dept.name}</p>
                    {dept.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{dept.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Ativo</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
