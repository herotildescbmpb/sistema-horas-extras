import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BookOpen, ChevronRight, Clock, LayoutDashboard, ClipboardList,
  CalendarRange, BarChart3, Building2, Shield, Users, Settings,
  Bell, Lock, CheckCircle2, AlertCircle, Info, Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  roles: ("admin" | "chefe" | "auxiliar_administrativo" | "all")[];
  content: React.ReactNode;
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function Note({ type = "info", children }: { type?: "info" | "warning" | "success"; children: React.ReactNode }) {
  const styles = {
    info:    "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  };
  const icons = { info: Info, warning: AlertCircle, success: CheckCircle2 };
  const Icon = icons[type];
  return (
    <div className={cn("flex gap-2.5 p-3 rounded-lg border text-sm", styles[type])}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </span>
      <span className="text-sm text-muted-foreground leading-relaxed">{children}</span>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "bg-red-100 text-red-700 border-red-200",
    chefe: "bg-amber-100 text-amber-700 border-amber-200",
    auxiliar_administrativo: "bg-blue-100 text-blue-700 border-blue-200",
  };
  const label: Record<string, string> = {
    admin: "Admin",
    chefe: "Chefe",
    auxiliar_administrativo: "Aux. Adm.",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", map[role])}>
      {label[role] ?? role}
    </Badge>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground mb-3 mt-5 first:mt-0">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>;
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-1.5 mb-3 pl-1">{children}</ul>;
}
function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-muted-foreground">
      <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}

// ─── Seções do guia ───────────────────────────────────────────────────────────
const SECTIONS: Section[] = [
  // ── Visão Geral ──────────────────────────────────────────────────────────────
  {
    id: "visao-geral",
    title: "Visão Geral do Sistema",
    icon: LayoutDashboard,
    roles: ["all"],
    content: (
      <>
        <P>
          O <strong>DALGest</strong> é o sistema de gestão de horas extras do DAL/CBMPB. Ele permite registrar, acompanhar e aprovar serviços extraordinários e especiais realizados pelos militares, com controle por perfil de acesso e janela de lançamento mensal.
        </P>
        <H2>Perfis de acesso</H2>
        <div className="grid gap-3 mb-4">
          {[
            { role: "admin", desc: "Acesso total: gerencia usuários, setores, permissões, aprova e rejeita todos os registros." },
            { role: "chefe", desc: "Acesso ao setor: visualiza e aprova registros dos auxiliares do seu setor, lança serviços diretamente como aprovados." },
            { role: "auxiliar_administrativo", desc: "Lança registros que ficam pendentes até aprovação do chefe do setor." },
          ].map(({ role, desc }) => (
            <div key={role} className="flex gap-3 items-start p-3 rounded-lg border bg-card">
              <RoleBadge role={role} />
              <span className="text-sm text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
        <H2>Janela de lançamento</H2>
        <P>
          Os registros de horas extras só podem ser lançados dentro da <strong>janela mensal</strong>: do dia <strong>01 do mês de referência</strong> até o dia <strong>01 do mês seguinte</strong>. Fora desse período, os formulários ficam bloqueados com aviso informativo.
        </P>
        <Note type="info">
          Exemplo: para lançar horas de junho/2026, a janela vai de 01/06/2026 a 01/07/2026.
        </Note>
        <H2>Modalidades de serviço</H2>
        <UL>
          <LI><strong>Extraordinário</strong> — serviço realizado em dia útil (segunda a sexta).</LI>
          <LI><strong>Especial</strong> — serviço realizado em fim de semana, feriado ou ponto facultativo.</LI>
        </UL>
        <P>A modalidade é calculada automaticamente com base na data selecionada.</P>
      </>
    ),
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    roles: ["all"],
    content: (
      <>
        <P>
          A tela inicial exibe um resumo do mês atual: total de horas registradas, registros aguardando aprovação, servidores ativos e registros recentes. Também oferece atalhos rápidos para as ações mais comuns.
        </P>
        <H2>Cards de resumo</H2>
        <UL>
          <LI><strong>Total de Horas (Mês)</strong> — soma de horas aprovadas no mês corrente.</LI>
          <LI><strong>Aguardando Aprovação</strong> — registros com status "Pendente" que precisam de ação.</LI>
          <LI><strong>Servidores Ativos</strong> — militares que lançaram horas no mês.</LI>
        </UL>
        <H2>Ações Rápidas</H2>
        <UL>
          <LI><strong>Novo Registro</strong> — abre a tela de seleção de tipo de lançamento.</LI>
          <LI><strong>Meus Registros</strong> — navega para a listagem de horas do usuário logado.</LI>
          <LI><strong>Relatórios</strong> — acessa o painel de relatórios.</LI>
          <LI><strong>Aprovar Pendentes</strong> — atalho para o painel de aprovação (admin/chefe).</LI>
        </UL>
      </>
    ),
  },

  // ── Novo Registro ─────────────────────────────────────────────────────────────
  {
    id: "novo-registro",
    title: "Novo Registro",
    icon: ClipboardList,
    roles: ["all"],
    content: (
      <>
        <P>
          Ao clicar em <strong>Novo Registro</strong>, o sistema exibe dois caminhos: <strong>Lançamento Único</strong> (um militar, uma data) ou <strong>Escala em Lote</strong> (vários militares, vários dias).
        </P>
        <H2>Lançamento Único</H2>
        <div className="space-y-2 mb-4">
          <Step n={1}>Selecione a data clicando no mini calendário do mês de referência. Fins de semana aparecem em azul e feriados em âmbar.</Step>
          <Step n={2}>Informe o horário de início e término do serviço.</Step>
          <Step n={3}>Escolha o tipo de serviço (Extraordinário ou Especial — preenchido automaticamente).</Step>
          <Step n={4}>Adicione a justificativa e, se necessário, o local do serviço.</Step>
          <Step n={5}>Clique em <strong>Salvar Registro</strong>.</Step>
        </div>
        <Note type="info">
          Chefes e administradores: o registro é salvo diretamente como <strong>Aprovado</strong>. Auxiliares administrativos: o registro fica como <strong>Pendente</strong> até aprovação do chefe do setor.
        </Note>
        <H2>Escala em Lote</H2>
        <div className="space-y-2 mb-4">
          <Step n={1}>Informe o nome da escala, setor e mês de referência (fixo no mês atual).</Step>
          <Step n={2}>Selecione os militares que participarão da escala (até 10).</Step>
          <Step n={3}>Clique nos dias do calendário para marcar as datas de serviço de cada militar.</Step>
          <Step n={4}>Revise o resumo na tela de confirmação, incluindo o calendário visual com as cores de cada militar.</Step>
          <Step n={5}>Clique em <strong>Lançar Escala</strong> para finalizar.</Step>
        </div>
        <Note type="warning">
          A escala só pode ser lançada dentro da janela de lançamento do mês de referência.
        </Note>
      </>
    ),
  },

  // ── Minhas Horas ─────────────────────────────────────────────────────────────
  {
    id: "minhas-horas",
    title: "Minhas Horas",
    icon: Clock,
    roles: ["all"],
    content: (
      <>
        <P>
          A página <strong>Minhas Horas</strong> lista todos os registros de horas extras do usuário logado, com filtros por mês, ano e status.
        </P>
        <H2>Status dos registros</H2>
        <div className="grid gap-2 mb-4">
          {[
            { label: "Pendente",  color: "bg-amber-100 text-amber-700",   desc: "Aguardando aprovação do chefe ou admin." },
            { label: "Aprovado",  color: "bg-emerald-100 text-emerald-700", desc: "Registro validado e contabilizado." },
            { label: "Rejeitado", color: "bg-red-100 text-red-700",       desc: "Registro recusado; verifique a nota de revisão." },
          ].map(({ label, color, desc }) => (
            <div key={label} className="flex gap-3 items-center">
              <Badge className={cn("text-xs", color)}>{label}</Badge>
              <span className="text-sm text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
        <H2>Ações disponíveis</H2>
        <UL>
          <LI>Clique em um registro para ver o detalhe completo.</LI>
          <LI>Registros com status <strong>Pendente</strong> podem ser editados ou excluídos.</LI>
          <LI>Registros <strong>Aprovados</strong> ou <strong>Rejeitados</strong> não podem ser alterados.</LI>
        </UL>
        <Note type="info">
          Use o botão <strong>Exportar PDF</strong> no detalhe do registro para gerar um comprovante imprimível.
        </Note>
      </>
    ),
  },

  // ── Escalas ───────────────────────────────────────────────────────────────────
  {
    id: "escalas",
    title: "Escalas em Lote",
    icon: CalendarRange,
    roles: ["all"],
    content: (
      <>
        <P>
          A listagem de escalas exibe todas as escalas criadas pelo usuário logado, com filtros por mês, ano e status.
        </P>
        <H2>Status das escalas</H2>
        <UL>
          <LI><strong>Rascunho</strong> — escala salva mas ainda não lançada. Pode ser editada.</LI>
          <LI><strong>Lançada</strong> — escala enviada para aprovação. Os registros individuais ficam como Pendente.</LI>
          <LI><strong>Aprovada</strong> — todos os registros da escala foram aprovados.</LI>
        </UL>
        <H2>Ações na listagem</H2>
        <UL>
          <LI><strong>Ver</strong> — abre o detalhe completo da escala com calendário visual.</LI>
          <LI><strong>Lançar</strong> — envia a escala para aprovação (disponível apenas em Rascunho).</LI>
          <LI><strong>Duplicar</strong> — cria uma cópia da escala para o mês seguinte, mantendo os mesmos militares e horários. A nova escala é criada como Rascunho.</LI>
          <LI><strong>Exportar PDF</strong> — gera documento imprimível com todos os registros da escala.</LI>
        </UL>
        <Note type="info">
          Ao duplicar, as datas são transpostas automaticamente para o mês seguinte e a modalidade (Especial/Extraordinário) é recalculada conforme o dia da semana.
        </Note>
      </>
    ),
  },

  // ── Meu Setor ─────────────────────────────────────────────────────────────────
  {
    id: "meu-setor",
    title: "Meu Setor",
    icon: Building2,
    roles: ["chefe"],
    content: (
      <>
        <P>
          O painel <strong>Meu Setor</strong> é exclusivo para chefes de setor. Exibe todos os registros e escalas dos militares vinculados ao setor, com totalizadores e filtros.
        </P>
        <H2>Totalizadores</H2>
        <UL>
          <LI><strong>Escalas do Setor</strong> — total de escalas criadas no período.</LI>
          <LI><strong>Lançadas/Aprovadas</strong> — escalas já enviadas ou concluídas.</LI>
          <LI><strong>Total de Horas</strong> — soma de horas aprovadas no setor no período.</LI>
        </UL>
        <H2>Filtros disponíveis</H2>
        <UL>
          <LI>Mês e ano de referência.</LI>
          <LI>Status (Todos, Pendente, Aprovado, Rejeitado).</LI>
        </UL>
        <H2>Aprovação de registros</H2>
        <P>
          O chefe pode aprovar ou rejeitar registros pendentes diretamente nesta tela, sem precisar acessar o Painel Admin. Ao rejeitar, é possível adicionar uma nota explicativa.
        </P>
        <Note type="success">
          Sempre que um auxiliar lança um registro ou uma escala, o chefe do setor recebe uma notificação automática no sino da barra lateral.
        </Note>
      </>
    ),
  },

  // ── Notificações ─────────────────────────────────────────────────────────────
  {
    id: "notificacoes",
    title: "Notificações",
    icon: Bell,
    roles: ["chefe", "admin"],
    content: (
      <>
        <P>
          O sistema envia notificações automáticas sempre que um novo registro ou escala é lançado por um auxiliar administrativo do setor.
        </P>
        <H2>Sino de notificações</H2>
        <P>
          O ícone de sino na barra lateral exibe um badge vermelho com a contagem de notificações não lidas. Clique no sino para abrir o painel de notificações.
        </P>
        <H2>Painel de notificações</H2>
        <UL>
          <LI>Exibe as últimas 30 notificações com ícone por tipo, nome do remetente e tempo relativo.</LI>
          <LI>Clique em uma notificação de escala para ir diretamente ao detalhe da escala.</LI>
          <LI>Use <strong>"Marcar todas como lidas"</strong> para zerar o badge de uma vez.</LI>
        </UL>
        <Note type="info">
          O contador de notificações é atualizado automaticamente a cada 30 segundos, sem necessidade de recarregar a página.
        </Note>
      </>
    ),
  },

  // ── Relatórios ────────────────────────────────────────────────────────────────
  {
    id: "relatorios",
    title: "Relatórios",
    icon: BarChart3,
    roles: ["admin", "chefe"],
    content: (
      <>
        <P>
          O módulo de relatórios consolida os dados de horas extras por período, setor e militar, com gráficos e tabelas exportáveis.
        </P>
        <H2>Filtros disponíveis</H2>
        <UL>
          <LI>Período (mês e ano).</LI>
          <LI>Setor / departamento.</LI>
          <LI>Militar específico.</LI>
          <LI>Modalidade (Extraordinário / Especial).</LI>
        </UL>
        <H2>Exportação</H2>
        <UL>
          <LI>Clique em <strong>Exportar PDF</strong> para gerar o relatório consolidado.</LI>
          <LI>O PDF inclui totais por militar e por modalidade.</LI>
        </UL>
      </>
    ),
  },

  // ── Painel Admin ─────────────────────────────────────────────────────────────
  {
    id: "admin",
    title: "Painel Admin",
    icon: Shield,
    roles: ["admin"],
    content: (
      <>
        <P>
          O Painel Admin centraliza as operações de aprovação e gestão do sistema. Acessível apenas para administradores.
        </P>
        <H2>Aprovação de registros</H2>
        <div className="space-y-2 mb-4">
          <Step n={1}>Acesse <strong>Painel Admin</strong> no menu lateral.</Step>
          <Step n={2}>Filtre por mês, setor ou status para localizar os registros pendentes.</Step>
          <Step n={3}>Clique em <strong>Aprovar</strong> ou <strong>Rejeitar</strong> em cada registro.</Step>
          <Step n={4}>Ao rejeitar, adicione uma nota explicativa para o militar.</Step>
        </div>
        <Note type="warning">
          Registros aprovados não podem ser revertidos. Verifique os dados antes de confirmar.
        </Note>
      </>
    ),
  },

  // ── Usuários ─────────────────────────────────────────────────────────────────
  {
    id: "usuarios",
    title: "Gestão de Usuários",
    icon: Users,
    roles: ["admin"],
    content: (
      <>
        <P>
          Em <strong>Admin → Usuários</strong>, o administrador gerencia todos os militares cadastrados no sistema.
        </P>
        <H2>Cadastrar novo usuário</H2>
        <div className="space-y-2 mb-4">
          <Step n={1}>Clique em <strong>Novo Usuário</strong>.</Step>
          <Step n={2}>Preencha nome, e-mail, matrícula, posto/graduação, setor e perfil.</Step>
          <Step n={3}>Clique em <strong>Cadastrar Usuário</strong>.</Step>
        </div>
        <H2>Perfis disponíveis</H2>
        <UL>
          <LI><strong>Administrador</strong> — acesso total ao sistema.</LI>
          <LI><strong>Chefe</strong> — acesso ao setor e aprovação de registros dos auxiliares.</LI>
          <LI><strong>Aux. Administrativo</strong> — lança registros que ficam pendentes até aprovação.</LI>
        </UL>
        <H2>Outras ações</H2>
        <UL>
          <LI><strong>Editar</strong> — atualiza dados cadastrais do militar.</LI>
          <LI><strong>Desativar / Ativar</strong> — bloqueia ou reativa o acesso sem excluir o histórico.</LI>
          <LI><strong>Excluir</strong> — remove permanentemente o usuário e todos os seus dados. Esta ação não pode ser desfeita.</LI>
        </UL>
        <Note type="warning">
          O administrador não pode excluir a própria conta.
        </Note>
      </>
    ),
  },

  // ── Setores ───────────────────────────────────────────────────────────────────
  {
    id: "setores",
    title: "Gestão de Setores",
    icon: Building2,
    roles: ["admin"],
    content: (
      <>
        <P>
          Em <strong>Admin → Setores</strong>, o administrador cadastra e gerencia os setores (departamentos) da organização.
        </P>
        <H2>Cadastrar setor</H2>
        <div className="space-y-2 mb-4">
          <Step n={1}>Clique em <strong>Novo Setor</strong>.</Step>
          <Step n={2}>Informe o nome do setor e selecione o chefe responsável.</Step>
          <Step n={3}>Clique em <strong>Salvar</strong>.</Step>
        </div>
        <Note type="info">
          O chefe definido no setor recebe notificações automáticas quando auxiliares do setor lançam registros.
        </Note>
        <H2>Vincular militares</H2>
        <P>
          O vínculo de um militar a um setor é feito no cadastro do usuário, no campo <strong>Setor</strong>.
        </P>
      </>
    ),
  },

  // ── Permissões ────────────────────────────────────────────────────────────────
  {
    id: "permissoes",
    title: "Gestão de Permissões",
    icon: Settings,
    roles: ["admin"],
    content: (
      <>
        <P>
          Em <strong>Admin → Permissões</strong>, o administrador controla quais funcionalidades cada perfil pode acessar.
        </P>
        <H2>Como funciona</H2>
        <P>
          A tabela exibe todas as permissões do sistema agrupadas por categoria (Dashboard, Registros, Escalas, Relatórios, Administração). Cada linha tem um toggle por perfil (Admin, Chefe, Aux. Administrativo).
        </P>
        <H2>Aplicar alterações</H2>
        <div className="space-y-2 mb-4">
          <Step n={1}>Localize a permissão desejada na tabela.</Step>
          <Step n={2}>Clique no toggle do perfil correspondente para ativar ou desativar.</Step>
          <Step n={3}>A alteração é salva imediatamente e o menu lateral dos usuários é atualizado na próxima navegação.</Step>
        </div>
        <Note type="warning">
          Desativar permissões de um perfil afeta todos os usuários com aquele perfil. Revise com cuidado antes de alterar.
        </Note>
      </>
    ),
  },

  // ── Segurança e Acesso ────────────────────────────────────────────────────────
  {
    id: "seguranca",
    title: "Acesso e Segurança",
    icon: Lock,
    roles: ["all"],
    content: (
      <>
        <H2>Login</H2>
        <P>
          O acesso ao sistema é feito via <strong>Manus OAuth</strong>. Clique em <strong>"Entrar com Manus"</strong> na tela inicial e autentique-se com sua conta Google ou e-mail cadastrado.
        </P>
        <H2>Sessão</H2>
        <UL>
          <LI>A sessão é mantida por cookie seguro e expira automaticamente após inatividade prolongada.</LI>
          <LI>Para encerrar a sessão, clique no seu nome na barra lateral e selecione <strong>Sair</strong>.</LI>
        </UL>
        <H2>Visibilidade dos dados</H2>
        <UL>
          <LI><strong>Auxiliar Administrativo</strong> — vê apenas os próprios registros.</LI>
          <LI><strong>Chefe</strong> — vê os registros de todos os militares do seu setor.</LI>
          <LI><strong>Admin</strong> — vê todos os registros do sistema.</LI>
        </UL>
        <Note type="info">
          Navegadores com bloqueio de cookies (Safari Privado, Brave Agressivo) podem impedir o login. Use Chrome ou Firefox em modo normal.
        </Note>
      </>
    ),
  },
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function UserGuide() {
  const { user } = useAuth();
  const [active, setActive] = useState("visao-geral");
  const [search, setSearch] = useState("");

  const role = user?.role as "admin" | "chefe" | "auxiliar_administrativo" | undefined;

  const filtered = SECTIONS.filter((s) => {
    const roleOk = s.roles.includes("all") || (role && s.roles.includes(role));
    const searchOk = !search || s.title.toLowerCase().includes(search.toLowerCase());
    return roleOk && searchOk;
  });

  const activeSection = SECTIONS.find((s) => s.id === active) ?? filtered[0];

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar do guia */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Guia do Usuário</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{s.title}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            Versão do guia: Jun/2026
          </p>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Mobile: select de seção */}
          <div className="md:hidden mb-6">
            <select
              value={active}
              onChange={(e) => setActive(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card text-foreground"
            >
              {filtered.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          {activeSection && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <activeSection.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{activeSection.title}</h1>
                  <div className="flex gap-1 mt-1">
                    {activeSection.roles.includes("all") ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">Todos os perfis</Badge>
                    ) : (
                      activeSection.roles.map((r) => <RoleBadge key={r} role={r} />)
                    )}
                  </div>
                </div>
              </div>
              <div>{activeSection.content}</div>
            </>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma seção encontrada para "{search}".</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
