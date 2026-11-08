import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ServerApi } from "../../api/endpoints";
import type { MinecraftServer } from "../../types";

export function SettingsTab() {
  const { server } = useOutletContext<{ server: MinecraftServer }>();
  const navigate = useNavigate();
  const [name, setName] = useState(server.name);
  const [maxPlayers, setMaxPlayers] = useState(server.maxPlayers);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await ServerApi.update(server.id, { name, maxPlayers });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Permanently delete "${server.name}" and all its data? This cannot be undone.`)) return;
    await ServerApi.remove(server.id);
    navigate("/dashboard");
  };

  return (
    <div className="grid grid--2">
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>General</h3>
        <div className="field">
          <label htmlFor="name">Server name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="maxPlayers">Max players</label>
          <input
            id="maxPlayers"
            type="number"
            className="input"
            min={1}
            max={200}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="field">
          <label>Software & version</label>
          <input className="input" disabled value={`${server.software} ${server.mcVersion}`} />
          <small>To change software or version, create a new server — this avoids world-compatibility issues.</small>
        </div>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>

      <div className="card" style={{ borderColor: "rgba(229,72,77,0.35)" }}>
        <h3 style={{ marginBottom: 8, color: "var(--danger)" }}>Danger zone</h3>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Deleting a server removes its container and all world data, backups, and configuration permanently.
        </p>
        <button className="btn btn--danger" onClick={handleDelete}>
          Delete this server
        </button>
      </div>
    </div>
  );
}
