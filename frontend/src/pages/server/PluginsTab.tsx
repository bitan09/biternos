import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { PluginsApi } from "../../api/endpoints";
import type { FileEntry, MinecraftServer } from "../../types";

export function PluginsTab() {
  const { id } = useParams<{ id: string }>();
  const { server } = useOutletContext<{ server: MinecraftServer }>();
  const [installed, setInstalled] = useState<FileEntry[]>([]);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isModLoader = server.software === "FABRIC" || server.software === "FORGE";
  const dirLabel = isModLoader ? "mods" : "plugins";

  const load = () => {
    if (!id) return;
    PluginsApi.list(id).then((res) => setInstalled(res.data));
  };

  useEffect(load, [id]);

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setInstalling(true);
    try {
      await PluginsApi.install(id, url, fileName);
      setUrl("");
      setFileName("");
      load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not install that file");
    } finally {
      setInstalling(false);
    }
  };

  const handleRemove = async (name: string) => {
    if (!id || !confirm(`Remove ${name}?`)) return;
    await PluginsApi.remove(id, name);
    load();
  };

  return (
    <div>
      <div className="card mb-16">
        <h3 style={{ marginBottom: 4 }}>Install a {isModLoader ? "mod" : "plugin"}</h3>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Paste a direct .jar download link (e.g. from Modrinth, CurseForge, or SpigotMC) — it'll be installed straight into
          your server's <code>{dirLabel}/</code> folder.
        </p>
        <form onSubmit={handleInstall}>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label htmlFor="url">Download URL</label>
            <input id="url" className="input" required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/myplugin.jar" />
          </div>
          <div className="field">
            <label htmlFor="fileName">File name</label>
            <input id="fileName" className="input" required value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="myplugin.jar" />
          </div>
          <button type="submit" className="btn btn--primary" disabled={installing}>
            {installing ? "Installing…" : "Install"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Installed ({dirLabel}/)</h3>
        {installed.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>Nothing installed yet.</p>
        ) : (
          installed.map((entry) => (
            <div key={entry.path} className="flex-between" style={{ padding: "8px 4px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 14 }}>{entry.name}</span>
              <button className="btn btn--ghost btn--sm" onClick={() => handleRemove(entry.name)}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
