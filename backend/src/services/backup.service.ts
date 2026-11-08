import archiver from "archiver";
import unzipper from "unzipper";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/asyncHandler";
import { notify } from "./notification.service";

const BACKUPS_DIRNAME = "__backups__";

function backupsDir(dataPath: string) {
  return path.join(dataPath, BACKUPS_DIRNAME);
}

/** Zips up a server's world + config data (excluding prior backups) into a timestamped archive. */
export async function createBackup(serverId: string, automatic = false) {
  const server = await prisma.server.findUniqueOrThrow({ where: { id: serverId } });
  const dir = backupsDir(server.dataPath);
  await fsp.mkdir(dir, { recursive: true });

  const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
  const fullPath = path.join(dir, fileName);

  const backupRecord = await prisma.backup.create({
    data: { serverId, fileName, status: "RUNNING", automatic },
  });

  try {
    await zipDirectory(server.dataPath, fullPath, [BACKUPS_DIRNAME]);
    const stat = await fsp.stat(fullPath);

    const completed = await prisma.backup.update({
      where: { id: backupRecord.id },
      data: { status: "COMPLETE", sizeBytes: BigInt(stat.size), completedAt: new Date() },
    });

    await notify(server.ownerId, "SUCCESS", "Backup complete", `Backup of "${server.name}" finished (${(stat.size / 1e6).toFixed(1)} MB).`);
    return completed;
  } catch (err) {
    await prisma.backup.update({ where: { id: backupRecord.id }, data: { status: "FAILED" } });
    await notify(server.ownerId, "ERROR", "Backup failed", `Backup of "${server.name}" failed.`);
    throw err;
  }
}

function zipDirectory(sourceDir: string, outPath: string, excludeDirs: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);

    // `false` as the destpath keeps entries at the archive root; the filter
    // callback skips anything inside an excluded top-level directory
    // (used to keep the backups folder itself out of its own archives).
    archive.directory(sourceDir, false, (entry) => {
      const isExcluded = excludeDirs.some((dir) => entry.name === dir || entry.name.startsWith(`${dir}/`));
      return isExcluded ? false : entry;
    });
    archive.finalize();
  });
}

export async function listBackups(serverId: string) {
  return prisma.backup.findMany({ where: { serverId }, orderBy: { createdAt: "desc" } });
}

export async function restoreBackup(serverId: string, backupId: string) {
  const server = await prisma.server.findUniqueOrThrow({ where: { id: serverId } });
  const backup = await prisma.backup.findUniqueOrThrow({ where: { id: backupId } });

  if (backup.serverId !== serverId) throw new ApiError(400, "Backup does not belong to this server");
  if (server.status !== "OFFLINE") throw new ApiError(400, "Stop the server before restoring a backup");

  const archivePath = path.join(backupsDir(server.dataPath), backup.fileName);

  // Clear current world/data (except backups + server.properties overwrite protections)
  const entries = await fsp.readdir(server.dataPath);
  for (const entry of entries) {
    if (entry === BACKUPS_DIRNAME) continue;
    await fsp.rm(path.join(server.dataPath, entry), { recursive: true, force: true });
  }

  await fs
    .createReadStream(archivePath)
    .pipe(unzipper.Extract({ path: server.dataPath }))
    .promise();

  await notify(server.ownerId, "SUCCESS", "Backup restored", `"${server.name}" was restored from ${backup.fileName}.`);
}

export async function deleteBackup(serverId: string, backupId: string) {
  const server = await prisma.server.findUniqueOrThrow({ where: { id: serverId } });
  const backup = await prisma.backup.findUniqueOrThrow({ where: { id: backupId } });
  if (backup.serverId !== serverId) throw new ApiError(400, "Backup does not belong to this server");

  await fsp.rm(path.join(backupsDir(server.dataPath), backup.fileName), { force: true });
  await prisma.backup.delete({ where: { id: backupId } });
}

export function backupFilePath(dataPath: string, fileName: string) {
  return path.join(backupsDir(dataPath), fileName);
}

/**
 * Scheduler tick — called every minute from index.ts. Runs any due automatic
 * backups and prunes old ones beyond each schedule's retainCount.
 */
export async function runDueScheduledBackups() {
  const now = new Date();
  const due = await prisma.backupSchedule.findMany({
    where: { enabled: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    include: { server: true },
  });

  for (const schedule of due) {
    try {
      await createBackup(schedule.serverId, true);

      const all = await listBackups(schedule.serverId);
      const automaticBackups = all.filter((b) => b.automatic && b.status === "COMPLETE");
      const excess = automaticBackups.slice(schedule.retainCount);
      for (const old of excess) {
        await deleteBackup(schedule.serverId, old.id);
      }

      const next = new Date(now.getTime() + schedule.intervalHours * 60 * 60 * 1000);
      await prisma.backupSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt: next },
      });
    } catch (err) {
      console.error(`Scheduled backup failed for server ${schedule.serverId}:`, err);
    }
  }
}
