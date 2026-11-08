import { z } from "zod";

export const signupSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export const createServerSchema = z.object({
  name: z.string().min(3).max(40),
  software: z.enum(["VANILLA", "PAPER", "SPIGOT", "FABRIC", "FORGE", "PURPUR"]),
  mcVersion: z.string().min(1),
  ramMb: z.number().int().min(512).max(16384),
  maxPlayers: z.number().int().min(1).max(200),
});

export const updateServerSchema = z.object({
  name: z.string().min(3).max(40).optional(),
  motd: z.string().max(200).optional(),
  difficulty: z.enum(["peaceful", "easy", "normal", "hard"]).optional(),
  gamemode: z.enum(["survival", "creative", "adventure", "spectator"]).optional(),
  maxPlayers: z.number().int().min(1).max(200).optional(),
});

export const consoleCommandSchema = z.object({
  command: z.string().min(1).max(500),
});

export const propertiesPatchSchema = z.record(z.string());

export const playerListEntrySchema = z.object({
  type: z.enum(["WHITELIST", "OPERATOR", "BANNED"]),
  username: z.string().min(1).max(32),
  reason: z.string().max(200).optional(),
});

export const backupScheduleSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number().int().min(1).max(168),
  retainCount: z.number().int().min(1).max(30),
});

export const fileWriteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const fileOpSchema = z.object({
  path: z.string().min(1),
});

export const fileRenameSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  isSuspended: z.boolean().optional(),
  maxServers: z.number().int().min(0).max(100).optional(),
  maxRamMb: z.number().int().min(512).max(65536).optional(),
});
