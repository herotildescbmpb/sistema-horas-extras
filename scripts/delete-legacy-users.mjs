/**
 * Script para excluir usuários legados (openId começa com "pre_" ou "local_")
 * com segurança: verifica dependências antes de deletar.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Buscar IDs dos usuários legados
const [legados] = await conn.execute(
  `SELECT id, name, openId FROM users WHERE openId LIKE 'pre_%' OR openId LIKE 'local_%'`
);
console.log(`\nUsuários legados encontrados: ${legados.length}`);
legados.forEach(u => console.log(`  [${u.id}] ${u.name} (${u.openId})`));

const ids = legados.map(u => u.id);
if (ids.length === 0) {
  console.log("Nenhum usuário legado encontrado. Encerrando.");
  await conn.end();
  process.exit(0);
}

const placeholders = ids.map(() => "?").join(",");

// 2. Verificar dependências
const [overtimes] = await conn.execute(
  `SELECT userId, COUNT(*) as total FROM overtime_records WHERE userId IN (${placeholders}) GROUP BY userId`,
  ids
);
const [escalas] = await conn.execute(
  `SELECT userId, COUNT(*) as total FROM escalas WHERE userId IN (${placeholders}) GROUP BY userId`,
  ids
);
const [notifications] = await conn.execute(
  `SELECT userId, COUNT(*) as total FROM notifications WHERE userId IN (${placeholders}) GROUP BY userId`,
  ids
);
const [deptChefes] = await conn.execute(
  `SELECT id, name, chefeId FROM departments WHERE chefeId IN (${placeholders})`,
  ids
);

console.log("\n=== DEPENDÊNCIAS ===");
console.log("overtime_records:", overtimes.length ? overtimes : "nenhuma");
console.log("escalas:", escalas.length ? escalas : "nenhuma");
console.log("notifications:", notifications.length ? notifications : "nenhuma");
console.log("departments (chefe):", deptChefes.length ? deptChefes : "nenhuma");

// 3. Executar exclusões em ordem segura
console.log("\n=== EXCLUINDO ===");

// Remover chefe_id dos setores que apontam para usuários legados
if (deptChefes.length > 0) {
  await conn.execute(
    `UPDATE departments SET chefeId = NULL WHERE chefeId IN (${placeholders})`,
    ids
  );
  console.log(`  departments.chefeId zerado para ${deptChefes.length} setor(es)`);
}

// Deletar notificações dos usuários legados
const [delNotif] = await conn.execute(
  `DELETE FROM notifications WHERE userId IN (${placeholders})`,
  ids
);
console.log(`  notifications deletadas: ${delNotif.affectedRows}`);

// Deletar role_permissions dos usuários legados (se existir coluna userId)
try {
  const [delPerm] = await conn.execute(
    `DELETE FROM role_permissions WHERE role IN (SELECT role FROM users WHERE id IN (${placeholders}))`,
    ids
  );
  console.log(`  role_permissions deletadas: ${delPerm.affectedRows}`);
} catch (e) {
  console.log(`  role_permissions: ignorado (${e.message})`);
}

// Deletar os usuários legados
const [delUsers] = await conn.execute(
  `DELETE FROM users WHERE id IN (${placeholders})`,
  ids
);
console.log(`  users deletados: ${delUsers.affectedRows}`);

// 4. Confirmar
const [restantes] = await conn.execute(
  `SELECT id, name, openId FROM users ORDER BY id`
);
console.log(`\n=== USUÁRIOS RESTANTES (${restantes.length}) ===`);
restantes.forEach(u => console.log(`  [${u.id}] ${u.name} (${u.openId})`));

await conn.end();
console.log("\nConcluído.");
