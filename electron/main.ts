import { app, Menu, session } from "electron";
import path from "path";
import { mkdirSync } from "fs";
import { logger } from "./core/logger";
import { initStore, getPref } from "./core/store";
import { applyNativeTheme } from "./services/theme";
import { applyLaunchAtLogin } from "./services/launch-at-login";
import { startCrashReporter } from "./services/crash-reporting";
import { checkForUpdates } from "./services/updater";
import { registerGmailIpc } from "./ipc/gmail";
import { registerPrefsIpc } from "./ipc/prefs";
import { registerSystemIpc } from "./ipc/system";
import { registerLogIpc } from "./ipc/log";
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
import { setupPrefs, togglePrefs, getPrefsWindow } from "./windows/prefs";
import { buildMenu } from "./services/menu";
import { IPC_UPDATE_DOWNLOADING, IPC_UPDATE_READY } from "./core/constants";

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

app.on("before-quit", markQuitting);

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

    if (getPref("crashReporting")) startCrashReporter();

    const ua = session.defaultSession
        .getUserAgent()
        .replace(/\s*(Electron|owlpost)\/[\d.]+/g, "")
        .trim();
    session.defaultSession.setUserAgent(ua);
    app.setAsDefaultProtocolClient("mailto");

    applyNativeTheme();
    applyLaunchAtLogin(getPref("launchAtStartup"));

    registerGmailIpc();
    registerPrefsIpc();
    registerSystemIpc(markQuitting);
    registerLogIpc();

    setupPrefs(() => isQuitting);
    createGmailWindow(windowStatePath, () => isQuitting);

    const menu = buildMenu({
        onPreferences: () => {
            togglePrefs();
        },
        onCompose: openCompose,
        onReload: reloadGmail,
        onFind: openFindbar,
        onZoomIn: zoomIn,
        onZoomOut: zoomOut,
        onZoomReset: zoomReset,
    });
    Menu.setApplicationMenu(menu);

    const sendToPrefs = (channel: string, ...args: unknown[]): void => {
        const pw = getPrefsWindow();
        if (pw && !pw.isDestroyed()) pw.webContents.send(channel, ...args);
    };

    setTimeout(() => {
        checkForUpdates(
            (version) => {
                sendToPrefs(IPC_UPDATE_READY, version);
            },
            (version) => {
                sendToPrefs(IPC_UPDATE_DOWNLOADING, version);
            },
        );
    }, 20_000);
});
