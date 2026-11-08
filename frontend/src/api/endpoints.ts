import { api } from "./client";
import type {
  BackupSchedule,
  MinecraftServer,
  Notification,
  PlayerListEntry,
  ServerStats,
  User,
} from "../types";

// ── Auth ─────────────────────────────────────────────────────────────
export const AuthApi = {
  signup: (data: { username: string; email: string; password: string }) => api.post("/auth/signup", data),
  login: (data: { emailOrUsername: string; password: string }) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<User>("/auth/me"),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) => api.post("/auth/reset-password", { token, newPassword }),
};

// ── Servers ──────────────────────────────────────────────────────────
export const ServerApi = {
  list: () => api.get<MinecraftServer[]>("/servers"),
  get: (id: string) => api.get<MinecraftServer>(`/servers/${id}`),
  create: (data: { name: string; software: string; mcVersion: string; ramMb: number; maxPlayers: number }) =>
    api.post<MinecraftServer>("/servers", data),
  update: (id: string, data: Partial<MinecraftServer>) => api.patch<MinecraftServer>(`/servers/${id}`, data),
  remove: (id: string) => api.delete(`/servers/${id}`),
  start: (id: string) => api.post(`/servers/${id}/start`),
  stop: (id: string) => api.post(`/servers/${id}/stop`),
  restart: (id: string) => api.post(`/servers/${id}/restart`),
  kill: (id: string) => api.post(`/servers/${id}/kill`),
  sendCommand: (id: string, command: string) => api.post<{ output: string }>(`/servers/${id}/console`, { command }),
  stats: (id: string) => api.get<ServerStats>(`/servers/${id}/stats`),
};

// ── Files ────────────────────────────────────────────────────────────
export const FilesApi = {
  list: (serverId: string, path: string) => api.get(`/servers/${serverId}/files`, { params: { path } }),
  read: (serverId: string, path: string) => api.get(`/servers/${serverId}/files/content`, { params: { path } }),
  write: (serverId: string, path: string, content: string) =>
    api.put(`/servers/${serverId}/files/content`, { path, content }),
  mkdir: (serverId: string, path: string) => api.post(`/servers/${serverId}/files/directory`, { path }),
  remove: (serverId: string, path: string) => api.delete(`/servers/${serverId}/files`, { data: { path } }),
  rename: (serverId: string, from: string, to: string) => api.post(`/servers/${serverId}/files/rename`, { from, to }),
  downloadUrl: (serverId: string, path: string) =>
    `${api.defaults.baseURL}/servers/${serverId}/files/download?path=${encodeURIComponent(path)}`,
  upload: (serverId: string, path: string, file: File) => {
    const form = new FormData();
    form.append("path", path);
    form.append("file", file);
    return api.post(`/servers/${serverId}/files/upload`, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

// ── Properties ───────────────────────────────────────────────────────
export const PropertiesApi = {
  get: (serverId: string) => api.get<Record<string, string>>(`/servers/${serverId}/properties`),
  update: (serverId: string, patch: Record<string, string>) =>
    api.patch(`/servers/${serverId}/properties`, patch),
};

// ── Backups ──────────────────────────────────────────────────────────
export const BackupsApi = {
  list: (serverId: string) => api.get(`/servers/${serverId}/backups`),
  create: (serverId: string) => api.post(`/servers/${serverId}/backups`),
  restore: (serverId: string, backupId: string) => api.post(`/servers/${serverId}/backups/${backupId}/restore`),
  remove: (serverId: string, backupId: string) => api.delete(`/servers/${serverId}/backups/${backupId}`),
  downloadUrl: (serverId: string, backupId: string) =>
    `${api.defaults.baseURL}/servers/${serverId}/backups/${backupId}/download`,
  getSchedule: (serverId: string) => api.get<BackupSchedule>(`/servers/${serverId}/backups/schedule`),
  setSchedule: (serverId: string, data: BackupSchedule) => api.put(`/servers/${serverId}/backups/schedule`, data),
};

// ── Players ──────────────────────────────────────────────────────────
export const PlayersApi = {
  list: (serverId: string, type?: string) =>
    api.get<PlayerListEntry[]>(`/servers/${serverId}/players`, { params: type ? { type } : {} }),
  add: (serverId: string, data: { type: string; username: string; reason?: string }) =>
    api.post(`/servers/${serverId}/players`, data),
  remove: (serverId: string, entryId: string) => api.delete(`/servers/${serverId}/players/${entryId}`),
};

// ── Plugins / Mods ───────────────────────────────────────────────────
export const PluginsApi = {
  list: (serverId: string) => api.get(`/servers/${serverId}/plugins`),
  install: (serverId: string, url: string, fileName: string) =>
    api.post(`/servers/${serverId}/plugins/install`, { url, fileName }),
  remove: (serverId: string, fileName: string) => api.delete(`/servers/${serverId}/plugins/${fileName}`),
};

// ── Notifications ────────────────────────────────────────────────────
export const NotificationsApi = {
  list: () => api.get<Notification[]>("/notifications"),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
};

// ── Admin ────────────────────────────────────────────────────────────
export const AdminApi = {
  listUsers: () => api.get("/admin/users"),
  updateUser: (id: string, data: any) => api.patch(`/admin/users/${id}`, data),
  removeUser: (id: string) => api.delete(`/admin/users/${id}`),
  listServers: () => api.get("/admin/servers"),
  removeServer: (id: string) => api.delete(`/admin/servers/${id}`),
  system: () => api.get("/admin/system"),
};
