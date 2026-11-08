import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

const FEATURES = [
  { title: "One-click servers", desc: "Spin up Vanilla, Paper, Spigot, Fabric, Forge, or Purpur in seconds." },
  { title: "Live console", desc: "Watch logs stream in real time and send commands without SSH." },
  { title: "Full file manager", desc: "Edit configs, upload worlds, and manage plugins right from your browser." },
  { title: "Automatic backups", desc: "Schedule world backups and restore any snapshot in a couple of clicks." },
];

export function LandingPage() {
  return (
    <div>
      <header className="flex-between" style={{ padding: "20px 32px" }}>
        <Logo withWordmark size={32} />
        <div className="flex gap-8">
          <Link to="/login" className="btn btn--ghost">
            Sign in
          </Link>
          <Link to="/signup" className="btn btn--primary">
            Get started
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "60px 24px 100px", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 52px)", lineHeight: 1.1, marginBottom: 20 }}>
          Your Minecraft server,
          <br />
          <span style={{ color: "var(--green)" }}>online in minutes.</span>
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto 32px" }}>
          Bitarnos gives you a full control panel for your Minecraft server — console, files, backups, plugins, and
          player management, all in one dashboard.
        </p>
        <Link to="/signup" className="btn btn--primary" style={{ fontSize: 16, padding: "14px 28px" }}>
          Create your first server →
        </Link>

        <div className="grid grid--servers mt-16" style={{ marginTop: 60, textAlign: "left" }}>
          {FEATURES.map((f) => (
            <div className="card" key={f.title}>
              <h3 style={{ marginBottom: 8 }}>{f.title}</h3>
              <p className="text-muted" style={{ fontSize: 14 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
