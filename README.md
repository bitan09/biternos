# Bitarnos

Bitarnos is a full-stack Minecraft server hosting platform: create isolated,
Docker-based Minecraft servers, manage them from a live dashboard, and give
your players a place to see what's running — all with an original dark
green/blue UI.

This repo is a complete, runnable scaffold covering every layer of the
system: Postgres schema, Express/TypeScript API, WebSocket console, Docker
orchestration, and a React/TypeScript frontend.

## Architecture

```
bitarnos/
├── docker-compose.yml       # postgres + api + web, one command to run everything
├── backend/                 # Express + TypeScript API
│   ├── prisma/schema.prisma # Postgres schema (users, servers, backups, players…)
│   └── src/
│       ├── routes/          # REST endpoints, one file per resource
│       ├── services/        # business logic (docker, backups, files, mail…)
│       ├── websocket/       # live console + status + notifications over WS
│       └── middleware/      # auth guard, error handler
└── frontend/                 # React + TypeScript (Vite)
    └── src/
        ├── pages/            # route-level pages, incl. pages/server/* tabs
        ├── components/       # shared UI (layout, cards, modals, toasts)
        ├── context/          # AuthContext, SocketContext
        └── styles/           # design tokens + component CSS
```

### How server isolation works

Each Bitarnos "server" is a real, isolated Docker container running the
[`itzg/minecraft-server`](https://github.com/itzg/docker-minecraft-server)
image, which supports every software flavor this app advertises (Vanilla,
Paper, Spigot, Fabric, Forge, Purpur) via a single `TYPE` env var and ships
RCON out of the box. The API talks to the host's Docker daemon over the
mounted `/var/run/docker.sock` using `dockerode` to create, start, stop,
restart, and kill containers, stream logs for the live console, and read
CPU/RAM stats.

Each container gets:
- Its own bind-mounted data directory (`/mc-data/<container-name>`) — this is
  what the file manager, backups, and properties editor all operate on.
- A dedicated host port (auto-allocated from a configurable range) and RCON
  port, so multiple servers can run side by side.
- Hard CPU and memory limits (`NanoCpus` / `Memory`) set from the plan the
  user chose at creation time.
- Membership in an isolated `bitarnos_mcnet` Docker network, separate from
  the app's own network.

### Real-time layer

A single WebSocket endpoint (`/ws`, authenticated via a short-lived JWT
passed as a query param) handles:
- **Live console** — subscribing attaches to the container's log stream via
  `dockerode`; commands are sent through `rcon-cli` inside the container.
- **Status updates** — broadcast whenever a server transitions between
  OFFLINE / STARTING / ONLINE / STOPPING / CRASHED.
- **Resource stats** — polled every 3s per subscribed server and pushed to
  the client for the CPU/RAM meters.
- **Notifications** — pushed the moment they're created (backup finished,
  server started, etc.) and also persisted so the notification bell/history
  page has something to show on reload.

## Getting started

1. Copy the env template and fill in real secrets:
   ```bash
   cp .env.example .env
   # generate secrets with: openssl rand -hex 32
   ```
2. Build and start everything:
   ```bash
   docker compose up --build
   ```
3. Open the frontend at `http://localhost:5173` and the API at
   `http://localhost:4000`.

The API container runs `prisma db push` on boot to sync the schema — no
manual migration step needed for a first run.

### Running the backend/frontend outside Docker (for development)

```bash
# backend
cd backend
npm install
npx prisma generate
npm run dev          # requires a reachable Postgres — see DATABASE_URL

# frontend
cd frontend
npm install
npm run dev
```

Note: the Docker-orchestration features (`docker.service.ts`) require access
to a Docker daemon socket, so those specific endpoints won't work unless the
backend can reach `/var/run/docker.sock` — this is automatic inside
`docker compose` but needs `-v /var/run/docker.sock:/var/run/docker.sock` if
you run the backend container manually outside compose.

### Moving to migrations

For local iteration this scaffold uses `prisma db push`. Once the schema
stabilizes, switch to real migrations:
```bash
cd backend
npx prisma migrate dev --name init
```
Then change the Dockerfile's `CMD` from `prisma db push` to
`prisma migrate deploy` and commit the generated `prisma/migrations/` folder.

## Feature coverage

Implemented end-to-end (API + DB + UI):
- Auth: signup, login, JWT access + rotating refresh-token cookie, forgot/reset
  password (email via SMTP if configured, logged to console otherwise), `/me`.
- Server CRUD + lifecycle: create, edit, delete, start, stop, restart, kill.
- Live console over WebSocket with command input.
- Real-time status (OFFLINE/STARTING/ONLINE/STOPPING/CRASHED) pushed to all
  of a user's open tabs.
- File manager: browse, open/edit text files, upload, download, delete,
  rename, create folders — path-traversal-safe on the backend.
- World backup & restore: zip-based backups, restore, delete, download.
- Scheduled automatic backups with retention pruning (checked every minute).
- server.properties editor with a friendly form for common keys plus raw
  key/value editing for everything else.
- Plugin/mod installer: install by direct `.jar` URL into `plugins/` or
  `mods/` depending on server software, list/remove installed files.
- Version/software selector: Vanilla, Paper, Spigot, Fabric, Forge, Purpur.
- Resource dashboard: live CPU/RAM meters on the console tab.
- Player management: whitelist, operators, banned players — mirrored to the
  live server via RCON when online, persisted either way.
- Real-time notifications: toast stack + bell dropdown + history page.
- Admin panel: manage users (promote/demote, suspend, delete, adjust limits),
  view/delete any server, platform + Docker host resource overview.
- REST API covering every action above, all under `/api`.
- Docker Compose deployment for the whole stack.

Scaffolded but intentionally minimal — worth hardening before production:
- **Player count** in the resource dashboard is wired up as a field end-to-end
  but isn't yet parsed from RCON `list` output; `getContainerStats` returns
  CPU/RAM only. Add an RCON `list` call on the stats interval to populate it.
- **"Fully loaded" detection**: `startServer` flips status to ONLINE right
  after the container reports `running`, not after Minecraft has actually
  finished loading the world. For a more accurate STARTING→ONLINE transition,
  parse the console stream for the itzg image's "Done" log line before
  flipping status.
- **Rate limiting** is only applied to `/api/auth`; consider extending it to
  file upload and console-command endpoints for a public deployment.
- **Storage quotas** aren't enforced (only server count and RAM are). Add a
  periodic `du`-style check against each user's `dataPath` if you need disk
  caps.
- Password-reset emails fall back to a console log when SMTP isn't
  configured — fine for local dev, but you'll want real SMTP creds in
  production.

## Branding

"Bitarnos" and its pixel-cube "B" mark (see `frontend/src/components/Logo.tsx`
and `frontend/public/favicon.svg`) are original assets created for this
project — no Aternos logos, layouts, or copy were used as source material.
The color system (near-black surfaces, green "online" accent, blue "info"
accent) and the isometric-cube motif used for the logo and loading spinner
are this project's own visual language.
