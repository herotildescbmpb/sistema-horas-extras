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

## Correções de Bugs — Simulação de Primeiro Acesso (v13)

- [x] Corrigir bug da sidebar ausente após login local: mover AppLayout para App.tsx como wrapper global de rotas protegidas
- [x] Remover AppLayout duplicado de NovoRegistro.tsx, MeuSetor.tsx, EscalaWizard.tsx, OvertimeForm.tsx, EscalaList.tsx, EscalaDetail.tsx
- [x] Implementar lógica de aprovação diferenciada por perfil: chefe/admin → status "approved"; auxiliar_administrativo → status "pending" (overtime.create)
- [x] Implementar mesma lógica no lançamento de escalas em lote: launchEscala aceita parâmetro autoApprove; escalas.launch passa autoApprove baseado no role

## Correções de Validação e Manutenção (v14)

- [x] Fix 9 — Guard server-side em overtime.create: rejeita totalMinutes <= 0 ou >= 1440
- [x] Fix 9 — Guard server-side em overtime.update: mesma validação de duração
- [x] Fix 10 — calcMinutes backend: corrigido para usar < em vez de <= (horários iguais retornam 0)
- [x] Fix 10 — calcMinutes frontend (OvertimeForm): mesma correção para consistência
- [x] OvertimeForm: feriados expandidos (Consciência Negra, Nossa Senhora das Neves, São Francisco de Assis)
- [x] OvertimeForm: schema Zod com refine validando startTime !== endTime
- [x] OvertimeForm: campo endDate adicionado ao schema e defaultValues
- [x] OvertimeForm: guard client-side antes do envio (totalMinutes <= 0 ou >= 1440)
- [x] OvertimeForm: endDate enviado no payload (isoEndDate)
- [x] drizzle/relations.ts: relações declaradas (usersRelations, departmentsRelations, overtimeRecordsRelations)
- [x] client/index.html: comentário legado de Google Fonts removido

## Correção do Fluxo de Autenticação Local (v15)

- [x] Auditar localLogin, contexto JWT e função getUserByEmail no fluxo completo
- [x] Definir senha padrão 20262026 para os 5 usuários pré-cadastrados sem senha (admin, Hedwing, Jose Fragoso, Igor, Síntia)
- [x] Adicionar guard no sdk.ts: não tentar sincronizar com OAuth para openIds locais (pre_* ou local_*)
- [x] Testar login de usuário pré-cadastrado do início ao fim (admin@cbmpb.pb.gov.br → troca de senha → dashboard)

## Recuperação de Senha por E-mail (v16)

- [x] Instalar SDK Resend e criar helper server/_core/email.ts com sendEmail e sendPasswordResetEmail
- [x] Criar tabela password_reset_tokens no schema Drizzle e aplicar migração SQL
- [x] Funções db.ts: createPasswordResetToken, validatePasswordResetToken, consumePasswordResetToken
- [x] Endpoint auth.forgotPassword: gerar token, salvar no banco, enviar e-mail com link (1h de validade)
- [x] Endpoint auth.resetPasswordByToken: validar token, atualizar senha, consumir token
- [x] Endpoint auth.validateResetToken: pré-validar token antes de exibir formulário
- [x] Tela ForgotPassword (/forgot-password): formulário de e-mail com estado de confirmação
- [x] Tela ResetPassword (/reset-password?token=...): formulário nova senha + confirmação + toggle visibilidade
- [x] Adicionar link "Esqueci minha senha" na tela de Login
- [x] Corrigir useQueryParam para usar window.location.search (wouter não expõe query string)
- [x] Testar fluxo completo de ponta a ponta (token gerado → redefinição → sucesso)
- [x] Verificar domínio dalgest.sbs no painel Resend — PENDENTE EXTERNO: requer ação manual do usuário em resend.com/domains

## Exportação CSV — Relatórios (v17)

- [x] Endpoint backend reports.exportCsvDal: exportar registros no formato exato do modelo DAL (separador ;, 8 colunas, 100 linhas com padding de linhas vazias)
- [x] Botão "Exportar CSV (DAL)" adicionado na tela de Relatórios ao lado do botão existente
- [x] Botão desabilitado quando não há registros no período selecionado
- [x] Nome do arquivo gerado: escalas_dal_{startDate}_{endDate}.csv

## Filtro por Setor nos Relatórios (v18)

- [x] Adicionar seletor de setor na tela de Relatórios (visível apenas para admin)
- [x] Atualizar endpoint reports.exportCsvDal para aceitar filtro de departamento
- [x] Atualizar getAllOvertimeRecords no db.ts para suportar filtro por department (via users.department)
- [x] Atualizar overtime.listAll para aceitar filtro department
- [x] Atualizar a query de listagem de registros na tela de Relatórios para respeitar o setor selecionado
- [x] Testar dropdown com 9 setores carregados corretamente

## Ajustes na Tela de Relatórios — Servidor vs Cadastrante (v20)

- [x] Registros do Período: exibir nome do servidor (nomeServidor via JOIN com tabela servidores) em vez do usuário cadastrante
- [x] Filtro renomeado para "Servidor": lista servidores distintos com horas no período via endpoint reports.listServidores
- [x] Endpoint reports.listServidores criado no backend para popular o dropdown de filtro

## Ajustes na Tela de Relatórios — Servidor vs Cadastrante (v20)

- [x] Nos "Registros do Período", exibir o nome do servidor (nomeServidor via JOIN com tabela servidores) em vez do usuário cadastrante
- [x] No filtro renomeado de "Funcionário" para "Servidor", listar servidores distintos com horas no período via endpoint reports.listServidores
- [x] Filtro por servidor passa matrícula para overtime.listAll e exportCsvDal
- [x] getAllOvertimeRecords aceita filtro por servidor (matrícula)
- [x] overtime.listAll aceita filtro servidor no input schema
- [x] exportCsvDal aceita filtro servidor no input schema

## Dashboard — Nome do Servidor nos Registros Recentes (v21)

- [x] getOvertimeRecordsByUser: adicionar LEFT JOIN com tabela servidores (SUBSTRING_INDEX) para retornar nomeServidor
- [x] Dashboard.tsx: exibir nomeServidor (ou fallback para servidor/matrícula) nos Registros Recentes

## Minhas Horas — Filtro por Servidor Beneficiário (v22)

- [x] getOvertimeRecordsByUser: adicionar filtro opcional por matrícula do servidor (campo `servidor`)
- [x] overtime.list: quando usuário tem matrícula cadastrada, filtrar por `servidor = matricula` do usuário logado
- [x] OvertimeList.tsx: exibir nome do servidor (nomeServidor) em cada registro
- [x] Exibir matrícula do usuário logado no cabeçalho da tela para referência

## Dashboard Analítico — Visualizações (v23)

- [x] Backend: endpoint reports.dashboardStats retorna horas por servidor (top 10), horas por setor, evolução mensal (últimos 6 meses), total geral
- [x] Backend: endpoint reports.dashboardStats aceita filtro de período (mês/ano) para admin
- [x] Frontend: instalar recharts (já instalado) e criar seção de gráficos no Dashboard
- [x] Frontend: gráfico de barras — horas por servidor (top 10 do período)
- [x] Frontend: gráfico de barras — horas por setor (comparativo)
- [x] Frontend: gráfico de linha — evolução mensal de horas (últimos 6 meses)
- [x] Frontend: seletor de período (mês/ano) no Dashboard para admin
- [x] Frontend: cards de resumo atualizados (total, aprovadas, pendentes, rejeitadas)
- [x] Frontend: registros recentes mantidos com nome do servidor

## Agente Bravo Escalas — Automação de Lançamento

- [ ] Mapear IDs dos selects do formulário addServico (tipo de escala, função, mobilidade)
- [ ] Criar tabela `bravo_lancamentos` no banco para controle de duplicatas
- [ ] Criar tabela `bravo_escalas_mes` para registrar a escala criada por mês
- [ ] Endpoint `bravo.getStatus`: retornar status dos lançamentos do mês atual
- [ ] Endpoint `bravo.triggerSync`: disparar sincronização manual
- [ ] Script Playwright: login no Bravo Escalas
- [ ] Script Playwright: criar nova escala no primeiro dia do mês (EXTRA EXPEDIENTE, homologador 521291)
- [ ] Script Playwright: lançar cada registro aprovado do CSV DAL na escala do mês
- [ ] Script Playwright: verificar duplicatas antes de lançar
- [ ] Script Playwright: gerar relatório de erros e sucessos
- [ ] Tela BravoSync.tsx: painel de controle com status, botão de sync manual, log de lançamentos
- [ ] Agendamento diário às 00:01 via heartbeat
- [ ] Notificação ao owner em caso de falha no lançamento

## Agente Bravo Escalas — Automação (v26)

- [x] Tabelas `bravo_escalas_mes`, `bravo_lancamentos`, `bravo_sync_logs` criadas no banco
- [x] Script `server/bravo-agent.ts` com Playwright: login, criar escala mensal, lançar serviços, controle de duplicatas
- [x] Endpoint tRPC `bravo.status`, `bravo.triggerSync`, `bravo.logs`, `bravo.lancamentos`
- [x] Endpoint Express `/api/scheduled/bravo-sync` para heartbeat agendado
- [x] Tela `BravoSync.tsx` com painel de controle, histórico de execuções e lançamentos por mês
- [x] Link "Bravo Sync" na sidebar (admin only)
- [x] Credenciais BRAVO_EMAIL, BRAVO_PASSWORD, BRAVO_HOMOLOGADOR_ID configuradas
- [x] Deploy do site (necessário para ativar o agendamento automático)
- [x] Criar heartbeat cron via CLI após o deploy — task_uid: bh5Bpw3cqRPRexZyK7viFv (00:01 BRT diário)

## Melhorias v28 — Painel Admin · Horários Sáb/Dom/Feriado · Feriados Manuais

### Melhoria 1 — Painel Admin Completo (AdminEscalas)
- [ ] Backend: confirmar/criar overtime.listAll (adminProcedure) com JOIN em users, paginação e totalCount
- [ ] Backend: criar overtime.adminUpdate (adminProcedure) para edição completa de qualquer registro
- [ ] Backend: confirmar overtime.delete aceita qualquer id (admin)
- [ ] Frontend: criar AdminEscalas.tsx com filtros, tabela paginada, modal de edição parcial, AlertDialog de exclusão
- [ ] AppLayout: adicionar item "Escalas (Admin)" → /admin/escalas
- [ ] App.tsx: adicionar rota /admin/escalas

### Melhoria 2 — Horários Estendidos Sáb/Dom/Feriado
- [ ] Criar client/src/lib/timeSlots.ts com SLOTS_WEEKDAY (13:00–23:50) e SLOTS_EXTENDED (07:30–23:50)
- [ ] OvertimeForm.tsx: usar slots dinâmicos baseados no dia da semana e feriados customizados
- [ ] OvertimeForm.tsx: criar isHoliday() combinando isBrazilianHoliday() + feriados do banco
- [ ] BatchSchedule.tsx: aplicar mesma lógica de slots dinâmicos

### Melhoria 3 — Gestão de Feriados pelo Admin
- [ ] Schema Drizzle: adicionar tabela customHolidays em drizzle/schema.ts
- [ ] Migration SQL: CREATE TABLE custom_holidays e aplicar via webdev_execute_sql
- [ ] Backend db.ts: listCustomHolidays, createCustomHoliday, updateCustomHoliday, deleteCustomHoliday
- [ ] Backend routers.ts: criar router holidays (list protectedProcedure; create/update/delete adminProcedure)
- [ ] Frontend: criar AdminFeriados.tsx com lista de feriados automáticos + tabela de feriados manuais
- [ ] AppLayout: adicionar item "Feriados" → /admin/feriados
- [ ] App.tsx: adicionar rota /admin/feriados
- [x] Criar modo "Expediente CMAV" no EscalaWizard: tipo restrito ao setor CMAV, horários pré-definidos por tipo de dia (sáb/dom/feriado: 07:30–19:30; dias úteis: 13:00–19:00), interface simplificada de atribuição de militares por dia do calendário
