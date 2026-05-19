import { app, crashReporter, Menu, session } from "electron";
import path from "path";
import { mkdirSync } from "fs";
import { logger } from "./core/logger";
import { initStore, getPref } from "./core/store";
import { applyNativeTheme } from "./services/theme";
import { applyLaunchAtLogin } from "./services/launch-at-login";
import { checkForUpdates } from "./services/updater";
import { registerGmailIpc } from "./ipc/gmail";
import { registerPrefsIpc } from "./ipc/prefs";
import { registerSystemIpc } from "./ipc/system";
import {
    createGmailWindow,
    showGmailWindow,
    openFindbar,
    reloadGmail,
    zoomIn,
    zoomOut,
    zoomReset,
} from "./windows/gmail";
import { openCompose } from "./windows/compose";
import { initPrefsWindow, togglePrefs, getPrefsWindow } from "./windows/prefs";
import { buildMenu } from "./services/menu";
import { IPC_UPDATE_READY } from "./core/constants";

if (process.env.SENTRY_DSN) {
    crashReporter.start({ submitURL: process.env.SENTRY_DSN });
}

process.on("unhandledRejection", (reason) => {
    logger.error("[main] unhandledRejection:", reason);
});

app.on("certificate-error", (_event, _wc, url, error, _cert, callback) => {
    logger.error("[security] certificate-error:", error, url);
    callback(false);
});

if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

let isQuitting = false;
const markQuitting = (): void => {
    isQuitting = true;
};

app.on("before-quit", () => {
    isQuitting = true;
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", (_event, argv) => {
    showGmailWindow();
    // On Windows/Linux, mailto: URLs are passed as CLI args on second-instance launch.
    const mailto = argv.find((a) => a.startsWith("mailto:"));
    if (mailto) openCompose(mailto);
});

// On macOS, mailto: URLs arrive via open-url rather than argv.
app.on("open-url", (event, url) => {
    event.preventDefault();
    if (url.startsWith("mailto:")) {
        if (app.isReady()) {
            openCompose(url);
        } else {
            app.once("ready", () => {
                openCompose(url);
            });
        }
    }
});

app.on("activate", () => {
    showGmailWindow();
});

void app.whenReady().then(async () => {
    const userData = app.getPath("userData");
    mkdirSync(userData, { recursive: true });
    const windowStatePath = path.join(userData, "window-state.json");

    await initStore();

    const ua = session.defaultSession
        .getUserAgent()
        .replace(/Electron\/[\d.]+ ?/, "")
        .replace(/owlpost\/[\d.]+ ?/, "");
    session.defaultSession.setUserAgent(ua);
    app.setAsDefaultProtocolClient("mailto");

    applyNativeTheme();
    applyLaunchAtLogin(getPref("launchAtStartup"));

    registerGmailIpc();
    registerPrefsIpc();
    registerSystemIpc(markQuitting);

    createGmailWindow(windowStatePath, () => isQuitting);
    initPrefsWindow(() => isQuitting);

    const menu = buildMenu({
        onPreferences: () => {
            togglePrefs(() => isQuitting);
        },
        onCompose: openCompose,
        onReload: reloadGmail,
        onFind: openFindbar,
        onZoomIn: zoomIn,
        onZoomOut: zoomOut,
        onZoomReset: zoomReset,
    });
    Menu.setApplicationMenu(menu);

    setTimeout(() => {
        checkForUpdates((version) => {
            const pw = getPrefsWindow();
            if (pw && !pw.isDestroyed()) {
                pw.webContents.send(IPC_UPDATE_READY, version);
            }
        });
    }, 20_000);
});
