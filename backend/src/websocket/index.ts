import { WebSocketServer, WebSocket } from "ws";
import { Server as HttpServer } from "http";
import { verifyAccessToken } from "../utils/tokens";
import { prisma } from "../config/prisma";
import { streamContainerLogs, sendConsoleCommand, getContainerStats } from "../services/docker.service";

interface ClientState {
  ws: WebSocket;
  userId: string;
  role: string;
  consoleSubs: Map<string, { stop: () => void }>; // serverId -> log stream handle
}

const clients = new Set<ClientState>();
// userId -> sockets, used for targeted notification / status delivery
const userSockets = new Map<string, Set<ClientState>>();

type InboundMessage =
  | { type: "subscribe_console"; serverId: string }
  | { type: "unsubscribe_console"; serverId: string }
  | { type: "console_command"; serverId: string; command: string }
  | { type: "subscribe_stats"; serverId: string };

export function initWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");

    let userId: string;
    let role: string;
    try {
      const payload = verifyAccessToken(token ?? "");
      userId = payload.sub;
      role = payload.role;
    } catch {
      ws.close(4001, "Unauthorized");
      return;
    }

    const state: ClientState = { ws, userId, role, consoleSubs: new Map() };
    clients.add(state);
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(state);

    let statsInterval: NodeJS.Timeout | null = null;

    ws.on("message", async (raw) => {
      let msg: InboundMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // Every action is scoped to servers the connected user actually owns (or admin).
      const server = await prisma.server.findUnique({ where: { id: (msg as any).serverId } });
      if (!server || (server.ownerId !== userId && role !== "ADMIN")) {
        ws.send(JSON.stringify({ type: "error", message: "Server not found or access denied" }));
        return;
      }

      switch (msg.type) {
        case "subscribe_console": {
          if (state.consoleSubs.has(server.id) || !server.containerId) return;
          const handle = streamContainerLogs(server.containerId, (line) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "console_line", serverId: server.id, line }));
            }
          });
          state.consoleSubs.set(server.id, handle);
          break;
        }
        case "unsubscribe_console": {
          state.consoleSubs.get(server.id)?.stop();
          state.consoleSubs.delete(server.id);
          break;
        }
        case "console_command": {
          if (!server.containerId || server.status !== "ONLINE") return;
          const output = await sendConsoleCommand(server.containerId, msg.command);
          ws.send(JSON.stringify({ type: "console_line", serverId: server.id, line: `> ${msg.command}\n${output}` }));
          break;
        }
        case "subscribe_stats": {
          if (statsInterval) clearInterval(statsInterval);
          statsInterval = setInterval(async () => {
            if (!server.containerId || server.status !== "ONLINE") return;
            try {
              const stats = await getContainerStats(server.containerId);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "stats", serverId: server.id, ...stats }));
              }
            } catch {
              /* container may have just stopped */
            }
          }, 3000);
          break;
        }
      }
    });

    ws.on("close", () => {
      state.consoleSubs.forEach((handle) => handle.stop());
      clients.delete(state);
      userSockets.get(userId)?.delete(state);
      if (statsInterval) clearInterval(statsInterval);
    });
  });

  return wss;
}

/** Broadcasts a server status change to the owning user's connected clients. */
export function broadcastServerStatus(serverId: string, status: string) {
  prisma.server.findUnique({ where: { id: serverId } }).then((server) => {
    if (!server) return;
    const sockets = userSockets.get(server.ownerId);
    if (!sockets) return;
    for (const client of sockets) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ type: "status", serverId, status }));
      }
    }
  });
}

/** Pushes a notification payload to every socket the target user has open. */
export function pushNotificationToUser(userId: string, notification: unknown) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  for (const client of sockets) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type: "notification", notification }));
    }
  }
}
