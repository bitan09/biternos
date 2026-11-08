export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  maxServers: number;
  maxRamMb: number;
}

export type ServerSoftware = "VANILLA" | "PAPER" | "SPIGOT" | "FABRIC" | "FORGE" | "PURPUR";
export type ServerStatus = "OFFLINE" | "STARTING" | "ONLINE" | "STOPPING" | "CRASHED";

export interface MinecraftServer {
  id: string;
  name: string;
  ownerId: string;
  software: ServerSoftware;
  mcVersion: string;
  status: ServerStatus;
  hostPort: number;
  ramMb: number;
  cpuLimit: number;
  maxPlayers: number;
  motd: string;
  difficulty: string;
  gamemode: string;
  createdAt: string;
  lastStartedAt: string | null;
}

export interface ServerStats {
  cpuPercent: number;
  ramMb: number;
  ramLimitMb: number;
  playerCount: number;
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string;
}

export interface Backup {
  id: string;
  serverId: string;
  fileName: string;
  sizeBytes: string;
  status: "PENDING" | "RUNNING" | "COMPLETE" | "FAILED";
  automatic: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface BackupSchedule {
  enabled: boolean;
  intervalHours: number;
  retainCount: number;
}

export type PlayerListType = "WHITELIST" | "OPERATOR" | "BANNED";

export interface PlayerListEntry {
  id: string;
  serverId: string;
  type: PlayerListType;
  username: string;
  reason: string | null;
  addedAt: string;
}

export type NotificationLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface Notification {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
