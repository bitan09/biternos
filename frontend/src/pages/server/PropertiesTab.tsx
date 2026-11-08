import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PropertiesApi } from "../../api/endpoints";

// The handful of settings most players actually want to change, presented as
// friendly controls; everything else is still editable as raw key/value pairs.
const COMMON_KEYS: { key: string; label: string; type: "text" | "select" | "number" | "boolean"; options?: string[] }[] = [
  { key: "motd", label: "Message of the day", type: "text" },
  { key: "difficulty", label: "Difficulty", type: "select", options: ["peaceful", "easy", "normal", "hard"] },
  { key: "gamemode", label: "Gamemode", type: "select", options: ["survival", "creative", "adventure", "spectator"] },
  { key: "max-players", label: "Max players", type: "number" },
  { key: "pvp", label: "PvP enabled", type: "boolean" },
  { key: "spawn-protection", label: "Spawn protection radius", type: "number" },
  { key: "view-distance", label: "View distance", type: "number" },
  { key: "allow-flight", label: "Allow flight", type: "boolean" },
  { key: "white-list", label: "Whitelist enabled", type: "boolean" },
];

export function PropertiesTab() {
  const { id } = useParams<{ id: string }>();
  const [props, setProps] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    PropertiesApi.get(id).then((res) => setProps(res.data));
  }, [id]);

  if (!props) return <p className="text-muted">Loading properties…</p>;

  const setValue = (key: string, value: string) => setProps((prev) => ({ ...prev!, [key]: value }));

  const handleSave = async () => {
    if (!id || !props) return;
    setSaving(true);
    try {
      await PropertiesApi.update(id, props);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const rawEntries = Object.entries(props).filter(([key]) => !COMMON_KEYS.some((c) => c.key === key));

  return (
    <div>
      <div className="card mb-16">
        <h3 style={{ marginBottom: 16 }}>Common settings</h3>
        {COMMON_KEYS.map(({ key, label, type, options }) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{label}</label>
            {type === "select" ? (
              <select id={key} className="select" value={props[key] ?? ""} onChange={(e) => setValue(key, e.target.value)}>
                {options!.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : type === "boolean" ? (
              <select id={key} className="select" value={props[key] ?? "false"} onChange={(e) => setValue(key, e.target.value)}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            ) : (
              <input
                id={key}
                type={type === "number" ? "number" : "text"}
                className="input"
                value={props[key] ?? ""}
                onChange={(e) => setValue(key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="card mb-16">
        <h3 style={{ marginBottom: 16 }}>Advanced (raw server.properties)</h3>
        {rawEntries.length === 0 ? (
          <p className="text-muted">No additional properties recorded yet — boot the server once to generate the full file.</p>
        ) : (
          rawEntries.map(([key, value]) => (
            <div className="field" key={key}>
              <label htmlFor={key}>{key}</label>
              <input id={key} className="input" value={value} onChange={(e) => setValue(key, e.target.value)} />
            </div>
          ))
        )}
      </div>

      <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
      <span className="text-muted" style={{ marginLeft: 12, fontSize: 13 }}>Restart the server to apply changes.</span>
    </div>
  );
}
