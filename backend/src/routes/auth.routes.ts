import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { asyncHandler, ApiError } from "../utils/asyncHandler";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../utils/validators";
import {
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiry,
  generatePasswordResetToken,
  passwordResetExpiry,
} from "../utils/tokens";
import { sendPasswordResetEmail } from "../services/mail.service";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const REFRESH_COOKIE = "bitarnos_refresh";
const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax" as const,
  maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
};

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const input = signupSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
    });
    if (existing) throw new ApiError(409, "Email or username already in use");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: { email: input.email, username: input.username, passwordHash },
    });

    const accessToken = signAccessToken({ sub: user.id, role: user.role, username: user.username });
    const refreshToken = generateRefreshToken();
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: refreshTokenExpiry() },
    });

    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.status(201).json({
      accessToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: input.emailOrUsername }, { username: input.emailOrUsername }] },
    });
    if (!user) throw new ApiError(401, "Invalid credentials");
    if (user.isSuspended) throw new ApiError(403, "This account has been suspended");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid credentials");

    const accessToken = signAccessToken({ sub: user.id, role: user.role, username: user.username });
    const refreshToken = generateRefreshToken();
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: refreshTokenExpiry() },
    });

    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({
      accessToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new ApiError(401, "No refresh token");

    const stored = await prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) throw new ApiError(401, "Refresh token expired");

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const newRefreshToken = generateRefreshToken();
    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: stored.userId, expiresAt: refreshTokenExpiry() },
    });

    const accessToken = signAccessToken({
      sub: stored.user.id,
      role: stored.user.role,
      username: stored.user.username,
    });

    res.cookie(REFRESH_COOKIE, newRefreshToken, cookieOptions);
    res.json({
      accessToken,
      user: { id: stored.user.id, username: stored.user.username, email: stored.user.email, role: stored.user.role },
    });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await prisma.refreshToken.deleteMany({ where: { token } });
    res.clearCookie(REFRESH_COOKIE);
    res.status(204).send();
  })
);

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond 200 regardless of whether the email exists (avoid account enumeration)
    if (user) {
      const token = generatePasswordResetToken();
      await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt: passwordResetExpiry() },
      });
      const resetUrl = `${env.frontendOrigin}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({ message: "If that email exists, a reset link has been sent." });
  })
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ApiError(400, "Invalid or expired reset link");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.deleteMany({ where: { userId: record.userId } }), // log out everywhere
    ]);

    res.json({ message: "Password updated. Please log in again." });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      maxServers: user.maxServers,
      maxRamMb: user.maxRamMb,
    });
  })
);
