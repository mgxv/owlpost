import { app, ipcMain, session } from "electron";
import {
    IPC_UPDATE_CHECK,
    IPC_UPDATE_INSTALL,
    IPC_UPDATE_PENDING,
    IPC_APP_RESET,
    IPC_APP_RELAUNCH,
} from "../core/constants";
import { getPendingVersion, installUpdate } from "../services/updater";
import { DEFAULTS, setPref, type Prefs } from "../core/store";
import { logger } from "../core/logger";

export function registerSystemIpc(markQuitting: () => void): void {
    ipcMain.handle(IPC_UPDATE_CHECK, async () => {
        const { autoUpdater } = await import("electron-updater");
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
