import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import * as serverService from "../services/server.service";
import { sendConsoleCommand } from "../services/docker.service";
import { playerListEntrySchema } from "../utils/validators";

export const playersRouter = Router({ mergeParams: true });
playersRouter.use(requireAuth);

// Maps our list type to the corresponding vanilla console commands so that
// changes take effect immediately on a running server, in addition to being
// persisted for the next boot (the itzg image also re-syncs these files).
const COMMAND_MAP: Record<string, { add: (u: string) => string; remove: (u: string) => string }> = {
  WHITELIST: { add: (u) => `whitelist add ${u}`, remove: (u) => `whitelist remove ${u}` },
  OPERATOR: { add: (u) => `op ${u}`, remove: (u) => `deop ${u}` },
  BANNED: { add: (u) => `ban ${u}`, remove: (u) => `pardon ${u}` },
};

playersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const type = req.query.type as string | undefined;
    const entries = await prisma.playerListEntry.findMany({
      where: { serverId: req.params.id, ...(type ? { type: type as any } : {}) },
      orderBy: { addedAt: "desc" },
    });
    res.json(entries);
  })
);

playersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const input = playerListEntrySchema.parse(req.body);

    const entry = await prisma.playerListEntry.upsert({
      where: { serverId_type_username: { serverId: server.id, type: input.type, username: input.username } },
      create: { serverId: server.id, ...input },
      update: { reason: input.reason },
    });

    if (server.status === "ONLINE" && server.containerId) {
      await sendConsoleCommand(server.containerId, COMMAND_MAP[input.type].add(input.username));
    }

    res.status(201).json(entry);
  })
);

playersRouter.delete(
  "/:entryId",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const entry = await prisma.playerListEntry.findUnique({ where: { id: req.params.entryId } });
    if (!entry || entry.serverId !== server.id) throw new ApiError(404, "Entry not found");

    await prisma.playerListEntry.delete({ where: { id: entry.id } });

    if (server.status === "ONLINE" && server.containerId) {
      await sendConsoleCommand(server.containerId, COMMAND_MAP[entry.type].remove(entry.username));
    }

    res.status(204).send();
  })
);
