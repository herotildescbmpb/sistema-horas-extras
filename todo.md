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
