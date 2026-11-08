import { useEffect, useState } from "react";
import { AdminApi } from "../api/endpoints";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  isSuspended: boolean;
  maxServers: number;
  maxRamMb: number;
  createdAt: string;
  _count: { servers: number };
}

interface AdminServer {
  id: string;
  name: string;
  status: string;
  software: string;
  mcVersion: string;
  ramMb: number;
  owner: { username: string; email: string };
}

interface SystemInfo {
  docker: { containers: number; containersRunning: number; images: number; cpus: number; memTotalBytes: number };
  platform: { userCount: number; serverCount: number; onlineCount: number };
}

export function AdminPage() {
  const [tab, setTab] = useState<"users" | "servers" | "system">("system");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [servers, setServers] = useState<AdminServer[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);

  const loadUsers = () => AdminApi.listUsers().then((res) => setUsers(res.data));
  const loadServers = () => AdminApi.listServers().then((res) => setServers(res.data));
  const loadSystem = () => AdminApi.system().then((res) => setSystem(res.data));

  useEffect(() => {
    loadUsers();
    loadServers();
    loadSystem();
  }, []);

  const toggleSuspend = async (user: AdminUser) => {
    await AdminApi.updateUser(user.id, { isSuspended: !user.isSuspended });
    loadUsers();
  };

  const toggleRole = async (user: AdminUser) => {
    await AdminApi.updateUser(user.id, { role: user.role === "ADMIN" ? "USER" : "ADMIN" });
    loadUsers();
  };

  const removeUser = async (user: AdminUser) => {
    if (!confirm(`Delete user "${user.username}" and all their servers?`)) return;
    await AdminApi.removeUser(user.id);
    loadUsers();
    loadServers();
  };

  const removeServer = async (server: AdminServer) => {
    if (!confirm(`Delete server "${server.name}"?`)) return;
    await AdminApi.removeServer(server.id);
    loadServers();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin panel</h1>
          <p>Manage users, servers, and platform resources.</p>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === "system" ? "active" : ""}`} onClick={() => setTab("system")}>System</div>
        <div className={`tab ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>Users ({users.length})</div>
        <div className={`tab ${tab === "servers" ? "active" : ""}`} onClick={() => setTab("servers")}>Servers ({servers.length})</div>
      </div>

      {tab === "system" && system && (
        <div className="grid grid--servers">
          <StatCard label="Total users" value={system.platform.userCount} />
          <StatCard label="Total servers" value={system.platform.serverCount} />
          <StatCard label="Servers online" value={system.platform.onlineCount} />
          <StatCard label="Docker containers running" value={system.docker.containersRunning} />
          <StatCard label="Host CPUs" value={system.docker.cpus} />
          <StatCard label="Host memory" value={`${(system.docker.memTotalBytes / 1e9).toFixed(1)} GB`} />
        </div>
      )}

      {tab === "users" && (
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Servers</th>
              <th>Limits</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u._count.servers}</td>
                <td>
                  {u.maxServers} servers / {u.maxRamMb}MB
                </td>
                <td>{u.isSuspended ? "Suspended" : "Active"}</td>
                <td>
                  <div className="flex gap-8">
                    <button className="btn btn--ghost btn--sm" onClick={() => toggleRole(u)}>
                      {u.role === "ADMIN" ? "Demote" : "Promote"}
                    </button>
                    <button className="btn btn--secondary btn--sm" onClick={() => toggleSuspend(u)}>
                      {u.isSuspended ? "Unsuspend" : "Suspend"}
                    </button>
                    <button className="btn btn--danger btn--sm" onClick={() => removeUser(u)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "servers" && (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Software</th>
              <th>Status</th>
              <th>RAM</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.owner.username}</td>
                <td>
                  {s.software} {s.mcVersion}
                </td>
                <td>{s.status}</td>
                <td>{s.ramMb} MB</td>
                <td>
                  <button className="btn btn--danger btn--sm" onClick={() => removeServer(s)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="text-muted" style={{ fontSize: 13, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
