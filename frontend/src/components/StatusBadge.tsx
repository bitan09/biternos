import type { ServerStatus } from "../types";

const LABELS: Record<ServerStatus, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  STARTING: "Starting",
  STOPPING: "Stopping",
  CRASHED: "Crashed",
};

export function StatusBadge({ status }: { status: ServerStatus }) {
  return (
    <span className={`badge status--${status.toLowerCase()}`}>
      <span className="status-dot" />
      {LABELS[status]}
    </span>
  );
}
