import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as serverService from "../services/server.service";
import { getServerProperties, updateServerProperties } from "../services/properties.service";
import { propertiesPatchSchema } from "../utils/validators";

export const propertiesRouter = Router({ mergeParams: true });
propertiesRouter.use(requireAuth);

propertiesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const props = await getServerProperties(server.dataPath);
    res.json(props);
  })
);

propertiesRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const server = await serverService.getServerOrThrow(req.params.id, req.user!.sub);
    const patch = propertiesPatchSchema.parse(req.body);
    await updateServerProperties(server.dataPath, patch);
    res.json({ message: "Properties updated — restart the server to apply changes" });
  })
);
