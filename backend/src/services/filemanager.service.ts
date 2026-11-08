import path from "path";
import fsp from "fs/promises";
import { ApiError } from "../utils/asyncHandler";

/**
 * Resolves a user-supplied relative path against a server's data root and
 * guarantees the result cannot escape that root (blocks `../../etc/passwd`
 * style traversal attacks).
 */
export function resolveSafePath(dataRoot: string, relativePath: string): string {
  const normalized = path.normalize(relativePath ?? ".").replace(/^(\.\.[/\\])+/, "");
  const resolved = path.resolve(dataRoot, normalized);
  if (!resolved.startsWith(path.resolve(dataRoot))) {
    throw new ApiError(400, "Invalid path");
  }
  return resolved;
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string;
}

export async function listDirectory(dataRoot: string, relativePath: string): Promise<FileEntry[]> {
  const dirPath = resolveSafePath(dataRoot, relativePath);
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });

  const results: FileEntry[] = [];
  for (const entry of entries) {
    if (entry.name === "__backups__") continue; // hide internal backup storage
    const full = path.join(dirPath, entry.name);
    const stat = await fsp.stat(full);
    results.push({
      name: entry.name,
      path: path.relative(dataRoot, full).split(path.sep).join("/"),
      isDirectory: entry.isDirectory(),
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  }

  return results.sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));
}

export async function readFile(dataRoot: string, relativePath: string): Promise<string> {
  const filePath = resolveSafePath(dataRoot, relativePath);
  return fsp.readFile(filePath, "utf8");
}

export async function writeFile(dataRoot: string, relativePath: string, content: string): Promise<void> {
  const filePath = resolveSafePath(dataRoot, relativePath);
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, content, "utf8");
}

export async function deleteEntry(dataRoot: string, relativePath: string): Promise<void> {
  const filePath = resolveSafePath(dataRoot, relativePath);
  await fsp.rm(filePath, { recursive: true, force: true });
}

export async function createDirectory(dataRoot: string, relativePath: string): Promise<void> {
  const dirPath = resolveSafePath(dataRoot, relativePath);
  await fsp.mkdir(dirPath, { recursive: true });
}

export async function renameEntry(dataRoot: string, fromPath: string, toPath: string): Promise<void> {
  const from = resolveSafePath(dataRoot, fromPath);
  const to = resolveSafePath(dataRoot, toPath);
  await fsp.rename(from, to);
}

/** Absolute path used for streaming a download or saving an uploaded multipart file. */
export function absolutePathFor(dataRoot: string, relativePath: string): string {
  return resolveSafePath(dataRoot, relativePath);
}
