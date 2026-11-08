import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/asyncHandler";
import { ZodError } from "zod";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error" });
}
