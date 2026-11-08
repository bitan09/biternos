import { useEffect, useState, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import { NotificationsApi } from "../api/endpoints";
import type { Notification } from "../types";

export function NotificationBell() {
  const { notifications: liveNotifications } = useSocket();
  const [history, setHistory] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    NotificationsApi.list()
      .then((res) => setHistory(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Merge live pushes with fetched history, de-duplicated by id.
  const merged = [...liveNotifications, ...history].filter(
    (n, idx, arr) => arr.findIndex((x) => x.id === n.id) === idx
  );
  const unreadCount = merged.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await NotificationsApi.markAllRead();
    setHistory((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn btn--ghost btn--icon" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        🔔 {unreadCount > 0 && <span style={{ color: "var(--green)", fontWeight: 700 }}>{unreadCount}</span>}
      </button>

      {open && (
        <div
          className="card"
          style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 320, zIndex: 50, padding: 12 }}
        >
          <div className="flex-between mb-16">
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            <button className="btn btn--ghost btn--sm" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {merged.length === 0 && <p className="text-muted" style={{ fontSize: 13 }}>No notifications yet.</p>}
            {merged.slice(0, 20).map((n) => (
              <div key={n.id} style={{ padding: 10, borderRadius: 8, background: "var(--surface-raised)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
