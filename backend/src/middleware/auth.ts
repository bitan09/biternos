import { NextFunction, Request, Response } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../utils/tokens";
import { ApiError } from "../utils/asyncHandler";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/** Requires a valid `Authorization: Bearer <token>` header. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Not authenticated"));
  }
  try {
    const token = header.slice("Bearer ".length);
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

/** Must be used after requireAuth. Restricts the route to ADMIN users. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return next(new ApiError(403, "Admin access required"));
  }
  next();
}
