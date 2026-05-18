import { ipcMain, Notification } from "electron";
import {
    IPC_PREFS_GET,
    IPC_PREFS_SET,
    IPC_PREFS_CHANGED,
    IPC_LAUNCH_AT_LOGIN_GET,
    IPC_CRASH_REPORTING_AVAIL,
    IPC_NOTIF_PERMISSION_GET,
} from "../core/constants";
import { getPrefs, setPref, type Prefs } from "../core/store";
import { applyBadge } from "../services/badge";
import { applyLaunchAtLogin, isLaunchAtLoginEnabled } from "../services/launch-at-login";
import { applyNativeTheme } from "../services/theme";
import { zoomReset } from "../windows/gmail";
import { getPrefsWindow } from "../windows/prefs";

// Guards against a compromised renderer sending arbitrary pref values.
function isValidPrefValue(key: keyof Prefs, value: unknown): boolean {
    switch (key) {
        case "systemTheme":
            return value === "light" || value === "dark" || value === "system";
        case "defaultZoom":
            return typeof value === "number" && Number.isFinite(value) && value >= 50 && value <= 200;
        case "showDockBadge":
        case "launchAtStartup":
        case "crashReporting":
        case "notificationsEnabled":
            return typeof value === "boolean";
    }
}

export function registerPrefsIpc(): void {
    ipcMain.handle(IPC_PREFS_GET, () => getPrefs());
    ipcMain.handle(IPC_PREFS_SET, (_event, msg: unknown) => {
        if (typeof msg !== "object" || msg === null) return;
        const { key, value } = msg as Record<string, unknown>;
        if (typeof key !== "string" || !(key in getPrefs())) return;
        if (!isValidPrefValue(key as keyof Prefs, value)) return;

        setPref(key as keyof Prefs, value as Prefs[keyof Prefs]);

        if (key === "systemTheme") applyNativeTheme();
        if (key === "defaultZoom") zoomReset();
        if (key === "showDockBadge") applyBadge(value as boolean);
        if (key === "launchAtStartup") applyLaunchAtLogin(value as boolean);

        getPrefsWindow()?.webContents.send(IPC_PREFS_CHANGED, { key, value });
    });

    ipcMain.handle(IPC_LAUNCH_AT_LOGIN_GET, () => isLaunchAtLoginEnabled());

    ipcMain.handle(IPC_CRASH_REPORTING_AVAIL, () => Boolean(process.env.SENTRY_DSN));

    ipcMain.handle(IPC_NOTIF_PERMISSION_GET, () => Notification.isSupported());
}
