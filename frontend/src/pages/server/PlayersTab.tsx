import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PlayersApi } from "../../api/endpoints";
import type { PlayerListEntry, PlayerListType } from "../../types";

const LISTS: { type: PlayerListType; title: string; note: string; needsReason?: boolean }[] = [
  { type: "WHITELIST", title: "Whitelist", note: "Only these players may join (when enabled in Properties)." },
  { type: "OPERATOR", title: "Operators", note: "Players with admin command access in-game." },
  { type: "BANNED", title: "Banned players", note: "Players blocked from joining.", needsReason: true },
];

export function PlayersTab() {
  const { id } = useParams<{ id: string }>();
  const [entries, setEntries] = useState<PlayerListEntry[]>([]);
  const [usernameInputs, setUsernameInputs] = useState<Record<PlayerListType, string>>({
    WHITELIST: "",
    OPERATOR: "",
    BANNED: "",
  });

  const load = () => {
    if (!id) return;
    PlayersApi.list(id).then((res) => setEntries(res.data));
  };

  useEffect(load, [id]);

  const handleAdd = async (type: PlayerListType) => {
    if (!id) return;
    const username = usernameInputs[type].trim();
    if (!username) return;
    await PlayersApi.add(id, { type, username });
    setUsernameInputs((prev) => ({ ...prev, [type]: "" }));
    load();
  };

  const handleRemove = async (entryId: string) => {
    if (!id) return;
    await PlayersApi.remove(id, entryId);
    load();
  };

  return (
    <div className="grid grid--2">
      {LISTS.map(({ type, title, note }) => {
        const items = entries.filter((e) => e.type === type);
        return (
          <div className="card" key={type}>
            <h3>{title}</h3>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>{note}</p>

            <div className="flex gap-8 mb-16">
              <input
                className="input"
                placeholder="Minecraft username"
                value={usernameInputs[type]}
                onChange={(e) => setUsernameInputs((prev) => ({ ...prev, [type]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd(type)}
              />
              <button className="btn btn--primary btn--sm" onClick={() => handleAdd(type)}>
                Add
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 13 }}>No players added yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((entry) => (
                  <div key={entry.id} className="flex-between" style={{ padding: "6px 10px", background: "var(--surface-raised)", borderRadius: 8 }}>
                    <span style={{ fontSize: 14 }}>{entry.username}</span>
                    <button className="btn btn--ghost btn--sm" onClick={() => handleRemove(entry.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
