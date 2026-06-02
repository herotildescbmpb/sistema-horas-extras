# Sistema de Horas Extras - TODO

## Backend / Schema
- [x] Criar tabela `overtime_records` no schema Drizzle
- [x] Criar tabela `departments` (setores/projetos) no schema Drizzle
- [x] Gerar migration e aplicar via drizzle-kit migrate
- [x] Adicionar queries em server/db.ts para overtime_records e departments
- [x] Criar router tRPC: overtime (list, create, update, delete, approve, reject)
- [x] Criar router tRPC: departments (list, create)
- [x] Criar router tRPC: reports (summary, export)
- [x] Criar router tRPC: users (list, updateProfile, setRole)

## Frontend / Design System
- [x] Configurar design system elegante no index.css (cores navy/gold, tipografia Inter + Plus Jakarta Sans)
- [x] Criar AppLayout com sidebar elegante (dark navy, colapso, mobile)
- [x] Implementar página de Login / Landing (tela de autenticação integrada no layout)
- [x] Implementar Dashboard com resumo mensal, total de horas, valor estimado e registros recentes
- [x] Implementar página de Cadastro de Horas Extras (formulário completo com seletor de tipo de dia)
- [x] Implementar página de Listagem com filtros por período, status
- [x] Implementar edição de registro via rota /horas/:id/editar
- [x] Implementar exclusão de registro com confirmação (AlertDialog)
- [x] Criar componentes StatusBadge e DayTypeBadge reutilizáveis

## Painel Administrativo
- [x] Implementar painel admin para visualizar horas de todos os funcionários
- [x] Implementar aprovação/rejeição de horas extras com nota de revisão
- [x] Implementar gerenciamento de usuários (admin) com edição de perfil e cargo
- [x] Implementar controle de perfil (admin/funcionário) via select inline

## Relatórios e Exportação
- [x] Implementar geração de relatório por período com presets (este mês, mês passado, semana, 3 meses)
- [x] Implementar gráfico de horas por tipo de dia (Recharts)
- [x] Implementar exportação em CSV com BOM UTF-8

## Testes
- [x] Escrever testes Vitest para routers principais (9 testes passando)

## Adaptação para campos do CSV de Escalas
- [x] Adicionar colunas no schema: `tipoEscala`, `servidor` (matrícula), `endDate`, `funcao`, `modalidade`
- [x] Gerar e aplicar migration SQL via webdev_execute_sql
- [x] Atualizar queries em server/db.ts para incluir novos campos
- [x] Atualizar routers tRPC (create, update, list, export)
- [x] Atualizar formulário de cadastro com todos os novos campos
- [x] Atualizar listagem para exibir matrícula, tipo de escala, função e modalidade
- [x] Atualizar exportação CSV para incluir todos os campos do CSV original
- [x] Adicionar campo matrícula no perfil do usuário
- [x] Atualizar testes Vitest para cobrir novos campos

## Melhorias no Formulário de Cadastro (v3)
- [x] Criar tabela `servidores` no banco com campos: matricula, digito, posto, nome, email, telefone
- [x] Popular tabela com os 383 servidores do arquivo Oficiais(1).xlsx
- [x] Criar endpoint tRPC `servidores.search` para busca por nome com autocomplete
- [x] Tipos de escala: Expediente, Formatura, Instrução e Treinamento, Operacional, Prontidão, Representação, Sobreaviso
- [x] Campo servidor: autocomplete por nome → preenche matrícula e posto automaticamente
- [x] Campo matrícula: separado e preenchido automaticamente pelo autocomplete
- [x] Data em formato DD/MM/AAAA com formatação automática
- [x] Hora início: dropdown de 13:00 a 23:50 a cada 10 minutos
- [x] Hora fim: dropdown de 13:00 a 23:50 a cada 10 minutos
- [x] Funções: Chefe, Auxiliar Administrativo, Diretor, Vice-Diretor
- [x] Modalidade: automática pela data (sexta/sábado/domingo/feriado → Especial; demais → Extraordinário)
- [x] Manter campo de justificativa
- [x] Todos os campos obrigatórios para salvar
- [x] Exibir horas do registro em andamento (calculado em tempo real)
- [x] Exibir total de horas já registradas no mês correspondente

## Setores DAL/CBMPB e Gerenciamento de Usuários
- [x] Inserir os 7 setores do PCA DAL/CBMPB no banco (substituindo setores genéricos)
- [x] Adicionar coluna `chefe_id` na tabela departments (FK para users)
- [x] Adicionar coluna `department` e `status` na tabela users
- [x] Criar migration e aplicar via webdev_execute_sql
- [x] Atualizar router departments: listar com chefe, atribuir/remover chefe
- [x] Criar router admin.users: listar, criar convite/pré-cadastro, editar, ativar/desativar, redefinir senha
- [x] Criar página AdminUsers completa com tabela (Nome, E-mail, Setor, Perfil, Status, Ações)
- [x] Criar modal de cadastro de novo usuário (Nome, E-mail, Setor, Perfil)
- [x] Criar modal de edição de usuário existente
- [x] Criar funcionalidade de redefinição de senha pelo admin
- [x] Criar página AdminDepartments com lista de setores e atribuição de chefe
- [x] Atualizar AppLayout com novos itens de navegação

## Cadastro de Usuários Iniciais (v5)
- [x] Inserir os 9 usuários da imagem no banco com nome, e-mail, setor e perfil corretos
- [x] Criar endpoint tRPC `users.create` (admin only) para cadastrar novos usuários pré-cadastrados
- [x] Criar modal de cadastro de novo usuário no AdminUsers com campos: Nome, E-mail, Setor, Perfil, Matrícula, Posto
- [x] Adicionar botão "+ Novo Usuário" no cabeçalho da tela AdminUsers

## Escala em Lote — Wizard Multi-Servidor (v6)
- [x] Criar tabela `escalas` (escala-mãe) e `escala_items` (registros individuais) no schema
- [x] Criar migration e aplicar via webdev_execute_sql
- [x] Criar routers tRPC: escalas.create, escalas.list, escalas.getById, escalas.launch, exportPdf (client-side), exportCsv (client-side)
- [x] Criar página EscalaWizard com 4 etapas: Configuração → Calendário → Militares → Resumo
- [x] Etapa 1: Tipo de escala, hora início/fim, função, modalidade, setor, justificativa
- [x] Etapa 2: Calendário visual do mês com seleção de dias (clique), identificação de dias da semana, feriados
- [x] Etapa 3: Adicionar até 10 militares via autocomplete, com ajuste individual por dia se necessário
- [x] Etapa 4: Resumo visual em grade (militares × dias) com total de horas por militar
- [x] Exportação PDF do resumo da escala (via window.print)
- [x] Exportação CSV/Excel do resumo da escala
- [x] Botão "Salvar Rascunho" e botão "Lançar Escala"
- [x] Remover campo "projeto" do formulário individual
- [x] Adicionar item "Escalas em Lote" no menu de navegação

## Duplicar Escala para Próximo Mês (v8)
- [x] Criar endpoint tRPC `escalas.duplicate` que cria cópia para o próximo mês com os mesmos militares
- [x] Adicionar botão "Duplicar" na listagem de escalas com confirmação
- [x] Exibir toast de sucesso com link para a nova escala duplicada

## Wizard Escala — Novo Fluxo por Militar (v7)
- [x] Novo fluxo: Configuração → Militar 1 (dados + calendário) → Militar 2... → Revisão → Lançamento
- [x] Cada militar tem seu próprio calendário com dias distintos
- [x] Após preencher dados e dias do militar, botão "Adicionar outro militar" (até 10)
- [x] Etapa de revisão: registros organizados por calendário visual (grade mês × militares)
- [x] Edição individual de cada registro na revisão (horário, função, modalidade)
- [x] Calendário visual completo mostrando todos os lançamentos antes da finalização
- [x] Pop-up de alerta: lançamento não pode ser desfeito, com confirmação explícita
- [x] Testes e checkpoint

## Janela de Lançamento e Acesso do Chefe (v9)
- [x] Helper `getLaunchWindow()` retorna { mesRef, anoRef, dataInicio, dataFim } com janela do mês atual (01/mês a 01/mês+1)
- [x] Formulário único (OvertimeForm): mês/ano fixo no mês atual, campo data bloqueado fora da janela, banner de aviso fora da janela
- [x] Wizard de escala (EscalaWizard): mês fixo no mês atual, bloquear seleção de datas fora da janela, banner de aviso
- [x] Endpoint tRPC `chefe.listOvertimes` e `chefe.listEscalas`: chefe vê registros e escalas do seu setor
- [x] Endpoint tRPC `chefe.myDepartment`: retorna o setor onde o usuário é chefe
- [x] Painel do chefe de setor (MeuSetor.tsx): listagem de registros e escalas dos usuários do seu setor (rascunho e lançado)
- [x] Navegação: adicionar item "Meu Setor" no menu para chefes

## Sistema de Notificações Visuais para Chefe (v10)
- [x] Criar tabela `notifications` no schema Drizzle (id, userId, type, title, body, read, createdAt, relatedId, relatedType)
- [x] Gerar migration e aplicar via webdev_execute_sql
- [x] Criar helpers em server/db.ts: createNotification, getNotificationsByUser, markNotificationRead, markAllRead
- [x] Criar endpoints tRPC: notifications.list, notifications.markRead, notifications.markAllRead, notifications.unreadCount
- [x] Disparar notificação ao chefe ao lançar escala (escalas.launch)
- [x] Disparar notificação ao chefe ao criar registro único (overtime.create)
- [x] Criar componente NotificationBell na sidebar com badge de contagem e polling a cada 30s
- [x] Criar painel dropdown de notificações com lista, marcar como lida e link para o registro
- [x] Polling automático a cada 30s para atualizar contagem sem recarregar a página

## Perfis de Usuário e Gestão de Permissões (v11)

- [x] Migrar enum `role` no schema: `user` → `chefe`, adicionar `auxiliar_administrativo`, manter `admin`
- [x] Gerar migration SQL e aplicar via webdev_execute_sql
- [x] Criar tabela `role_permissions` (role, permission_key, enabled, label, category)
- [x] Seed de permissões padrão para cada perfil
- [x] Endpoints tRPC: `permissions.list`, `permissions.update`, `permissions.getMyPermissions`
- [x] Atualizar sidebar para exibir itens conforme permissões do perfil
- [x] Atualizar painel admin de usuários para mostrar e editar os três perfis
- [x] Criar página `/admin/permissoes` com tabela de permissões por perfil (toggle por linha)
- [x] Adicionar item "Permissões" no menu admin

## Autenticação Local (e-mail + senha) (v12)

- [x] Adicionar colunas `passwordHash` e `mustChangePassword` na tabela users
- [x] Instalar bcryptjs para hash de senha
- [x] Criar endpoint `auth.localLogin` (e-mail + senha → JWT de sessão local)
- [x] Criar endpoint `auth.changePassword` (troca de senha com validação)
- [x] Definir senha padrão `20262026` ao cadastrar novo usuário pelo admin
- [x] Criar tela de login local (`/login`) com campos e-mail e senha
- [x] Criar modal de troca obrigatória de senha (exibido quando `mustChangePassword = true`)
- [x] Integrar sessão local com o contexto `useAuth()` do frontend
- [x] Atualizar guia do usuário com instruções de login local
