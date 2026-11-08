import { useEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import type { MinecraftServer, ServerStatus } from "../../types";

export function ConsoleTab() {
  const { id } = useParams<{ id: string }>();
  const { status } = useOutletContext<{ server: MinecraftServer; status: ServerStatus }>();
  const { subscribeConsole, subscribeStats, sendCommand } = useSocket();

  const [lines, setLines] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [stats, setStats] = useState({ cpuPercent: 0, ramMb: 0 });
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    return subscribeConsole(id, (line) => setLines((prev) => [...prev.slice(-500), line]));
  }, [id, subscribeConsole]);

  useEffect(() => {
    if (!id || status !== "ONLINE") return;
    return subscribeStats(id, setStats);
  }, [id, status, subscribeStats]);

  useEffect(() => {
    consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight });
  }, [lines]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !command.trim()) return;
    sendCommand(id, command.trim());
    setCommand("");
  };

  return (
    <div>
      <div className="grid grid--2 mb-16">
        <ResourceMeter label="CPU usage" value={stats.cpuPercent} max={100} unit="%" />
        <ResourceMeter label="RAM usage" value={stats.ramMb} max={undefined} unit=" MB" />
      </div>

      <div className="console" ref={consoleRef}>
        {lines.length === 0 ? (
          <span className="text-muted">
            {status === "ONLINE" ? "Waiting for server output…" : "Start the server to see live console output."}
          </span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={line.startsWith(">") ? "console__line--command" : undefined}>
              {line}
            </div>
          ))
        )}
      </div>

      <form className="console-input" onSubmit={handleSend}>
        <input
          className="input"
          style={{ fontFamily: "var(--font-mono)" }}
          placeholder={status === "ONLINE" ? "Type a command, e.g. say Hello world" : "Server must be online to send commands"}
          value={command}
          disabled={status !== "ONLINE"}
          onChange={(e) => setCommand(e.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={status !== "ONLINE" || !command.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

function ResourceMeter({ label, value, max, unit }: { label: string; value: number; max?: number; unit: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : Math.min(100, (value / 4096) * 100);
  return (
    <div className="card">
      <div className="flex-between mb-16">
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
          {value.toFixed(max === 100 ? 1 : 0)}
          {unit}
        </span>
      </div>
      <div className="meter">
        <div className="meter__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
