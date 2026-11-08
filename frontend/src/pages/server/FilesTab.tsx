import { useEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { FilesApi } from "../../api/endpoints";
import { Modal } from "../../components/Modal";
import type { FileEntry, MinecraftServer } from "../../types";

const EDITABLE_EXTENSIONS = [".properties", ".txt", ".json", ".yml", ".yaml", ".conf", ".cfg", ".toml", ".log"];

function isEditable(name: string) {
  return EDITABLE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesTab() {
  const { id } = useParams<{ id: string }>();
  useOutletContext<{ server: MinecraftServer }>();

  const [currentPath, setCurrentPath] = useState(".");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    FilesApi.list(id, currentPath)
      .then((res) => setEntries(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id, currentPath]);

  const breadcrumbParts = currentPath === "." ? [] : currentPath.split("/");

  const openEntry = async (entry: FileEntry) => {
    if (entry.isDirectory) {
      setCurrentPath(entry.path);
      return;
    }
    if (!id) return;
    if (isEditable(entry.name)) {
      const res = await FilesApi.read(id, entry.path);
      setEditingFile({ path: entry.path, content: res.data.content });
    } else {
      window.open(FilesApi.downloadUrl(id, entry.path), "_blank");
    }
  };

  const handleSaveFile = async () => {
    if (!id || !editingFile) return;
    await FilesApi.write(id, editingFile.path, editingFile.content);
    setEditingFile(null);
  };

  const handleDelete = async (entry: FileEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id || !confirm(`Delete "${entry.name}"?`)) return;
    await FilesApi.remove(id, entry.path);
    load();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files?.length) return;
    for (const file of Array.from(e.target.files)) {
      await FilesApi.upload(id, currentPath, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    load();
  };

  const handleCreateFolder = async () => {
    if (!id || !newFolderName.trim()) return;
    const path = currentPath === "." ? newFolderName : `${currentPath}/${newFolderName}`;
    await FilesApi.mkdir(id, path);
    setNewFolderOpen(false);
    setNewFolderName("");
    load();
  };

  return (
    <div>
      <div className="flex-between mb-16" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="breadcrumbs">
          <span onClick={() => setCurrentPath(".")}>root</span>
          {breadcrumbParts.map((part, i) => (
            <span key={i}>
              {" / "}
              <span onClick={() => setCurrentPath(breadcrumbParts.slice(0, i + 1).join("/"))}>{part}</span>
            </span>
          ))}
        </div>
        <div className="flex gap-8">
          <button className="btn btn--secondary btn--sm" onClick={() => setNewFolderOpen(true)}>
            + Folder
          </button>
          <label className="btn btn--primary btn--sm" style={{ cursor: "pointer" }}>
            ⬆ Upload
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleUpload} />
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 8 }}>
        {loading ? (
          <p className="text-muted" style={{ padding: 16 }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-muted" style={{ padding: 16 }}>This folder is empty.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.path} className="file-row" onClick={() => openEntry(entry)}>
              <span>{entry.isDirectory ? "📁" : "📄"}</span>
              <span style={{ flex: 1 }}>{entry.name}</span>
              {!entry.isDirectory && <span className="text-muted" style={{ fontSize: 12 }}>{formatSize(entry.sizeBytes)}</span>}
              <button className="btn btn--ghost btn--sm" onClick={(e) => handleDelete(entry, e)}>
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {editingFile && (
        <Modal title={editingFile.path} onClose={() => setEditingFile(null)}>
          <textarea
            className="textarea"
            style={{ minHeight: 320 }}
            value={editingFile.content}
            onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
          />
          <button className="btn btn--primary mt-16" style={{ width: "100%" }} onClick={handleSaveFile}>
            Save changes
          </button>
        </Modal>
      )}

      {newFolderOpen && (
        <Modal title="New folder" onClose={() => setNewFolderOpen(false)}>
          <div className="field">
            <label htmlFor="folderName">Folder name</label>
            <input id="folderName" className="input" autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
          </div>
          <button className="btn btn--primary" style={{ width: "100%" }} onClick={handleCreateFolder}>
            Create folder
          </button>
        </Modal>
      )}
    </div>
  );
}
