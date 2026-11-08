import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { serverRouter } from "./routes/server.routes";
import { filesRouter } from "./routes/files.routes";
import { propertiesRouter } from "./routes/properties.routes";
import { backupsRouter } from "./routes/backups.routes";
import { playersRouter } from "./routes/players.routes";
import { pluginsRouter } from "./routes/plugins.routes";
import { notificationsRouter } from "./routes/notifications.routes";
import { adminRouter } from "./routes/admin.routes";
import { errorHandler } from "./middleware/errorHandler";
import { initWebSocketServer } from "./websocket";
import { runDueScheduledBackups } from "./services/backup.service";

const app = express();

app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(cookieParser(env.cookieSecret));
app.use(express.json({ limit: "5mb" }));

// Generous but present rate limiting on auth endpoints to blunt credential stuffing.
app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false })
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/servers", serverRouter);
// Nested resource routers, all scoped under /api/servers/:id/*
app.use("/api/servers/:id/files", filesRouter);
app.use("/api/servers/:id/properties", propertiesRouter);
app.use("/api/servers/:id/backups", backupsRouter);
app.use("/api/servers/:id/players", playersRouter);
app.use("/api/servers/:id/plugins", pluginsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);

app.use(errorHandler);

const httpServer = http.createServer(app);
initWebSocketServer(httpServer);

// Automatic-backup scheduler tick — checks every minute for due backups.
setInterval(() => {
  runDueScheduledBackups().catch((err) => console.error("Scheduler error:", err));
}, 60 * 1000);

httpServer.listen(env.port, () => {
  console.log(`Bitarnos API listening on port ${env.port} (${env.nodeEnv})`);
});
