import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MinecraftServer, ServerStatus } from "../types";
import { StatusBadge } from "./StatusBadge";
import { useSocket } from "../context/SocketContext";
import { ServerApi } from "../api/endpoints";

const SOFTWARE_LABELS: Record<string, string> = {
  VANILLA: "Vanilla",
  PAPER: "Paper",
  SPIGOT: "Spigot",
  FABRIC: "Fabric",
  FORGE: "Forge",
  PURPUR: "Purpur",
};

export function ServerCard({ server }: { server: MinecraftServer }) {
  const navigate = useNavigate();
  const { subscribeStatus } = useSocket();
  const [status, setStatus] = useState<ServerStatus>(server.status);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeStatus(server.id, setStatus), [server.id, subscribeStatus]);

  const runAction = async (action: "start" | "stop" | "restart") => {
    setBusy(true);
    try {
      if (action === "start") await ServerApi.start(server.id);
      if (action === "stop") await ServerApi.stop(server.id);
      if (action === "restart") await ServerApi.restart(server.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card--interactive" onClick={() => navigate(`/servers/${server.id}`)} style={{ cursor: "pointer" }}>
      <div className="flex-between mb-16">
        <h3 style={{ fontSize: 16 }}>{server.name}</h3>
        <StatusBadge status={status} />
      </div>

      <div className="flex gap-8 text-muted" style={{ fontSize: 13, marginBottom: 4 }}>
        <span>{SOFTWARE_LABELS[server.software]}</span>
        <span>·</span>
        <span>{server.mcVersion}</span>
      </div>
      <div className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
        {server.ramMb} MB RAM · Up to {server.maxPlayers} players
      </div>

      <div className="flex gap-8" onClick={(e) => e.stopPropagation()}>
        {status === "OFFLINE" || status === "CRASHED" ? (
          <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => runAction("start")}>
            Start
          </button>
        ) : (
          <button className="btn btn--secondary btn--sm" disabled={busy || status !== "ONLINE"} onClick={() => runAction("stop")}>
            Stop
          </button>
        )}
        <button className="btn btn--ghost btn--sm" disabled={busy || status !== "ONLINE"} onClick={() => runAction("restart")}>
          Restart
        </button>
      </div>
    </div>
  );
}
