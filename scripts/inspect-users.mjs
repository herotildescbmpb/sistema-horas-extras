import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  `SELECT id, name, email, role, department, matricula, isActive, openId,
          (passwordHash IS NOT NULL) as temSenha, mustChangePassword
   FROM users ORDER BY id`
);
await conn.end();

console.log("\n=== USUÁRIOS ===\n");
for (const u of rows) {
  const tipo = u.openId?.startsWith("pre_") || u.openId?.startsWith("local_")
    ? "LEGADO (local)"
    : "OAUTH (Manus)";
  console.log(`[${u.id}] ${u.name}`);
  console.log(`  Tipo:       ${tipo}`);
  console.log(`  openId:     ${u.openId}`);
  console.log(`  email:      ${u.email || "(sem e-mail)"}`);
  console.log(`  role:       ${u.role}`);
  console.log(`  setor:      ${u.department || "(sem setor)"}`);
  console.log(`  matrícula:  ${u.matricula || "(sem matrícula)"}`);
  console.log(`  ativo:      ${u.isActive ? "sim" : "não"}`);
  console.log(`  temSenha:   ${u.temSenha ? "sim" : "não"}`);
  console.log(`  trocaSenha: ${u.mustChangePassword ? "sim" : "não"}`);
  console.log();
}
