# Owlpost

A minimal macOS app that wraps Gmail in a native window, built with Electron 42 and React 19. Owlpost doesn't reimplement Gmail — it embeds the real Gmail UI inside an Electron BrowserWindow and layers on the OS integrations a browser tab can't provide: dock badge with live unread count, system notifications, `mailto:` link handling, zoom control, and launch at login. Because Electron bundles Chromium rather than using the system WebView, Gmail runs exactly as it does in Chrome with full compatibility.

---

## Stack

| Layer       | Technology                      |
| ----------- | ------------------------------- |
| Shell       | Electron 42                     |
| Renderer    | React 19 + Vite 8 + Tailwind v4 |
| Language    | TypeScript (strict)             |
| Preferences | electron-store 11               |
| Updates     | electron-updater                |
| Logging     | electron-log 5                  |

---

## Project layout

<details>
<summary>Show directory tree</summary>

```
owlpost/
├── electron/                         Main-process source (compiled → dist-electron/)
│   ├── main.ts                       Entry point — thin orchestrator
│   │
│   ├── core/                         Foundational modules imported by everything
│   │   ├── constants.ts              All IPC channel names, Gmail event names, and URL constants
│   │   ├── logger.ts                 electron-log wrapper (file + conditional console output)
│   │   └── store.ts                  electron-store wrapper — typed preference persistence
│   │
│   ├── windows/                      BrowserWindow factories and lifecycle management
│   │   ├── shared.ts                 PRELOAD_GMAIL path and safeOpenExternal
│   │   ├── gmail.ts                  Main Gmail window — window-state persistence, zoom, script injection
│   │   ├── compose.ts                Compose window (single-instance, mailto: support)
│   │   └── prefs.ts                  Preferences window (eager init, hidden until toggled)
│   │
│   ├── ipc/                          IPC handler registration
│   │   ├── gmail.ts                  Events forwarded from Gmail injected scripts
│   │   ├── prefs.ts                  Read/write user preferences
│   │   └── system.ts                 App reset, relaunch, and update handlers
│   │
│   ├── preload/                      Preload scripts (renderer context, no Node access)
│   │   ├── gmail.ts                  Exposes window.__owlpost__ bridge for injected scripts
│   │   └── prefs.ts                  Exposes window.owlpost API for the React renderer
│   │
│   └── services/                     OS integrations and single-responsibility feature modules
│       ├── badge.ts                  macOS dock badge management
│       ├── launch-at-login.ts        macOS login-item (launch at startup) management
│       ├── menu.ts                   Native application menu and keyboard shortcuts
│       ├── theme.ts                  Applies stored theme preference to nativeTheme
│       └── updater.ts                Background update check and download via electron-updater
│
├── injected/                         Scripts injected into Gmail's webContents at runtime
│   ├── global.d.ts                   Type declarations for window.__owlpost__
│   ├── title-watcher.ts              Reads unread count and account email from the page title
│   └── notifications.ts              Intercepts Gmail's Notification constructor
│
├── src/                              Renderer source (compiled → dist/ by Vite)
│   ├── main.tsx                      React entry point
│   ├── App.tsx                       Root component — preferences tab shell
│   ├── ErrorBoundary.tsx             Catches render errors and shows a recovery UI
│   ├── usePreferences.ts             Hook — loads prefs from main process, exposes typed setters
│   ├── preload.d.ts                  Global types for window.owlpost and window.__owlpost__
│   └── components/
│       ├── GeneralTab.tsx            Notifications, dock badge, launch-at-login settings
│       ├── AppearanceTab.tsx         Theme and zoom settings
│       ├── AdvancedTab.tsx           Crash reporting, app reset, relaunch
│       ├── UpdateChecker.tsx         Check for updates / install / restart button
│       └── NotificationsSetupDialog.tsx  Step-by-step guide to enabling Gmail notifications
│
├── build-resources/                  Icons and code-signing entitlements
├── index.html                        Vite HTML entry for the renderer
├── package.json
├── electron-builder.yml              Distribution config (DMG + ZIP, GitHub releases)
├── tsconfig.json                     Renderer TypeScript config
├── tsconfig.node.json                Main-process TypeScript config (CommonJS output)
├── tsconfig.injected.json            Injected-script TypeScript config (no module system)
└── tsconfig.preload.json             Preload TypeScript config (type-check only, noEmit)
```

</details>

---

## Architecture notes

### Security model

All three windows (`gmail`, `compose`, `prefs`) use `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.

- **Gmail window** — exposes `window.__owlpost__` via `preload/gmail.ts`. A minimal bridge that lets injected scripts forward events to the main process without any Node access.
- **Preferences window** — exposes `window.owlpost` via `preload/prefs.ts`. A typed API for the React renderer covering preferences, updates, and app lifecycle.
- **Preloads are bundled with esbuild** (`--bundle --external:electron`) so imports resolve at build time rather than at runtime inside the sandbox, where only `require("electron")` and Node built-ins are permitted.
- `safeOpenExternal` in `windows/shared.ts` whitelists only `https:`, `http:`, and `mailto:` before calling `shell.openExternal` — all other protocols are silently dropped.
- `isValidPrefValue` in `ipc/prefs.ts` type-checks and range-checks every preference write to guard against a compromised renderer sending arbitrary values.

### IPC flow

```
Injected script  →  window.__owlpost__.emit(name, payload)
                 →  ipcRenderer.send("owlpost:from-gmail", { name, payload })
                 →  ipcMain.on  (ipc/gmail.ts)  →  badge / title / notification
```

All channel names live in `core/constants.ts` — no raw strings appear in handlers.

### Module rules

- `main.ts` is the only file at the root of `electron/` — everything else lives in a subdirectory.
- `core/constants.ts` and `core/logger.ts` may be imported by anything; nothing imports from `main.ts`.
- Window references are exposed via getter functions (`getGmailWindow()`, `getPrefsWindow()`) — no exported mutable variables.
- No side effects at import time — every module exports a setup or factory function.
- `logger` replaces every `console.*` call in the main process.

### electron-store / ESM

electron-store v11 is ESM-only. Because the main process compiles to CommonJS (`tsconfig.node.json`), the store is loaded via `await import("electron-store")` inside the `app.whenReady()` async handler. `initStore()` must be awaited before any `getPref` or `setPref` call.

### Injected scripts

Scripts in `injected/` are compiled with `module: "none"` (no module system) and executed inside Gmail's webContents via `webContents.executeJavaScript`. They use `window.__owlpost__.onReady()` instead of `DOMContentLoaded` because injection happens after `did-finish-load`, which fires after the DOM is already ready.

---

## Development

```bash
npm install
npm run dev          # starts Vite dev server + Electron together
```

## Build & release

```bash
npm run build        # compiles renderer, main process, preloads, and injected scripts
npm run dist         # build + electron-builder (produces release/)
open release/mac-arm64/Owlpost.app   # or release/mac/ on Intel
```

## Lint & format

```bash
npm run typecheck    # tsc across all four tsconfigs
npm run lint         # ESLint (strict TypeScript rules)
npm run format       # Prettier
npm run check        # lint + format check together
```

---

## Logging

In development, debug-level output goes to the console. In production, info-level output is written to the platform log directory (`app.getPath("logs")`); console output is suppressed. Import `logger` from `electron/core/logger.ts` — do not use `console.log` in main-process code.
