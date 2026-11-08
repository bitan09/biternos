import Docker from "dockerode";
import path from "path";
import fs from "fs/promises";
import { env } from "../config/env";
import { ServerSoftware } from "@prisma/client";

/**
 * Thin wrapper around dockerode that knows how to spin up an isolated,
 * resource-capped Minecraft server container per Bitarnos "Server" record.
 *
 * We use the battle-tested `itzg/minecraft-server` image, which already
 * supports every server-software flavour we advertise (Vanilla, Paper,
 * Spigot, Fabric, Forge, Purpur) via the TYPE env var, and ships RCON
 * out of the box so we can send console commands without attaching stdin.
 */
export const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const IMAGE = "itzg/minecraft-server:latest";

// Maps our internal enum to the image's TYPE variable.
const SOFTWARE_TYPE_MAP: Record<ServerSoftware, string> = {
  VANILLA: "VANILLA",
  PAPER: "PAPER",
  SPIGOT: "SPIGOT",
  FABRIC: "FABRIC",
  FORGE: "FORGE",
  PURPUR: "PURPUR",
};

export interface CreateContainerOptions {
  containerName: string;
  dataPath: string;
  hostPort: number;
  rconPort: number;
  software: ServerSoftware;
  mcVersion: string;
  ramMb: number;
  cpuLimit: number;
  maxPlayers: number;
  motd: string;
  difficulty: string;
  gamemode: string;
}

async function ensureNetwork() {
  const networks = await docker.listNetworks({ filters: { name: [env.mcDockerNetwork] } });
  if (networks.length === 0) {
    await docker.createNetwork({ Name: env.mcDockerNetwork, Driver: "bridge" });
  }
}

export async function createServerContainer(opts: CreateContainerOptions) {
  await ensureNetwork();
  await fs.mkdir(opts.dataPath, { recursive: true });

  const container = await docker.createContainer({
    name: opts.containerName,
    Image: IMAGE,
    Env: [
      "EULA=TRUE",
      `TYPE=${SOFTWARE_TYPE_MAP[opts.software]}`,
      `VERSION=${opts.mcVersion}`,
      `MEMORY=${opts.ramMb}M`,
      `MAX_PLAYERS=${opts.maxPlayers}`,
      `MOTD=${opts.motd}`,
      `DIFFICULTY=${opts.difficulty}`,
      `MODE=${opts.gamemode}`,
      "ENABLE_RCON=true",
      "RCON_PASSWORD=bitarnos-rcon",
      "RCON_PORT=25575",
      // itzg image supports graceful stop via the `stop` signal + rcon
      "STOP_SERVER_ANNOUNCE_DELAY=5",
    ],
    ExposedPorts: {
      "25565/tcp": {},
      "25575/tcp": {},
    },
    HostConfig: {
      PortBindings: {
        "25565/tcp": [{ HostPort: String(opts.hostPort) }],
        "25575/tcp": [{ HostPort: String(opts.rconPort) }],
      },
      Binds: [`${opts.dataPath}:/data`],
      Memory: opts.ramMb * 1024 * 1024,
      NanoCpus: Math.round(opts.cpuLimit * 1e9),
      RestartPolicy: { Name: "unless-stopped" },
      NetworkMode: env.mcDockerNetwork,
    },
    Labels: {
      "bitarnos.managed": "true",
    },
  });

  return container.id;
}

export async function startContainer(containerId: string) {
  const container = docker.getContainer(containerId);
  await container.start();
}

/** Graceful stop — sends SIGTERM which itzg's image translates into a clean `stop` via RCON. */
export async function stopContainer(containerId: string, timeoutSeconds = 30) {
  const container = docker.getContainer(containerId);
  await container.stop({ t: timeoutSeconds });
}

export async function restartContainer(containerId: string) {
  const container = docker.getContainer(containerId);
  await container.restart({ t: 30 });
}

/** Hard kill — immediate SIGKILL, used for unresponsive servers. */
export async function killContainer(containerId: string) {
  const container = docker.getContainer(containerId);
  await container.kill();
}

export async function removeContainer(containerId: string) {
  const container = docker.getContainer(containerId);
  await container.remove({ force: true });
}

export async function getContainerStatus(containerId: string): Promise<
  "running" | "exited" | "created" | "restarting" | "paused" | "dead" | "unknown"
> {
  try {
    const container = docker.getContainer(containerId);
    const data = await container.inspect();
    return data.State.Status as any;
  } catch {
    return "unknown";
  }
}

/** Live resource usage: CPU %, RAM MB. Single-shot stats read (not streamed). */
export async function getContainerStats(containerId: string) {
  const container = docker.getContainer(containerId);
  const stats = await container.stats({ stream: false });

  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuCount = stats.cpu_stats.online_cpus ?? 1;
  const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

  const ramBytes = stats.memory_stats.usage ?? 0;
  const ramMb = ramBytes / (1024 * 1024);

  return { cpuPercent: Math.max(0, Math.round(cpuPercent * 10) / 10), ramMb: Math.round(ramMb) };
}

/** Attaches to the container's stdout/stderr log stream for the live console. */
export function streamContainerLogs(containerId: string, onData: (line: string) => void) {
  const container = docker.getContainer(containerId);
  let destroyed = false;

  container
    .logs({ follow: true, stdout: true, stderr: true, tail: 200 })
    .then((stream) => {
      docker.modem.demuxStream(
        stream as any,
        {
          write: (chunk: Buffer) => !destroyed && onData(chunk.toString("utf8")),
        } as any,
        {
          write: (chunk: Buffer) => !destroyed && onData(chunk.toString("utf8")),
        } as any
      );
      return stream;
    })
    .then((stream) => {
      return {
        destroy: () => {
          destroyed = true;
          (stream as any).destroy?.();
        },
      };
    });

  return {
    stop: () => {
      destroyed = true;
    },
  };
}

/** Sends a console command via `rcon-cli`, bundled inside the itzg image. */
export async function sendConsoleCommand(containerId: string, command: string): Promise<string> {
  const container = docker.getContainer(containerId);
  const exec = await container.exec({
    Cmd: ["rcon-cli", command],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({});
  return new Promise((resolve) => {
    let output = "";
    docker.modem.demuxStream(
      stream,
      { write: (c: Buffer) => (output += c.toString("utf8")) } as any,
      { write: (c: Buffer) => (output += c.toString("utf8")) } as any
    );
    stream.on("end", () => resolve(output.trim()));
  });
}

export function resolveServerDataPath(containerName: string) {
  return path.join(env.mcDataRoot, containerName);
}
