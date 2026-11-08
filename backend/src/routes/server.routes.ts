import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import { createServerSchema, updateServerSchema, consoleCommandSchema } from "../utils/validators";
import * as serverService from "../services/server.service";
import * as dockerService from "../services/docker.service";
import { sendConsoleCommand } from "../services/docker.service";

export const serverRouter = Router();
serverRouter.use(requireAuth);

// ── List & create ─────────────────────────────────────────────────────

serverRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const servers = await serverService.listServersForUser(req.user!.sub);
    res.json(servers);
  })
);

serverRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createServerSchema.parse(req.body);
    const server = await serverService.createServer(req.user!.sub, input);
    res.status(201).json(server);
  })
);

// ── Single server ─────────────────────────────────────────────────────

serverRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub, req.user!.role === "ADMIN");
    res.json(server);
  })
);

serverRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const input = updateServerSchema.parse(req.body);
    const updated = await prisma.server.update({ where: { id: server.id }, data: input });
    res.json(updated);
  })
);

serverRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await serverService.deleteServer(req.params.id, req.user!.sub, req.user!.role === "ADMIN");
    res.status(204).send();
  })
);

// ── Lifecycle actions ─────────────────────────────────────────────────

serverRouter.post(
  "/:id/start",
  asyncHandler(async (req, res) => {
    await serverService.startServer(req.params.id, req.user!.sub);
    res.status(202).json({ message: "Server starting" });
  })
);

serverRouter.post(
  "/:id/stop",
  asyncHandler(async (req, res) => {
    await serverService.stopServer(req.params.id, req.user!.sub);
    res.status(202).json({ message: "Server stopping" });
  })
);

serverRouter.post(
  "/:id/restart",
  asyncHandler(async (req, res) => {
    await serverService.restartServer(req.params.id, req.user!.sub);
    res.status(202).json({ message: "Server restarting" });
  })
);

serverRouter.post(
  "/:id/kill",
  asyncHandler(async (req, res) => {
    await serverService.killServer(req.params.id, req.user!.sub);
    res.status(202).json({ message: "Server killed" });
  })
);

// ── Console (one-shot command; live stream is over WebSocket) ─────────

serverRouter.post(
  "/:id/console",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    if (!server.containerId || server.status !== "ONLINE") {
      throw new ApiError(400, "Server must be online to accept commands");
    }
    const { command } = consoleCommandSchema.parse(req.body);
    const output = await sendConsoleCommand(server.containerId, command);
    res.json({ output });
  })
);

// ── Resource usage snapshot ────────────────────────────────────────────

serverRouter.get(
  "/:id/stats",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    if (!server.containerId || server.status !== "ONLINE") {
      return res.json({ cpuPercent: 0, ramMb: 0, ramLimitMb: server.ramMb, playerCount: 0 });
    }
    const stats = await dockerService.getContainerStats(server.containerId);
    res.json({ ...stats, ramLimitMb: server.ramMb });
  })
);
