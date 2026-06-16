/**
 * Agente de Automação — Bravo Escalas
 *
 * Responsabilidades:
 * 1. No primeiro dia do mês: criar nova escala "EXTRA EXPEDIENTE" no Bravo
 * 2. Diariamente às 00:01: lançar registros aprovados do CSV DAL na escala do mês
 * 3. Controle de duplicatas via tabela bravo_lancamentos
 * 4. Geração de relatório de erros via notificação ao owner
 */

import { chromium, Browser, Page } from "playwright";
import { getDb } from "./db";
import {
  bravoEscalasMes,
  bravoLancamentos,
  bravoSyncLogs,
  overtimeRecords,
  servidores,
} from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// ─── Configuração ─────────────────────────────────────────────────────────────
const BRAVO_URL = "https://bravo.bombeiros.pb.gov.br/bravoEscalas/acessoInterno/";
const BRAVO_EMAIL = "herooliveira2@gmail.com";
const BRAVO_SENHA = "Hero123@";
const BRAVO_HOMOLOGADOR_MATRICULA = "521291";
const BRAVO_TAGS = "EXTRA EXPEDIENTE";
const BRAVO_CIDADE = "João Pessoa";
const BRAVO_AGRUPAMENTO = "EXTRA EXPEDIENTE";
// Tipo de escala: 1=Expediente
const BRAVO_TIPO_ESCALA_ID = "1";
// Mobilidade: será detectada dinamicamente
const BRAVO_MOBILIDADE_TEXTO = "Permanente";

// Mapeamento de função (funcao) → id_escala_servico_tipo no Bravo
const FUNCAO_MAP: Record<string, string> = {
  "Auxiliar Administrativo": "21",
  "Chefe": "26",
  "Diretor": "9",
  "Vice-Diretor": "10",
  "Assessor": "12",
  "Assessor Adjunto": "19",
};

// Mapeamento de modalidade → id_escala_servico_categoria
const MODALIDADE_MAP: Record<string, string> = {
  "Extraordinário": "2",
  "Especial": "3",
  "Ordinário": "1",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMesAno(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getPrimeiroDiaMes(mesAno: string): string {
  return `${mesAno}-01`;
}

function getUltimoDiaMes(mesAno: string): string {
  const [y, m] = mesAno.split("-").map(Number);
  const ultimo = new Date(y, m, 0); // dia 0 do próximo mês = último do atual
  return `${y}-${String(m).padStart(2, "0")}-${String(ultimo.getDate()).padStart(2, "0")}`;
}

function isFirstDayOfMonth(): boolean {
  return new Date().getDate() === 1;
}

// ─── Funções de banco ─────────────────────────────────────────────────────────

async function getOrCreateEscalaMes(mesAno: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(bravoEscalasMes)
    .where(eq(bravoEscalasMes.mesAno, mesAno))
    .limit(1);
  if (existing.length > 0) return existing[0];

  await db.insert(bravoEscalasMes).values({ mesAno, status: "pending" });
  const newRow = await db
    .select()
    .from(bravoEscalasMes)
    .where(eq(bravoEscalasMes.mesAno, mesAno))
    .limit(1);
  return newRow[0];
}

async function getApprovedRecordsForMonth(mesAno: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [year, month] = mesAno.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = getUltimoDiaMes(mesAno);

  const records = await db
    .select({
      id: overtimeRecords.id,
      servidor: overtimeRecords.servidor,
      data: overtimeRecords.date,
      dataFim: overtimeRecords.endDate,
      horaInicio: overtimeRecords.startTime,
      horaFim: overtimeRecords.endTime,
      funcao: overtimeRecords.funcao,
      modalidade: overtimeRecords.modalidade,
      tipoEscala: overtimeRecords.tipoEscala,
    })
    .from(overtimeRecords)
    .where(
      and(
        eq(overtimeRecords.status, "approved"),
        sql`${overtimeRecords.date} >= ${startDate}`,
        sql`${overtimeRecords.date} <= ${endDate}`
      )
    );

  return records;
}

async function getLancamentosDoMes(escalaMesId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(bravoLancamentos)
    .where(eq(bravoLancamentos.bravoEscalaMesId, escalaMesId));
}

async function marcarLancamento(
  overtimeRecordId: number,
  escalaMesId: number,
  matricula: string,
  data: string,
  horaInicio: string,
  horaFim: string,
  status: "success" | "error" | "duplicate",
  errorMsg?: string,
  bravoServicoId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(bravoLancamentos)
    .where(
      and(
        eq(bravoLancamentos.overtimeRecordId, overtimeRecordId),
        eq(bravoLancamentos.bravoEscalaMesId, escalaMesId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(bravoLancamentos)
      .set({
        status,
        errorMsg: errorMsg || null,
        bravoServicoId: bravoServicoId || null,
        tentativas: existing[0].tentativas + 1,
        lancadoEm: status === "success" ? new Date() : undefined,
      })
      .where(eq(bravoLancamentos.id, existing[0].id));
  } else {
    await db.insert(bravoLancamentos).values({
      overtimeRecordId,
      bravoEscalaMesId: escalaMesId,
      matricula,
      data,
      horaInicio,
      horaFim,
      status,
      errorMsg: errorMsg || null,
      bravoServicoId: bravoServicoId || null,
      tentativas: 1,
      lancadoEm: status === "success" ? new Date() : undefined,
    });
  }
}

// ─── Automação Playwright ─────────────────────────────────────────────────────

async function loginBravo(page: Page): Promise<boolean> {
  try {
    await page.goto(BRAVO_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Aguardar o campo de e-mail aparecer (id="email_usuario", type="text")
    await page.waitForSelector('#email_usuario', { timeout: 15000 });
    await page.fill('#email_usuario', BRAVO_EMAIL);
    await page.fill('#senha_usuario', BRAVO_SENHA);
    // Clicar no botão Conectar-se
    await page.click('button:has-text("Conectar-se"), button[type="submit"]');
    // Aguardar redirecionamento para a tela principal
    await page.waitForURL(/main/, { timeout: 20000 });
    return true;
  } catch (e) {
    console.error("[BravoAgent] Erro no login:", e);
    return false;
  }
}

async function criarEscalaMes(page: Page, mesAno: string): Promise<number | null> {
  try {
    const primeiroDia = getPrimeiroDiaMes(mesAno);
    const ultimoDia = getUltimoDiaMes(mesAno);

    // Navegar para Gestão de Escalas
    const token = await page.evaluate(() => {
      const links: HTMLAnchorElement[] = [];
    document.querySelectorAll<HTMLAnchorElement>('a[href*="admEscala"]').forEach(el => links.push(el));
      return links[0]?.getAttribute("href") || "";
    });

    if (!token) {
      // Tentar pelo menu
      await page.click('a:has-text("Gestão de Escalas"), a:has-text("Nova Escala")');
    } else {
      await page.goto(`https://bravo.bombeiros.pb.gov.br${token}`, { waitUntil: "networkidle" });
    }

    // Clicar em Nova Escala
    await page.waitForSelector("#btnCriarNovaEscala", { timeout: 10000 });
    await page.click("#btnCriarNovaEscala");
    await page.waitForSelector("#formNovaEscala", { timeout: 10000 });

    // Preencher tags
    const tagsInput = page.locator('#formNovaEscala input[type="text"]').first();
    await tagsInput.fill(BRAVO_TAGS);

    // Data inicial
    await page.fill("#dt_escala_inicio", primeiroDia);
    // Data final
    await page.fill("#dt_escala_termino", ultimoDia);

    // Homologador (matrícula)
    await page.fill("#id_servidor_cmt", BRAVO_HOMOLOGADOR_MATRICULA);
    // Aguardar autocomplete ou pressionar Enter
    await page.keyboard.press("Tab");
    await page.waitForTimeout(1000);

    // Salvar
    await page.click("#btnSalvarNovaEscala");

    // Aguardar retorno com ID da escala
    await page.waitForTimeout(3000);

    // Tentar capturar o ID da escala criada
    const escalaId = await page.evaluate(() => {
      const retorno = document.getElementById("retornoNovaEscala");
      if (!retorno) return null;
      const links = Array.prototype.slice.call(retorno.querySelectorAll("a")) as HTMLAnchorElement[];
      for (let i = 0; i < links.length; i++) {
        const match = links[i].href.match(/escala=(\d+)/);
        if (match) return parseInt(match[1]);
      }
      // Tentar pelo texto
      const text = retorno.textContent || "";
      const numMatch = text.match(/(\d{5,})/);
      return numMatch ? parseInt(numMatch[1]) : null;
    });

    return escalaId;
  } catch (e) {
    console.error("[BravoAgent] Erro ao criar escala:", e);
    return null;
  }
}

async function lancarServico(
  page: Page,
  escalaId: number,
  record: {
    id: number;
    servidor: string | null;
    data: string | null;
    dataFim: string | null;
    horaInicio: string | null;
    horaFim: string | null;
    funcao: string | null;
    modalidade: string | null;
    tipoEscala: string | null;
  }
): Promise<{ success: boolean; bravoServicoId?: number; error?: string }> {
  try {
    const matricula = record.servidor?.split("-")[0]?.trim() || record.servidor || "";
    const data = record.data || "";
    const horaInicio = record.horaInicio || "13:00";
    const horaFim = record.horaFim || "19:00";
    const funcaoId = FUNCAO_MAP[record.funcao || ""] || FUNCAO_MAP["Auxiliar Administrativo"];
    const categoriaId = MODALIDADE_MAP[record.modalidade || ""] || MODALIDADE_MAP["Extraordinário"];

    // Navegar para a escala
    const escalaUrl = `https://bravo.bombeiros.pb.gov.br/bravoEscalas/acessoInterno/gestaoEscala/cadEscala/formEscalaOnline.php?limit=&escala=${escalaId}`;
    await page.goto(escalaUrl, { waitUntil: "networkidle", timeout: 20000 });

    // Aguardar o formulário carregar
    await page.waitForSelector("#formNovoServico", { timeout: 10000 });

    // Tipo de escala (Expediente = 1)
    await page.selectOption("#id_escala_tipo", BRAVO_TIPO_ESCALA_ID);
    await page.waitForTimeout(500);

    // Cidade
    await page.selectOption("#nm_cidade", BRAVO_CIDADE);

    // Servidor (matrícula)
    await page.fill("#id_servidor", matricula);
    await page.waitForTimeout(500);

    // Data início
    await page.fill("#dt_inicio", data);

    // Hora início — usar o select de hora
    await page.waitForTimeout(300);
    const horaIniSelect = page.locator("#nm_hora_ini, select[name='nm_hora_ini']").first();
    await horaIniSelect.selectOption(horaInicio);

    // Data fim
    const dataFim = record.dataFim || data;
    await page.fill("#dt_final", dataFim);

    // Hora fim
    const horaFimSelect = page.locator("#nm_hora_fim, select[name='nm_hora_fim']").first();
    await horaFimSelect.selectOption(horaFim);

    // Função
    await page.selectOption("#id_escala_servico_tipo", funcaoId);
    await page.waitForTimeout(300);

    // Agrupamento
    const agrupamentoSelect = page.locator("#nm_escala_servico_agrupamento");
    try {
      await agrupamentoSelect.selectOption(BRAVO_AGRUPAMENTO);
    } catch {
      // Agrupamento pode ser opcional
    }

    // Mobilidade — selecionar "Permanente"
    const mobilidadeSelect = page.locator("#id_mobilidade");
    try {
      const mobilidadeOptions = await mobilidadeSelect.locator("option").all();
      for (const opt of mobilidadeOptions) {
        const text = await opt.textContent();
        if (text?.toLowerCase().includes("permanente")) {
          const val = await opt.getAttribute("value");
          if (val) await mobilidadeSelect.selectOption(val);
          break;
        }
      }
    } catch {
      // Mobilidade pode ser opcional
    }

    // Modalidade (radio)
    await page.check(`#id_escala_servico_categoria${categoriaId}`);

    // Observação
    await page.fill("#nm_escala_servico_observacao", "EXTRA EXPEDIENTE DAL");

    // Submeter
    await page.click("#btnAddServico");
    await page.waitForTimeout(2000);

    // Verificar retorno
    const msgRetorno = await page.locator("#msgRetorno").textContent().catch(() => "");
    if (msgRetorno?.toLowerCase().includes("erro") || msgRetorno?.toLowerCase().includes("error")) {
      return { success: false, error: msgRetorno };
    }

    // Tentar capturar ID do serviço criado
    const bravoServicoId = await page.evaluate(() => {
      const msg = document.getElementById("msgRetorno");
      if (!msg) return undefined;
      const match = msg.textContent?.match(/servico=(\d+)/);
      return match ? parseInt(match[1]) : undefined;
    });

    return { success: true, bravoServicoId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────

export async function runBravoAgent(
  triggeredBy: "schedule" | "manual" = "schedule"
): Promise<{
  success: boolean;
  mesAno: string;
  totalRegistros: number;
  sucessos: number;
  erros: number;
  duplicatas: number;
  errorMsg?: string;
}> {
  const mesAno = getMesAno();
  let logId: number | undefined;

  // Criar log de execução
  const dbConn = await getDb();
  if (!dbConn) return { success: false, mesAno, totalRegistros: 0, sucessos: 0, erros: 0, duplicatas: 0, errorMsg: "Database not available" };
  await dbConn.insert(bravoSyncLogs).values({
    mesAno,
    triggeredBy,
    status: "running",
  });
  const logRows = await dbConn
    .select()
    .from(bravoSyncLogs)
    .where(eq(bravoSyncLogs.mesAno, mesAno))
    .orderBy(sql`id DESC`)
    .limit(1);
  logId = logRows[0]?.id;

  let browser: Browser | null = null;
  let totalRegistros = 0;
  let sucessos = 0;
  let erros = 0;
  let duplicatas = 0;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Login
    const loggedIn = await loginBravo(page);
    if (!loggedIn) {
      throw new Error("Falha no login do Bravo Escalas");
    }

    // 2. Obter ou criar escala do mês
    const escalaMesRow = await getOrCreateEscalaMes(mesAno);

    let bravoEscalaId = escalaMesRow.bravoEscalaId;

    if (!bravoEscalaId || escalaMesRow.status !== "created") {
      // Criar nova escala no primeiro dia do mês (ou se ainda não foi criada)
      const novoId = await criarEscalaMes(page, mesAno);
      if (novoId) {
        bravoEscalaId = novoId;
        await dbConn
          .update(bravoEscalasMes)
          .set({
            bravoEscalaId: novoId,
            bravoEscalaNome: `EXTRA EXPEDIENTE ${mesAno}`,
            status: "created",
          })
          .where(eq(bravoEscalasMes.id, escalaMesRow.id));
      } else {
        await dbConn
          .update(bravoEscalasMes)
          .set({ status: "error", errorMsg: "Falha ao criar escala no Bravo" })
          .where(eq(bravoEscalasMes.id, escalaMesRow.id));
        throw new Error("Não foi possível criar a escala no Bravo Escalas");
      }
    }

    // 3. Buscar registros aprovados do mês
    const records = await getApprovedRecordsForMonth(mesAno);
    totalRegistros = records.length;

    // 4. Verificar quais já foram lançados
    const lancamentosExistentes = await getLancamentosDoMes(escalaMesRow.id);
    const lancadosIds = new Set(
      lancamentosExistentes
        .filter((l: any) => l.status === "success")
        .map((l: any) => l.overtimeRecordId)
    );

    // 5. Lançar cada registro
    for (const record of records) {
      if (lancadosIds.has(record.id)) {
        duplicatas++;
        continue;
      }

      const resultado = await lancarServico(page, bravoEscalaId, record);

      if (resultado.success) {
        sucessos++;
        await marcarLancamento(
          record.id,
          escalaMesRow.id,
          record.servidor || "",
          record.data || "",
          record.horaInicio || "",
          record.horaFim || "",
          "success",
          undefined,
          resultado.bravoServicoId
        );
      } else {
        erros++;
        await marcarLancamento(
          record.id,
          escalaMesRow.id,
          record.servidor || "",
          record.data || "",
          record.horaInicio || "",
          record.horaFim || "",
          "error",
          resultado.error
        );
      }

      // Pequena pausa entre lançamentos para não sobrecarregar o servidor
      await page.waitForTimeout(1500);
    }

    await browser.close();

    // 6. Atualizar log
    if (logId) {
      await dbConn
        .update(bravoSyncLogs)
        .set({
          totalRegistros,
          sucessos,
          erros,
          duplicatas,
          status: "completed",
          finishedAt: new Date(),
        })
        .where(eq(bravoSyncLogs.id, logId));
    }

    // 7. Notificar owner se houver erros
    if (erros > 0) {
      await notifyOwner({
        title: `⚠️ Bravo Escalas — ${erros} erro(s) no lançamento de ${mesAno}`,
        content: `Execução ${triggeredBy === "manual" ? "manual" : "automática"} concluída.\n\nTotal: ${totalRegistros} | Sucesso: ${sucessos} | Erros: ${erros} | Duplicatas: ${duplicatas}\n\nVerifique o painel Bravo Sync para detalhes.`,
      });
    }

    return { success: true, mesAno, totalRegistros, sucessos, erros, duplicatas };
  } catch (e: any) {
    if (browser) await browser.close().catch(() => {});

    const errorMsg = e.message || "Erro desconhecido";

    if (logId) {
      const dbErr = await getDb();
      if (dbErr) {
        await dbErr
          .update(bravoSyncLogs)
          .set({
            totalRegistros,
            sucessos,
            erros,
            duplicatas,
            status: "failed",
            errorMsg,
            finishedAt: new Date(),
          })
          .where(eq(bravoSyncLogs.id, logId));
      }
    }

    await notifyOwner({
      title: `🚨 Bravo Escalas — Falha crítica no lançamento de ${mesAno}`,
      content: `Erro: ${errorMsg}\n\nTotal processado: ${totalRegistros} | Sucesso: ${sucessos} | Erros: ${erros}`,
    });

    return {
      success: false,
      mesAno,
      totalRegistros,
      sucessos,
      erros,
      duplicatas,
      errorMsg,
    };
  }
}
