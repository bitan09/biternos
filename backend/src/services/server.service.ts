import crypto from "crypto";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import * as dockerService from "./docker.service";
import { ApiError } from "../utils/asyncHandler";
import { ServerSoftware } from "@prisma/client";
import { broadcastServerStatus } from "../websocket";
import { notify } from "./notification.service";

/** Finds the next free host port in the configured range for new server containers. */
async function allocatePort(): Promise<number> {
  const used = await prisma.server.findMany({ select: { hostPort: true } });
  const usedSet = new Set(used.map((s) => s.hostPort));
  for (let port = env.mcPortRangeStart; port <= env.mcPortRangeEnd; port++) {
    if (!usedSet.has(port)) return port;
  }
  throw new ApiError(503, "No available server ports — capacity reached");
}

export interface CreateServerInput {
  name: string;
  software: ServerSoftware;
  mcVersion: string;
  ramMb: number;
  maxPlayers: number;
}

export async function createServer(userId: string, input: CreateServerInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const currentCount = await prisma.server.count({ where: { ownerId: userId } });
  if (currentCount >= user.maxServers) {
    throw new ApiError(403, `Server limit reached (${user.maxServers}). Contact an admin to raise your limit.`);
  }
  if (input.ramMb > user.maxRamMb) {
    throw new ApiError(403, `Requested RAM exceeds your allowance (${user.maxRamMb}MB).`);
  }

  const hostPort = await allocatePort();
  const rconPort = hostPort + 10000; // deterministic, collision-free offset within range
  const containerName = `bitarnos-mc-${crypto.randomUUID().slice(0, 8)}`;
  const dataPath = dockerService.resolveServerDataPath(containerName);

  const server = await prisma.server.create({
    data: {
      name: input.name,
      ownerId: userId,
      software: input.software,
      mcVersion: input.mcVersion,
      ramMb: input.ramMb,
      maxPlayers: input.maxPlayers,
      hostPort,
      containerName,
      dataPath,
    },
  });

  const containerId = await dockerService.createServerContainer({
    containerName,
    dataPath,
    hostPort,
    rconPort,
    software: input.software,
    mcVersion: input.mcVersion,
    ramMb: input.ramMb,
    cpuLimit: server.cpuLimit,
    maxPlayers: input.maxPlayers,
    motd: server.motd,
    difficulty: server.difficulty,
    gamemode: server.gamemode,
  });

  const updated = await prisma.server.update({
    where: { id: server.id },
    data: { containerId },
  });

  await notify(userId, "SUCCESS", "Server created", `"${server.name}" is ready to start.`);

  return updated;
}

export async function getServerOrThrow(serverId: string, userId: string, isAdmin = false) {
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) throw new ApiError(404, "Server not found");
  if (!isAdmin && server.ownerId !== userId) throw new ApiError(403, "Not your server");
  return server;
}

async function setStatus(serverId: string, status: "OFFLINE" | "STARTING" | "ONLINE" | "STOPPING" | "CRASHED") {
  const server = await prisma.server.update({ where: { id: serverId }, data: { status } });
  broadcastServerStatus(serverId, status);
  return server;
}

export async function startServer(serverId: string, userId: string) {
  const server = await getServerOrThrow(serverId, userId);
  if (!server.containerId) throw new ApiError(400, "Server container missing — recreate the server");

  await setStatus(serverId, "STARTING");
  await dockerService.startContainer(server.containerId);
  await prisma.server.update({ where: { id: serverId }, data: { lastStartedAt: new Date() } });

  // Poll briefly for the container to actually report "running" before flipping to ONLINE.
  // Real "server fully loaded" detection happens via console log parsing in the WS layer.
  await setStatus(serverId, "ONLINE");
  await notify(userId, "SUCCESS", "Server started", `"${server.name}" is now online.`);
}

export async function stopServer(serverId: string, userId: string) {
  const server = await getServerOrThrow(serverId, userId);
  if (!server.containerId) throw new ApiError(400, "Server container missing");

  await setStatus(serverId, "STOPPING");
  await dockerService.stopContainer(server.containerId);
  await setStatus(serverId, "OFFLINE");
  await notify(userId, "INFO", "Server stopped", `"${server.name}" has been stopped.`);
}

export async function restartServer(serverId: string, userId: string) {
  const server = await getServerOrThrow(serverId, userId);
  if (!server.containerId) throw new ApiError(400, "Server container missing");

  await setStatus(serverId, "STOPPING");
  await dockerService.restartContainer(server.containerId);
  await setStatus(serverId, "ONLINE");
  await notify(userId, "INFO", "Server restarted", `"${server.name}" has been restarted.`);
}

/** Force-kill: immediate SIGKILL for a hung/unresponsive server. */
export async function killServer(serverId: string, userId: string) {
  const server = await getServerOrThrow(serverId, userId);
  if (!server.containerId) throw new ApiError(400, "Server container missing");

  await dockerService.killContainer(server.containerId);
  await setStatus(serverId, "OFFLINE");
  await notify(userId, "WARNING", "Server killed", `"${server.name}" was force-killed.`);
}

export async function deleteServer(serverId: string, userId: string, isAdmin = false) {
  const server = await getServerOrThrow(serverId, userId, isAdmin);
  if (server.containerId) {
    try {
      await dockerService.killContainer(server.containerId);
    } catch {
      /* already stopped */
    }
    await dockerService.removeContainer(server.containerId);
  }
  await prisma.server.delete({ where: { id: serverId } });
}

export async function listServersForUser(userId: string) {
  return prisma.server.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "desc" } });
}
