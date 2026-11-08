import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string; // user id
  role: "USER" | "ADMIN";
  username: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

/** Opaque, random refresh tokens are stored hashed-free in DB (rotated on use). */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function refreshTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + env.refreshTokenTtlDays);
  return d;
}

export function passwordResetExpiry(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return d;
}
