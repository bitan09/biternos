import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { ServerApi } from "../../api/endpoints";
import { StatusBadge } from "../../components/StatusBadge";
import { FullscreenLoader } from "../../components/RouteGuards";
import { useSocket } from "../../context/SocketContext";
import type { MinecraftServer, ServerStatus } from "../../types";

const TABS = [
  { to: "", label: "Console", end: true },
  { to: "files", label: "Files" },
  { to: "properties", label: "Properties" },
  { to: "players", label: "Players" },
  { to: "plugins", label: "Plugins & Mods" },
  { to: "backups", label: "Backups" },
  { to: "settings", label: "Settings" },
];

export function ServerDetailLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subscribeStatus } = useSocket();
  const [server, setServer] = useState<MinecraftServer | null>(null);
  const [status, setStatus] = useState<ServerStatus>("OFFLINE");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    ServerApi.get(id).then((res) => {
      setServer(res.data);
      setStatus(res.data.status);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    return subscribeStatus(id, setStatus);
  }, [id, subscribeStatus]);

  if (!server || !id) return <FullscreenLoader />;

  const runAction = async (action: "start" | "stop" | "restart" | "kill") => {
    setBusy(true);
    try {
      if (action === "start") await ServerApi.start(id);
      if (action === "stop") await ServerApi.stop(id);
      if (action === "restart") await ServerApi.restart(id);
      if (action === "kill") await ServerApi.kill(id);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${server.name}"? This cannot be undone.`)) return;
    await ServerApi.remove(id);
    navigate("/dashboard");
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="flex gap-12">
            <h1>{server.name}</h1>
            <StatusBadge status={status} />
          </div>
          <p>
            {server.software} {server.mcVersion} · Port {server.hostPort}
          </p>
        </div>

        <div className="flex gap-8">
          {status === "OFFLINE" || status === "CRASHED" ? (
            <button className="btn btn--primary" disabled={busy} onClick={() => runAction("start")}>
              ▶ Start
            </button>
          ) : (
            <button className="btn btn--secondary" disabled={busy || status !== "ONLINE"} onClick={() => runAction("stop")}>
              ■ Stop
            </button>
          )}
          <button className="btn btn--secondary" disabled={busy || status !== "ONLINE"} onClick={() => runAction("restart")}>
            ↻ Restart
          </button>
          <button className="btn btn--danger" disabled={busy || status === "OFFLINE"} onClick={() => runAction("kill")}>
            ⚠ Kill
          </button>
          <button className="btn btn--ghost" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet context={{ server, status }} />
    </div>
  );
}
