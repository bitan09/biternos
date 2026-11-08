import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { wsUrl } from "../api/client";
import { useAuth } from "./AuthContext";
import type { Notification, ServerStatus } from "../types";

type StatusListener = (status: ServerStatus) => void;
type ConsoleListener = (line: string) => void;
type StatsListener = (stats: { cpuPercent: number; ramMb: number }) => void;

interface SocketContextValue {
  notifications: Notification[];
  connected: boolean;
  subscribeStatus: (serverId: string, cb: StatusListener) => () => void;
  subscribeConsole: (serverId: string, cb: ConsoleListener) => () => void;
  subscribeStats: (serverId: string, cb: StatsListener) => () => void;
  sendCommand: (serverId: string, command: string) => void;
  pushLocalNotification: (n: Notification) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const statusListeners = useRef(new Map<string, Set<StatusListener>>());
  const consoleListeners = useRef(new Map<string, Set<ConsoleListener>>());
  const statsListeners = useRef(new Map<string, Set<StatsListener>>());

  useEffect(() => {
    if (!user) {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
      return;
    }

    const ws = new WebSocket(wsUrl(""));
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "status":
          statusListeners.current.get(msg.serverId)?.forEach((cb) => cb(msg.status));
          break;
        case "console_line":
          consoleListeners.current.get(msg.serverId)?.forEach((cb) => cb(msg.line));
          break;
        case "stats":
          statsListeners.current.get(msg.serverId)?.forEach((cb) => cb(msg));
          break;
        case "notification":
          setNotifications((prev) => [msg.notification, ...prev].slice(0, 50));
          break;
      }
    };

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function subscribeStatus(serverId: string, cb: StatusListener) {
    if (!statusListeners.current.has(serverId)) statusListeners.current.set(serverId, new Set());
    statusListeners.current.get(serverId)!.add(cb);
    return () => statusListeners.current.get(serverId)?.delete(cb);
  }

  function subscribeConsole(serverId: string, cb: ConsoleListener) {
    if (!consoleListeners.current.has(serverId)) consoleListeners.current.set(serverId, new Set());
    consoleListeners.current.get(serverId)!.add(cb);
    wsRef.current?.send(JSON.stringify({ type: "subscribe_console", serverId }));
    return () => {
      consoleListeners.current.get(serverId)?.delete(cb);
      wsRef.current?.send(JSON.stringify({ type: "unsubscribe_console", serverId }));
    };
  }

  function subscribeStats(serverId: string, cb: StatsListener) {
    if (!statsListeners.current.has(serverId)) statsListeners.current.set(serverId, new Set());
    statsListeners.current.get(serverId)!.add(cb);
    wsRef.current?.send(JSON.stringify({ type: "subscribe_stats", serverId }));
    return () => statsListeners.current.get(serverId)?.delete(cb);
  }

  function sendCommand(serverId: string, command: string) {
    wsRef.current?.send(JSON.stringify({ type: "console_command", serverId, command }));
  }

  function pushLocalNotification(n: Notification) {
    setNotifications((prev) => [n, ...prev].slice(0, 50));
  }

  return (
    <SocketContext.Provider
      value={{ notifications, connected, subscribeStatus, subscribeConsole, subscribeStats, sendCommand, pushLocalNotification }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
