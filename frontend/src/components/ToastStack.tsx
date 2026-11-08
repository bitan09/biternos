import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import type { Notification } from "../types";

export function ToastStack() {
  const { notifications } = useSocket();
  const [visible, setVisible] = useState<Notification[]>([]);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);

  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    if (latest.id === lastSeenId) return;
    setLastSeenId(latest.id);
    setVisible((prev) => [latest, ...prev]);
    const timer = setTimeout(() => {
      setVisible((prev) => prev.filter((n) => n.id !== latest.id));
    }, 6000);
    return () => clearTimeout(timer);
  }, [notifications, lastSeenId]);

  if (visible.length === 0) return null;

  return (
    <div className="toast-stack">
      {visible.map((n) => (
        <div key={n.id} className={`toast level-${n.level}`}>
          <strong>{n.title}</strong>
          <p>{n.message}</p>
        </div>
      ))}
    </div>
  );
}
