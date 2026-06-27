/**
 * Script para re-inserir os 10 usuários legados com os dados originais.
 * Senha padrão: 20262026 (hash bcrypt)
 */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Hash da senha padrão 20262026
const defaultHash = await bcrypt.hash("20262026", 10);

const users = [
  {
    id: 930009,
    name: "Administrador DAL",
    email: "admin@cbmpb.pb.gov.br",
    role: "admin",
    department: null,
    matricula: null,
    openId: "pre_admin_dal",
    mustChangePassword: 0,
  },
  {
    id: 930010,
    name: "Kaliny Simony Fideles de Araújo Morais",
    email: "kalinysimony@gmail.com",
    role: "chefe",
    department: "Gabinete do Diretor de Apoio Logístico",
    matricula: null,
    openId: "pre_kaliny",
    mustChangePassword: 0,
  },
  {
    id: 930011,
    name: "Keoma do Nascimento Silva",
    email: "omoicano@hotmail.com",
    role: "admin",
    department: "Gabinete do Diretor de Apoio Logístico",
    matricula: null,
    openId: "pre_keoma",
    mustChangePassword: 0,
  },
  {
    id: 930012,
    name: "Hedwig Tayse Paiva de Queiroz",
    email: "taysepqueiroz@gmail.com",
    role: "chefe",
    department: "CSL – Centro de Suprimento Logístico",
    matricula: null,
    openId: "pre_hedwing",
    mustChangePassword: 0,
  },
  {
    id: 930013,
    name: "Jose Fragoso da Silva Neto",
    email: "fragoso.neto.jf@gmail.com",
    role: "chefe",
    department: "CMAV – Centro de Controle e Manutenção de Viaturas",
    matricula: null,
    openId: "pre_jose_fragoso",
    mustChangePassword: 0,
  },
  {
    id: 930014,
    name: "Matheus Pinheiro do Amaral",
    email: "01matheus@gmail.com",
    role: "chefe",
    department: "DAL/1 – Seção de Aquisições, Especificações e Registros",
    matricula: null,
    openId: "pre_matheus",
    mustChangePassword: 0,
  },
  {
    id: 930015,
    name: "Igor Soares Leal",
    email: "dal4cbmpb193@gmail.com",
    role: "chefe",
    department: "CAEO – Centro de Arquitetura, Engenharia e Obras",
    matricula: null,
    openId: "pre_igor",
    mustChangePassword: 1,
  },
  {
    id: 930016,
    name: "Síntia Barbosa Sena",
    email: "sintiasenna@gmail.com",
    role: "chefe",
    department: "Contratos",
    matricula: null,
    openId: "pre_sintia",
    mustChangePassword: 1,
  },
  {
    id: 3990188,
    name: "Teste",
    email: "herooliveira2@gmail.com",
    role: "chefe",
    department: "CMAV – Centro de Controle e Manutenção de Viaturas",
    matricula: null,
    openId: "pre_R-nrs-TDxSRh",
    mustChangePassword: 0,
  },
  {
    id: 4050084,
    name: "Waldemar Fabio Oliveira de Arruda",
    email: null,
    role: "chefe",
    department: null,
    matricula: null,
    openId: "pre_gDnO9PZARwDc",
    mustChangePassword: 0,
  },
];

console.log("\nRe-inserindo usuários legados...\n");

for (const u of users) {
  try {
    await conn.execute(
      `INSERT INTO users (id, name, email, role, department, matricula, openId, passwordHash, mustChangePassword, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [u.id, u.name, u.email, u.role, u.department, u.matricula, u.openId, defaultHash, u.mustChangePassword]
    );
    console.log(`  ✓ [${u.id}] ${u.name}`);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      console.log(`  ~ [${u.id}] ${u.name} — já existe, ignorado`);
    } else {
      console.error(`  ✗ [${u.id}] ${u.name} — ERRO: ${err.message}`);
    }
  }
}

// Restaurar chefeId nos setores
const chefeMap = [
  { deptId: 30001, chefeId: 930011 }, // Gabinete do Diretor de Apoio Logístico → Keoma
  { deptId: 30002, chefeId: 930014 }, // DAL/1 → Matheus
  { deptId: 30004, chefeId: 930010 }, // DAL/3 → Kaliny
  { deptId: 30005, chefeId: 930012 }, // CSL → Hedwig
  { deptId: 30006, chefeId: 930015 }, // CAEO → Igor
  { deptId: 30007, chefeId: 930013 }, // CMAV → Jose Fragoso
  { deptId: 60002, chefeId: 930016 }, // Contratos → Síntia
];

console.log("\nRestaurando chefeId nos setores...");
for (const { deptId, chefeId } of chefeMap) {
  await conn.execute(`UPDATE departments SET chefeId = ? WHERE id = ?`, [chefeId, deptId]);
  console.log(`  ✓ dept ${deptId} → chefeId ${chefeId}`);
}

// Confirmar
const [restantes] = await conn.execute(`SELECT id, name, openId, role FROM users ORDER BY id`);
console.log(`\n=== USUÁRIOS NO BANCO (${restantes.length}) ===`);
restantes.forEach(u => console.log(`  [${u.id}] ${u.name} (${u.openId}) — ${u.role}`));

await conn.end();
console.log("\nConcluído.");
