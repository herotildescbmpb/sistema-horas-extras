/**
 * Script para re-gerar o csvContent dos lotes 1 e 2 no novo formato DAL.
 * Formato: Tipo de Escala;Servidor;Data Início;Hora Início:;Data Final;Hora Fim:;Função;Modalidade
 * Data: DD/MM/AAAA | Hora: HH:MM:SS | BOM UTF-8
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida");
  process.exit(1);
}

function formatDateBR(dateStr) {
  // dateStr: YYYY-MM-DD
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatTimeFull(timeStr) {
  // timeStr: HH:MM ou HH:MM:SS
  const parts = timeStr.split(":");
  const h = parts[0] || "00";
  const m = parts[1] || "00";
  const s = parts[2] || "00";
  return `${h}:${m}:${s}`;
}

function stripDigito(matricula) {
  // Remove dígito verificador: "519021-5" → "519021", "521871" → "521871"
  if (!matricula) return "";
  return matricula.replace(/-\d+$/, "");
}

function buildCsv(records) {
  const header = "Tipo de Escala;Servidor;Data Início;Hora Início:;Data Final;Hora Fim:;Função;Modalidade";
  const rows = records.map((r) => [
    r.tipoEscala || "",
    stripDigito(r.servidor),
    formatDateBR(r.date),
    formatTimeFull(r.startTime),
    formatDateBR(r.date), // Data Final = Data Início
    formatTimeFull(r.endTime),
    r.funcao || "",
    r.modalidade || "",
  ].join(";"));
  return "\uFEFF" + [header, ...rows].join("\n");
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  for (const batchId of [1, 2]) {
    const [rows] = await conn.execute(
      `SELECT servidor, date, startTime, endTime, totalMinutes, modalidade, department, tipoEscala, funcao
       FROM overtime_records
       WHERE exportBatchId = ?
       ORDER BY date, servidor`,
      [batchId]
    );

    if (!rows.length) {
      console.log(`Lote #${batchId}: nenhum registro encontrado.`);
      continue;
    }

    const csv = buildCsv(rows);
    await conn.execute(
      `UPDATE bravo_export_batches SET csvContent = ? WHERE id = ?`,
      [csv, batchId]
    );
    console.log(`Lote #${batchId}: CSV re-gerado com ${rows.length} registros e salvo no banco.`);
    // Mostrar prévia das primeiras 3 linhas
    const lines = csv.split("\n").slice(0, 4);
    console.log("  Prévia:\n  " + lines.join("\n  "));
  }

  await conn.end();
  console.log("\nConcluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
