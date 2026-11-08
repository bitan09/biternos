import { Router } from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as serverService from "../services/server.service";
import * as fileManager from "../services/filemanager.service";
import { fileWriteSchema, fileOpSchema, fileRenameSchema } from "../utils/validators";

export const filesRouter = Router({ mergeParams: true });
filesRouter.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 1024 } }); // 1GB cap

filesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const relPath = (req.query.path as string) ?? ".";
    const entries = await fileManager.listDirectory(server.dataPath, relPath);
    res.json(entries);
  })
);

filesRouter.get(
  "/content",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const relPath = req.query.path as string;
    const content = await fileManager.readFile(server.dataPath, relPath);
    res.json({ path: relPath, content });
  })
);

filesRouter.put(
  "/content",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const { path: relPath, content } = fileWriteSchema.parse(req.body);
    await fileManager.writeFile(server.dataPath, relPath, content);
    res.json({ message: "Saved" });
  })
);

filesRouter.post(
  "/directory",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const { path: relPath } = fileOpSchema.parse(req.body);
    await fileManager.createDirectory(server.dataPath, relPath);
    res.status(201).json({ message: "Folder created" });
  })
);

filesRouter.post(
  "/rename",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const { from, to } = fileRenameSchema.parse(req.body);
    await fileManager.renameEntry(server.dataPath, from, to);
    res.json({ message: "Renamed" });
  })
);

filesRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const { path: relPath } = fileOpSchema.parse(req.body);
    await fileManager.deleteEntry(server.dataPath, relPath);
    res.status(204).send();
  })
);

filesRouter.get(
  "/download",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const relPath = req.query.path as string;
    const absolute = fileManager.absolutePathFor(server.dataPath, relPath);
    res.download(absolute, path.basename(absolute));
  })
);

// Handles plugin/mod jar uploads, world uploads, config uploads — everything
// goes through this single endpoint; the target folder is chosen by `path`.
filesRouter.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const relDir = (req.body.path as string) ?? ".";
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const targetDir = fileManager.absolutePathFor(server.dataPath, relDir);
    const fs = await import("fs/promises");
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, req.file.originalname), req.file.buffer);

    res.status(201).json({ message: "Uploaded", fileName: req.file.originalname });
  })
);
