import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import passwordResetRoutes from "./routes/password-reset.js";
import empresasRoutes from "./routes/empresas.js";
import usersRoutes from "./routes/users.js";
import configGlobaisRoutes from "./routes/configuracoes-globais.js";
import leadsRoutes from "./routes/leads.js";
import buscasRoutes from "./routes/buscas.js";
import funilRoutes from "./routes/funil.js";
import anotacoesRoutes from "./routes/anotacoes.js";
import metasRoutes from "./routes/metas.js";
import planosRoutes from "./routes/planos.js";
import assinaturasRoutes from "./routes/assinaturas.js";
import pagamentosRoutes from "./routes/pagamentos.js";
import rankingRoutes from "./routes/ranking.js";
import proxiesRoutes from "./routes/proxies.js";
import pacotesCreditosRoutes from "./routes/pacotes-creditos.js";

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:8080")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/empresas", empresasRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/configuracoes-globais", configGlobaisRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/buscas", buscasRoutes);
app.use("/api/funil", funilRoutes);
app.use("/api/anotacoes", anotacoesRoutes);
app.use("/api/metas", metasRoutes);
app.use("/api/planos", planosRoutes);
app.use("/api/assinaturas", assinaturasRoutes);
app.use("/api/pagamentos", pagamentosRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/proxy", proxiesRoutes);
app.use("/api/pacotes-creditos", pacotesCreditosRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada", path: req.path });
});

// Error handler
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err && err.status && err.status >= 400 && err.status < 600) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error("[error]", err);
    const message = err instanceof Error ? err.message : "Erro interno";
    res.status(500).json({ error: message });
  }
);

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`✓ Backend LeadRadar rodando em http://localhost:${PORT}`);
  console.log(`  CORS: ${corsOrigins.join(", ")}`);
});
