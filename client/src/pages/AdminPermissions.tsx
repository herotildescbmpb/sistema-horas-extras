import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Shield, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RoleType = "admin" | "chefe" | "auxiliar_administrativo";

const ROLE_LABELS: Record<RoleType, string> = {
  admin: "Admin",
  chefe: "Chefe",
  auxiliar_administrativo: "Aux. Administrativo",
};

const ROLE_COLORS: Record<RoleType, string> = {
  admin:                  "bg-red-100 text-red-700 border-red-200",
  chefe:                  "bg-amber-100 text-amber-700 border-amber-200",
  auxiliar_administrativo:"bg-blue-100 text-blue-700 border-blue-200",
};

const ROLES: RoleType[] = ["admin", "chefe", "auxiliar_administrativo"];

export default function AdminPermissions() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.permissions.listAll.useQuery();

  const updatePerm = trpc.permissions.update.useMutation({
    onSuccess: () => {
      utils.permissions.listAll.invalidate();
      utils.permissions.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  const { permissions, definitions } = data;

  // Agrupar definições por categoria
  const categories = Array.from(new Set(definitions.map((d) => d.category)));

  function handleToggle(role: RoleType, permissionKey: string, enabled: boolean) {
    if (role === "admin" && permissionKey === "manage_permissions") {
      toast.error("Não é possível remover a permissão de gerenciar permissões do Admin.");
      return;
    }
    updatePerm.mutate({ role, permissionKey, enabled });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestão de Permissões</h1>
          <p className="text-sm text-muted-foreground">
            Controle o que cada perfil pode acessar e executar no sistema.
          </p>
        </div>
      </div>

      {/* Legenda dos perfis */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => (
          <Badge key={role} variant="outline" className={ROLE_COLORS[role]}>
            {ROLE_LABELS[role]}
          </Badge>
        ))}
      </div>

      {/* Tabela por categoria */}
      {categories.map((category) => {
        const catDefs = definitions.filter((d) => d.category === category);
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{category}</CardTitle>
              <CardDescription className="text-xs">
                Permissões relacionadas a {category.toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[280px] pl-6">Permissão</TableHead>
                    {ROLES.map((role) => (
                      <TableHead key={role} className="text-center min-w-[120px]">
                        <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[role]}`}>
                          {ROLE_LABELS[role]}
                        </Badge>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catDefs.map((def) => (
                    <TableRow key={def.key} className="hover:bg-muted/20">
                      <TableCell className="pl-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{def.label}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs max-w-[200px]">
                              Chave: <code className="font-mono">{def.key}</code>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      {ROLES.map((role) => {
                        const enabled = permissions[role]?.[def.key] ?? false;
                        const isAdminCore = role === "admin" && def.key === "manage_permissions";
                        return (
                          <TableCell key={role} className="text-center py-3">
                            <div className="flex justify-center">
                              <Switch
                                checked={enabled}
                                disabled={isAdminCore || updatePerm.isPending}
                                onCheckedChange={(val) => handleToggle(role, def.key, val)}
                                className={enabled ? "data-[state=checked]:bg-emerald-500" : ""}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <p className="text-xs text-muted-foreground text-center pb-4">
        As alterações entram em vigor imediatamente. O usuário verá as mudanças no próximo acesso ou recarregamento da página.
      </p>
    </div>
  );
}
