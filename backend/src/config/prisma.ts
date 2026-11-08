import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance across the app (avoids exhausting
// Postgres connections when the module gets hot-reloaded in dev).
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
