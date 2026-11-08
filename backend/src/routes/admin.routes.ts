import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { adminUpdateUserSchema } from "../utils/validators";
import * as serverService from "../services/server.service";
import { docker } from "../services/docker.service";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

// ── Users ────────────────────────────────────────────────────────────

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isSuspended: true,
        maxServers: true,
        maxRamMb: true,
        createdAt: true,
        _count: { select: { servers: true } },
      },
    });
    res.json(users);
  })
);

adminRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const input = adminUpdateUserSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: input });
    res.json(user);
  })
);

adminRouter.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    // Cascade deletes their servers' DB rows; containers are cleaned up individually first.
    const servers = await prisma.server.findMany({ where: { ownerId: req.params.id } });
    for (const server of servers) {
      await serverService.deleteServer(server.id, req.params.id, true);
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// ── Servers (global view) ───────────────────────────────────────────────

adminRouter.get(
  "/servers",
  asyncHandler(async (_req, res) => {
    const servers = await prisma.server.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { username: true, email: true } } },
    });
    res.json(servers);
  })
);

adminRouter.delete(
  "/servers/:id",
  asyncHandler(async (req, res) => {
    const server = await prisma.server.findUniqueOrThrow({ where: { id: req.params.id } });
    await serverService.deleteServer(server.id, server.ownerId, true);
    res.status(204).send();
  })
);

// ── System resource overview ───────────────────────────────────────────

adminRouter.get(
  "/system",
  asyncHandler(async (_req, res) => {
    const info = await docker.info();
    const [userCount, serverCount, onlineCount] = await Promise.all([
      prisma.user.count(),
      prisma.server.count(),
      prisma.server.count({ where: { status: "ONLINE" } }),
    ]);

    res.json({
      docker: {
        containers: info.Containers,
        containersRunning: info.ContainersRunning,
        images: info.Images,
        cpus: info.NCPU,
        memTotalBytes: info.MemTotal,
      },
      platform: { userCount, serverCount, onlineCount },
    });
  })
);
