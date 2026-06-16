import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export default function AdminFeriados() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; date: string; name: string; description?: string | null } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({ date: "", name: "", description: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  const { data: holidays = [], refetch } = trpc.holidays.list.useQuery({ year });

  const createMutation = trpc.holidays.create.useMutation({
    onSuccess: () => {
      toast.success("Feriado cadastrado com sucesso.");
      setShowCreate(false);
      setForm({ date: "", name: "", description: "" });
      refetch();
    },
    onError: (e) => toast.error("Erro ao cadastrar feriado", { description: e.message }),
  });

  const updateMutation = trpc.holidays.update.useMutation({
    onSuccess: () => {
      toast.success("Feriado atualizado com sucesso.");
      setEditItem(null);
      refetch();
    },
    onError: (e) => toast.error("Erro ao atualizar feriado", { description: e.message }),
  });

  const deleteMutation = trpc.holidays.delete.useMutation({
    onSuccess: () => {
      toast.success("Feriado removido.");
      setDeleteId(null);
      refetch();
    },
    onError: (e) => toast.error("Erro ao remover feriado", { description: e.message }),
  });

  // Agrupar por mês
  const byMonth: Record<number, typeof holidays> = {};
  for (const h of holidays) {
    const m = parseInt(h.date.split("-")[1], 10) - 1;
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(h);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feriados Customizados</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie feriados locais e municipais que afetam o cálculo de horas extras.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Feriado
        </Button>
      </div>

      {/* Seletor de ano */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)}>‹</Button>
        <span className="font-semibold text-lg w-16 text-center">{year}</span>
        <Button variant="outline" size="sm" onClick={() => setYear((y) => y + 1)}>›</Button>
        <Badge variant="secondary">{holidays.length} feriados cadastrados</Badge>
      </div>

      {/* Lista por mês */}
      {holidays.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum feriado cadastrado para {year}.</p>
            <p className="text-sm mt-1">Clique em "Novo Feriado" para adicionar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.entries(byMonth)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([monthIdx, items]) => (
              <Card key={monthIdx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
                    {MONTHS[Number(monthIdx)]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {items.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs w-20 justify-center">
                          {formatDate(h.date)}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{h.name}</p>
                          {h.description && (
                            <p className="text-xs text-muted-foreground">{h.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditItem(h);
                            setEditForm({ name: h.name, description: h.description ?? "" });
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(h.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Modal: Criar feriado */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Feriado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Nome do Feriado *</Label>
              <Input
                placeholder="Ex: Aniversário de João Pessoa"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Observações adicionais"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              disabled={!form.date || form.name.length < 3 || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  date: form.date,
                  name: form.name,
                  description: form.description || undefined,
                })
              }
            >
              {createMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar feriado */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Feriado — {editItem ? formatDate(editItem.date) : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do Feriado *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button
              disabled={editForm.name.length < 3 || updateMutation.isPending}
              onClick={() =>
                editItem &&
                updateMutation.mutate({
                  id: editItem.id,
                  name: editForm.name,
                  description: editForm.description || undefined,
                })
              }
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover feriado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O feriado será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
