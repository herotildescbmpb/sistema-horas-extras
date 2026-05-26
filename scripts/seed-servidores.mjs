import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

// Check if already seeded
const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM servidores");
const count = rows[0].cnt;
if (count > 0) {
  console.log(`Servidores already seeded (${count} records). Skipping.`);
  await conn.end();
  process.exit(0);
}

const sql = readFileSync("/home/ubuntu/servidores_insert.sql", "utf-8");
const statements = sql.split(";\n\n").filter(s => s.trim());

let total = 0;
for (const stmt of statements) {
  const s = stmt.trim();
  if (!s) continue;
  await conn.execute(s);
  // Count rows in this batch
  const match = s.match(/VALUES\n([\s\S]+)$/);
  if (match) {
    total += match[1].split("),\n(").length;
  }
}

const [final] = await conn.execute("SELECT COUNT(*) as cnt FROM servidores");
console.log(`Seeded ${final[0].cnt} servidores successfully.`);
await conn.end();
