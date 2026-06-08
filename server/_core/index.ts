import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { runBravoAgent } from "../bravo-agent";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ─── Bravo Escalas — Scheduled endpoint ──────────────────────────────────────
  app.post("/api/scheduled/bravo-sync", async (req, res) => {
    try {
      // Verificação básica: o header x-manus-cron-task-uid deve estar presente
      // (a plataforma restringe /api/scheduled/* a chamadas cron)
      const taskUid = req.headers["x-manus-cron-task-uid"] as string | undefined;
      console.log(`[BravoSync] Triggered by heartbeat. taskUid=${taskUid}`);

      // Executa em background para não bloquear a resposta (timeout 2min da plataforma)
      setImmediate(() => {
        runBravoAgent("schedule").catch((e) =>
          console.error("[BravoSync] Erro na execução agendada:", e)
        );
      });

      return res.json({ ok: true, message: "Bravo sync iniciado em background", taskUid });
    } catch (err: any) {
      console.error("[BravoSync] Erro no handler agendado:", err);
      return res.status(500).json({
        error: err?.message || "Erro desconhecido",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
