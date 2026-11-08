import { useEffect, useState } from "react";
import { NotificationsApi } from "../api/endpoints";
import type { Notification } from "../types";

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    NotificationsApi.list().then((res) => setNotifications(res.data));
  }, []);

  const handleMarkAllRead = async () => {
    await NotificationsApi.markAllRead();
    setNotifications((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Updates about your servers, backups, and account.</p>
        </div>
        <button className="btn btn--secondary" onClick={handleMarkAllRead}>
          Mark all as read
        </button>
      </div>

      {!notifications ? (
        <p className="text-muted">Loading…</p>
      ) : notifications.length === 0 ? (
        <div className="empty-state card">
          <h3>You're all caught up</h3>
          <p>New notifications will show up here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifications.map((n) => (
            <div key={n.id} className="card" style={{ opacity: n.read ? 0.7 : 1 }}>
              <div className="flex-between">
                <strong style={{ fontSize: 14 }}>{n.title}</strong>
                <span className="text-muted" style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
