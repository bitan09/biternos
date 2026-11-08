import "dotenv/config";

/**
 * Centralised, validated environment configuration.
 * Fail fast on boot if something critical is missing in production.
 */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),

  databaseUrl: required("DATABASE_URL", "postgresql://bitarnos:bitarnos@localhost:5432/bitarnos"),

  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev_access_secret"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev_refresh_secret"),
  cookieSecret: required("COOKIE_SECRET", "dev_cookie_secret"),

  accessTokenTtl: "15m",
  refreshTokenTtlDays: 30,

  mcDataRoot: process.env.MC_DATA_ROOT ?? "/mc-data",
  mcDockerNetwork: process.env.MC_DOCKER_NETWORK ?? "bitarnos_mcnet",
  mcPortRangeStart: 25565,
  mcPortRangeEnd: 25664,

  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",

  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
};
