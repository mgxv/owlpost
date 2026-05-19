import { app, ipcMain, session } from "electron";
import type { UpdateInfo } from "electron-updater";
import {
    IPC_UPDATE_CHECK,
    IPC_UPDATE_DOWNLOADING,
    IPC_UPDATE_INSTALL,
    IPC_UPDATE_PENDING,
    IPC_APP_RESET,
    IPC_APP_RELAUNCH,
} from "../core/constants";
import { getPendingVersion, installUpdate } from "../services/updater";
import { getPrefsWindow } from "../windows/prefs";
import { DEFAULTS, setPref, type Prefs } from "../core/store";
import { isDev, logger } from "../core/logger";

export function registerSystemIpc(markQuitting: () => void): void {
    ipcMain.handle(IPC_UPDATE_CHECK, async () => {
        if (isDev) return;
        const { autoUpdater } = await import("electron-updater");
        autoUpdater.once("update-available", (info: UpdateInfo) => {
            const pw = getPrefsWindow();
            if (pw && !pw.isDestroyed()) pw.webContents.send(IPC_UPDATE_DOWNLOADING, info.version);
        });
        try {
            await autoUpdater.checkForUpdates();
        } catch (e) {
            logger.error("[updater] manual check:", e);
        }
    });

    ipcMain.handle(IPC_UPDATE_INSTALL, () => {
        installUpdate();
    });

    ipcMain.handle(IPC_UPDATE_PENDING, () => getPendingVersion());

    ipcMain.handle(IPC_APP_RESET, async () => {
        await session.defaultSession.clearStorageData();
        await session.defaultSession.clearCache();
        (Object.keys(DEFAULTS) as (keyof Prefs)[]).forEach((k) => {
            setPref(k, DEFAULTS[k] as never);
        });
        markQuitting();
        app.relaunch();
        app.exit(0);
    });

    ipcMain.handle(IPC_APP_RELAUNCH, () => {
        markQuitting();
        app.relaunch();
        app.exit(0);
    });
}
