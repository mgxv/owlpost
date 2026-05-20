<div align="center">
  <img src="./build-resources/icon.png"
       width="150"
       height="150">

# Owlpost

</div>

A minimal macOS app that wraps Gmail in a native window, built with Electron 42 and React 19. Owlpost doesn't reimplement Gmail — it embeds the real Gmail UI inside an Electron BrowserWindow and layers on the OS integrations a browser tab can't provide: dock badge with live unread count, system notifications, mailto: link handling, zoom control, and launch at login. Because Electron bundles Chromium rather than using the system WebView, Gmail runs exactly as it does in Chrome with full compatibility.

## Install

Download the `.dmg` for your Mac from the [latest release](https://github.com/mgxv/owlpost/releases/latest):

- **Apple Silicon (M1 and later)** — `Owlpost_*_aarch64.dmg`
- **Intel** — `Owlpost_*_x64.dmg`

Drag **Owlpost** into `/Applications`.

On first launch macOS will block the app because it isn't notarized with an Apple Developer account:

1. Double-click **Owlpost** — macOS shows an alert saying it cannot be opened. Click **Done**.
2. Open **System Settings → Privacy & Security** and scroll to the Security section.
3. Click **Open Anyway** next to the Owlpost message.
4. Click **Open Anyway** in the confirmation dialog.
5. Enter your password or confirm with Touch ID if prompted.

Alternatively, strip the quarantine flag directly from Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/Owlpost.app
```

On first launch macOS may also show a keychain prompt:

> **"Owlpost" wants access to key "Owlpost Safe Storage" in your keychain.**

Click **Always Allow**. This is Chromium (bundled inside Electron) storing an encryption key it uses to protect locally saved cookies and session data — it is not the app reading your passwords or other keychain items. Choosing **Allow** instead of **Always Allow** will cause the prompt to reappear on every launch.

> **Note:** Because Owlpost is not code-signed with an Apple Developer certificate, the keychain prompt will reappear after each update. This is a macOS security restriction — "Always Allow" is tied to the binary hash, which changes with every new version.

> macOS 13 or later required.

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
│   │   ├── constants.ts              All IPC channel names and URL constants
│   │   ├── env.ts                    isDev flag — true when app.isPackaged is false
│   │   ├── logger.ts                 electron-log wrapper (file + conditional console output)
│   │   └── store.ts                  electron-store wrapper — typed preference persistence
│   │
│   ├── windows/                      BrowserWindow factories and lifecycle management
│   │   ├── shared.ts                 PRELOAD_GMAIL path and safeOpenExternal
│   │   ├── gmail.ts                  Gmail window — two WebContentsViews, zoom, script injection, findbar
│   │   ├── compose.ts                Compose window (single-instance, mailto: support)
│   │   └── prefs.ts                  Preferences window (eager init, hidden until toggled)
│   │
│   ├── ipc/                          IPC handler registration
│   │   ├── gmail.ts                  Titlebar navigation, findbar, and Gmail injected-script events
│   │   ├── prefs.ts                  Read/write user preferences
│   │   └── system.ts                 App reset, relaunch, and update handlers
│   │
│   ├── preload/                      Preload scripts (renderer context, no Node access)
│   │   ├── gmail.ts                  Exposes window.__owlpost__ bridge for injected scripts
│   │   ├── titlebar.ts               Exposes window.tb API for the custom titlebar
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
│   ├── title-watcher.ts              Reads unread count from the page title
│   └── notifications.ts              Intercepts Gmail's Notification constructor
│
├── src/                              Renderer source (compiled → dist/ by Vite)
│   ├── main.tsx                      React entry point
│   ├── titlebar.ts                   Vanilla TS entry for the custom Gmail titlebar
│   ├── env.ts                        isDev flag — import.meta.env.DEV
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
├── index.html                        Vite HTML entry for the preferences renderer
├── titlebar.html                     Vite HTML entry for the custom Gmail titlebar
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

<details>
<summary>Show architecture notes</summary>

### Gmail window layout

The Gmail `BrowserWindow` is a frameless shell with no web content of its own. It hosts two `WebContentsView` children:

- **`_gmailView`** — loads Gmail below the titlebar. Runs with the Gmail preload, background throttling disabled.
- **`_titlebarView`** — loads `titlebar.html` at the top of the window (macOS only). Runs with the titlebar preload.

On macOS, `titleBarStyle: "hiddenInset"` insets the traffic-light buttons into the titlebar view. On Windows/Linux, the OS-native titlebar is used and `_titlebarView` is not created.

The window is created with `show: false` and revealed only after the titlebar view fires `did-finish-load`, so the window never appears partially rendered.

### Custom titlebar

`titlebar.html` is a second Vite MPA entry compiled alongside `index.html`. Its CSS lives in an inline `<style>` block processed by `@tailwindcss/vite`. Dark mode uses `@custom-variant dark (@media (prefers-color-scheme: dark))` — Electron maps `nativeTheme.themeSource` to the system `prefers-color-scheme` media query, so the titlebar correctly follows the user's theme preference without any JS.

Icons (back, forward, find, preferences) are React Heroicons mounted into empty button elements via `createRoot` — no JSX, no separate React tree.

### Find-in-page

`electron-findbar` creates a child `BrowserWindow` positioned over the Gmail view. Configuration (theme, position, background color) is set once at module init via `Findbar.setDefaultTheme`, `Findbar.setDefaultBoundsHandler`, and `Findbar.setDefaultWindowHandler`. `Cmd+F` triggers it via the app menu accelerator; the magnifying glass button in the custom titlebar sends `tb:open-find` via IPC.

### Security model

All windows use `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.

- **Gmail window** — exposes `window.__owlpost__` via `preload/gmail.ts`. A minimal bridge that lets injected scripts forward events to the main process without any Node access.
- **Titlebar view** — exposes `window.tb` via `preload/titlebar.ts`. Provides back/forward navigation, find-in-page, and preferences open over IPC.
- **Preferences window** — exposes `window.owlpost` via `preload/prefs.ts`. A typed API for the React renderer covering preferences, updates, and app lifecycle.
- **Preloads are bundled with esbuild** (`--bundle --external:electron`) so imports resolve at build time rather than at runtime inside the sandbox.
- `isValidPrefValue` in `ipc/prefs.ts` type-checks and range-checks every preference write to guard against a compromised renderer sending arbitrary values.

### IPC flow

```
Injected script  →  window.__owlpost__.emit(name, payload)
                 →  ipcRenderer.send("owlpost:from-gmail", { name, payload })
                 →  ipcMain.on  (ipc/gmail.ts)  →  badge / notification

Titlebar button  →  window.tb.goBack() / goForward() / openFind() / openPrefs()
                 →  ipcRenderer.send("tb:go-back" | "tb:go-forward" | "tb:open-find" | "tb:open-prefs")
                 →  ipcMain.on  (ipc/gmail.ts)  →  gmail webcontents / findbar / prefs window

Main process     →  _titlebarView.webContents.send("tb:update", { canGoBack, canGoForward, title })
                 →  window.tb.onUpdate(fn)  (titlebar renderer)
```

All preference channel names live in `core/constants.ts` — no raw strings appear in handlers. Titlebar IPC channels use the `tb:` prefix and are defined inline as they are titlebar-specific.

### Module rules

- `main.ts` is the only file at the root of `electron/` — everything else lives in a subdirectory.
- `core/constants.ts` and `core/logger.ts` may be imported by anything; nothing imports from `main.ts`.
- Window references are exposed via getter functions (`getGmailWindow()`, `getPrefsWindow()`) — no exported mutable variables.
- `logger` replaces every `console.*` call in the main process.

### electron-store / ESM

electron-store v11 is ESM-only. Because the main process compiles to CommonJS (`tsconfig.node.json`), the store is loaded via `await import("electron-store")` inside the `app.whenReady()` async handler. `initStore()` must be awaited before any `getPref` or `setPref` call.

### Injected scripts

Scripts in `injected/` are compiled with `module: "none"` (no module system) and executed inside Gmail's webContents via `webContents.executeJavaScript`. They use `window.__owlpost__.onReady()` instead of `DOMContentLoaded` because injection happens after `did-finish-load`, which fires after the DOM is already ready.

</details>

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

## Troubleshooting

Production logs are written to:

```
~/Library/Logs/Owlpost/main.log
```

Stream them in real time while reproducing an issue:

```bash
tail -f ~/Library/Logs/Owlpost/main.log
```

---

## Logging

In development, debug-level output goes to the console. In production, info-level output is written to `~/Library/Logs/Owlpost/main.log`; console output is suppressed. Import `logger` from `electron/core/logger.ts` — do not use `console.log` in main-process code.
