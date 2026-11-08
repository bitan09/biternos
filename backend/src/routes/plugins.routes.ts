import { Router } from "express";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import * as serverService from "../services/server.service";
import * as fileManager from "../services/filemanager.service";
import { z } from "zod";

export const pluginsRouter = Router({ mergeParams: true });
pluginsRouter.use(requireAuth);

const installSchema = z.object({
  url: z.string().url(),
  fileName: z.string().min(1),
});

/** Fabric/Forge servers use "mods", everything else (Paper/Spigot/Purpur) uses "plugins". */
function targetDirFor(software: string) {
  return software === "FABRIC" || software === "FORGE" ? "mods" : "plugins";
}

pluginsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const dir = targetDirFor(server.software);
    try {
      const entries = await fileManager.listDirectory(server.dataPath, dir);
      res.json(entries.filter((e) => !e.isDirectory && e.name.endsWith(".jar")));
    } catch {
      res.json([]);
    }
  })
);

// Installs a plugin/mod jar by downloading it server-side from a trusted URL
// (e.g. a Modrinth/CurseForge/Spigot direct download link the user pasted).
pluginsRouter.post(
  "/install",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const { url, fileName } = installSchema.parse(req.body);

    if (!fileName.endsWith(".jar")) throw new ApiError(400, "Only .jar files are supported");

    const dir = targetDirFor(server.software);
    const targetDir = fileManager.absolutePathFor(server.dataPath, dir);
    await fsp.mkdir(targetDir, { recursive: true });

    const response = await fetch(url);
    if (!response.ok || !response.body) throw new ApiError(400, "Could not download the file from that URL");

    const targetPath = path.join(targetDir, fileName);
    const fileStream = fs.createWriteStream(targetPath);
    await new Promise<void>((resolve, reject) => {
      // @ts-ignore - Node 18+ Readable.fromWeb typing gap across stream libs
      const nodeStream = require("stream").Readable.fromWeb(response.body);
      nodeStream.pipe(fileStream);
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    res.status(201).json({ message: `${fileName} installed to ${dir}/ — restart the server to load it` });
  })
);

pluginsRouter.delete(
  "/:fileName",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const dir = targetDirFor(server.software);
    await fileManager.deleteEntry(server.dataPath, `${dir}/${req.params.fileName}`);
    res.status(204).send();
  })
);
