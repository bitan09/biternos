import { useEffect, useState } from "react";
import { ServerApi } from "../api/endpoints";
import { ServerCard } from "../components/ServerCard";
import { CreateServerModal } from "../components/CreateServerModal";
import { FullscreenLoader } from "../components/RouteGuards";
import type { MinecraftServer } from "../types";

export function DashboardPage() {
  const [servers, setServers] = useState<MinecraftServer[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    ServerApi.list().then((res) => setServers(res.data));
  };

  useEffect(load, []);

  if (servers === null) return <FullscreenLoader />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My servers</h1>
          <p>Create, start, and manage your Minecraft servers.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
          + New server
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="empty-state card">
          <h3>No servers yet</h3>
          <p>Create your first Minecraft server to get started — it only takes a minute.</p>
          <button className="btn btn--primary mt-16" onClick={() => setShowCreate(true)}>
            + New server
          </button>
        </div>
      ) : (
        <div className="grid grid--servers">
          {servers.map((s) => (
            <ServerCard key={s.id} server={s} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateServerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
