import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as serverService from "../services/server.service";
import * as backupService from "../services/backup.service";
import { backupScheduleSchema } from "../utils/validators";

export const backupsRouter = Router({ mergeParams: true });
backupsRouter.use(requireAuth);

backupsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const backups = await backupService.listBackups(req.params.id);
    // BigInt doesn't JSON-serialize by default — coerce to string for the wire.
    res.json(backups.map((b) => ({ ...b, sizeBytes: b.sizeBytes.toString() })));
  })
);

backupsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const backup = await backupService.createBackup(req.params.id, false);
    res.status(201).json({ ...backup, sizeBytes: backup.sizeBytes.toString() });
  })
);

backupsRouter.post(
  "/:backupId/restore",
  asyncHandler(async (req, res) => {
    await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    await backupService.restoreBackup(req.params.id, req.params.backupId);
    res.json({ message: "Backup restored" });
  })
);

backupsRouter.delete(
  "/:backupId",
  asyncHandler(async (req, res) => {
    await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    await backupService.deleteBackup(req.params.id, req.params.backupId);
    res.status(204).send();
  })
);

backupsRouter.get(
  "/:backupId/download",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const backup = await prisma.backup.findUniqueOrThrow({ where: { id: req.params.backupId } });
    res.download(backupService.backupFilePath(server.dataPath, backup.fileName), backup.fileName);
  })
);

// ── Scheduled automatic backups ────────────────────────────────────────

backupsRouter.get(
  "/schedule",
  asyncHandler(async (req, res) => {
    await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const schedule = await prisma.backupSchedule.findUnique({ where: { serverId: req.params.id } });
    res.json(schedule ?? { enabled: false, intervalHours: 24, retainCount: 7 });
  })
);

backupsRouter.put(
  "/schedule",
  asyncHandler(async (req, res) => {
    await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const input = backupScheduleSchema.parse(req.body);

    const nextRunAt = input.enabled ? new Date(Date.now() + input.intervalHours * 60 * 60 * 1000) : null;

    const schedule = await prisma.backupSchedule.upsert({
      where: { serverId: req.params.id },
      create: { serverId: req.params.id, ...input, nextRunAt },
      update: { ...input, nextRunAt },
    });
    res.json(schedule);
  })
);
