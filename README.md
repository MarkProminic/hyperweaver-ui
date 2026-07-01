# Hyperweaver UI

![Hyperweaver UI logo](public/images/logo192.png)

The web interface for **Hyperweaver** — a dual-mode React + Vite single-page app for managing hypervisor hosts. It is served either directly by a single host agent (**Direct** mode) or by the Hyperweaver Server, which aggregates many agents (**Aggregated** mode). The same build talks to whichever backend serves it.

## Tech stack

- **React 19** + **React Router 7**
- **Vite** (build + dev server)
- **Bootstrap 5.3** + **react-bootstrap** — themed via CSS variables (orange `#ff6600` brand, square corners)
- **Highcharts** (metrics), **@xyflow/react** (network topology), **xterm / react-xtermjs** (shells), **react-vnc** (consoles)
- **axios** against a relative `/api/*` contract

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server proxies `/api` (and console WebSockets) to the backend set in `config.yaml`:

```yaml
server:
  port: 3000
  api_target: http://localhost:3443
```

`config.yaml` only affects local development — the built app talks to whatever origin serves it at runtime.

## Building

```bash
npm run build
```

Output goes to `dist/`. The app is served under the `/ui/` base path.

## Distribution

CI (release-please → build) publishes each release as a versioned GitHub Release asset — `hyperweaver-ui-<version>.tar.gz`, the contents of `dist/`. The Hyperweaver Server and the host agents consume that pinned artifact: Node serves it statically; the Go agent embeds it via `embed.FS`.

## The `/api` contract

The app is host-agnostic — it makes same-origin, credentialed requests to a relative `/api/*` surface (`/api/auth/*`, `/api/servers`, `/api/zapi/:protocol/:hostname/:port/*`, plus console / terminal / VNC WebSocket upgrades). Any host that serves the build must implement that surface.

## Scripts

| Script                              | Description                                         |
| ----------------------------------- | --------------------------------------------------- |
| `npm run dev`                       | Start the Vite dev server (localhost:3000)          |
| `npm run client`                    | Dev server bound to all interfaces (LAN access)     |
| `npm run build`                     | Production build to `dist/`                         |
| `npm run preview`                   | Preview the production build locally                |
| `npm run lint` / `npm run lint:fix` | ESLint (strict React + hooks + a11y + import rules) |

## License

[GPL-3.0](LICENSE.md)
