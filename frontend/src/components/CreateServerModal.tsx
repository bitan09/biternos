import { useState } from "react";
import { Modal } from "./Modal";
import { ServerApi } from "../api/endpoints";
import type { ServerSoftware } from "../types";

const SOFTWARE_OPTIONS: { value: ServerSoftware; label: string; note: string }[] = [
  { value: "PAPER", label: "Paper", note: "High-performance, plugin support (recommended)" },
  { value: "VANILLA", label: "Vanilla", note: "Official Mojang server, no plugins/mods" },
  { value: "SPIGOT", label: "Spigot", note: "Classic plugin server" },
  { value: "PURPUR", label: "Purpur", note: "Paper fork with extra gameplay features" },
  { value: "FABRIC", label: "Fabric", note: "Lightweight mod loader" },
  { value: "FORGE", label: "Forge", note: "Full-featured mod loader" },
];

export function CreateServerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [software, setSoftware] = useState<ServerSoftware>("PAPER");
  const [mcVersion, setMcVersion] = useState("1.21.1");
  const [ramMb, setRamMb] = useState(2048);
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await ServerApi.create({ name, software, mcVersion, ramMb, maxPlayers });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to create server");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Create a new server" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label htmlFor="name">Server name</label>
          <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="My Survival World" />
        </div>

        <div className="field">
          <label htmlFor="software">Server software</label>
          <select id="software" className="select" value={software} onChange={(e) => setSoftware(e.target.value as ServerSoftware)}>
            {SOFTWARE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.note}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="version">Minecraft version</label>
          <input id="version" className="input" required value={mcVersion} onChange={(e) => setMcVersion(e.target.value)} placeholder="1.21.1" />
          <small>Use "LATEST" for the newest supported release, or an exact version like 1.20.4.</small>
        </div>

        <div className="grid grid--2">
          <div className="field">
            <label htmlFor="ram">RAM (MB)</label>
            <input
              id="ram"
              type="number"
              className="input"
              min={512}
              step={512}
              value={ramMb}
              onChange={(e) => setRamMb(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="field">
            <label htmlFor="players">Max players</label>
            <input
              id="players"
              type="number"
              className="input"
              min={1}
              max={200}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        <button type="submit" className="btn btn--primary" style={{ width: "100%" }} disabled={submitting}>
          {submitting ? "Creating…" : "Create server"}
        </button>
      </form>
    </Modal>
  );
}
