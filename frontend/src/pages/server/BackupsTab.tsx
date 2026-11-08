import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BackupsApi } from "../../api/endpoints";
import type { Backup, BackupSchedule } from "../../types";

function formatBytes(bytesStr: string) {
  const bytes = Number(bytesStr);
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupsTab() {
  const { id } = useParams<{ id: string }>();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedule, setSchedule] = useState<BackupSchedule>({ enabled: false, intervalHours: 24, retainCount: 7 });
  const [creating, setCreating] = useState(false);

  const load = () => {
    if (!id) return;
    BackupsApi.list(id).then((res) => setBackups(res.data));
    BackupsApi.getSchedule(id).then((res) => setSchedule(res.data));
  };

  useEffect(load, [id]);

  const handleCreate = async () => {
    if (!id) return;
    setCreating(true);
    try {
      await BackupsApi.create(id);
      load();
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!id || !confirm("Restore this backup? The server's current world and files will be replaced. Make sure the server is stopped.")) return;
    await BackupsApi.restore(id, backupId);
    load();
  };

  const handleDelete = async (backupId: string) => {
    if (!id || !confirm("Delete this backup permanently?")) return;
    await BackupsApi.remove(id, backupId);
    load();
  };

  const handleScheduleSave = async () => {
    if (!id) return;
    await BackupsApi.setSchedule(id, schedule);
  };

  return (
    <div>
      <div className="card mb-16">
        <h3 style={{ marginBottom: 16 }}>Automatic backups</h3>
        <div className="field">
          <label htmlFor="enabled">Status</label>
          <select
            id="enabled"
            className="select"
            value={schedule.enabled ? "on" : "off"}
            onChange={(e) => setSchedule((s) => ({ ...s, enabled: e.target.value === "on" }))}
          >
            <option value="off">Disabled</option>
            <option value="on">Enabled</option>
          </select>
        </div>
        <div className="grid grid--2">
          <div className="field">
            <label htmlFor="interval">Every (hours)</label>
            <input
              id="interval"
              type="number"
              min={1}
              max={168}
              className="input"
              value={schedule.intervalHours}
              onChange={(e) => setSchedule((s) => ({ ...s, intervalHours: parseInt(e.target.value, 10) }))}
            />
          </div>
          <div className="field">
            <label htmlFor="retain">Keep last N backups</label>
            <input
              id="retain"
              type="number"
              min={1}
              max={30}
              className="input"
              value={schedule.retainCount}
              onChange={(e) => setSchedule((s) => ({ ...s, retainCount: parseInt(e.target.value, 10) }))}
            />
          </div>
        </div>
        <button className="btn btn--primary" onClick={handleScheduleSave}>
          Save schedule
        </button>
      </div>

      <div className="flex-between mb-16">
        <h3>Backup history</h3>
        <button className="btn btn--primary btn--sm" onClick={handleCreate} disabled={creating}>
          {creating ? "Backing up…" : "+ Create backup now"}
        </button>
      </div>

      {backups.length === 0 ? (
        <div className="empty-state card">
          <h3>No backups yet</h3>
          <p>Create a manual backup or enable automatic backups above.</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>File</th>
              <th>Size</th>
              <th>Type</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.id}>
                <td>{b.fileName}</td>
                <td>{formatBytes(b.sizeBytes)}</td>
                <td>{b.automatic ? "Automatic" : "Manual"}</td>
                <td>{b.status}</td>
                <td>{new Date(b.createdAt).toLocaleString()}</td>
                <td>
                  <div className="flex gap-8">
                    {b.status === "COMPLETE" && (
                      <>
                        <a className="btn btn--ghost btn--sm" href={BackupsApi.downloadUrl(id!, b.id)}>
                          Download
                        </a>
                        <button className="btn btn--secondary btn--sm" onClick={() => handleRestore(b.id)}>
                          Restore
                        </button>
                      </>
                    )}
                    <button className="btn btn--danger btn--sm" onClick={() => handleDelete(b.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
