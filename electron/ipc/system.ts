import { app, ipcMain, session } from "electron";
import {
    IPC_UPDATE_CHECK,
    IPC_UPDATE_DOWNLOADING,
    IPC_UPDATE_INSTALL,
    IPC_UPDATE_PENDING,
    IPC_APP_RESET,
    IPC_APP_RELAUNCH,
} from "../core/constants";
import { getPendingVersion, manualCheck, installUpdate } from "../services/updater";
import { getPrefsWindow } from "../windows/prefs";
import { DEFAULTS, setPref, type Prefs } from "../core/store";

export function registerSystemIpc(markQuitting: () => void): void {
    ipcMain.handle(IPC_UPDATE_CHECK, async () => {
        await manualCheck((version) => {
            const pw = getPrefsWindow();
            if (pw && !pw.isDestroyed()) pw.webContents.send(IPC_UPDATE_DOWNLOADING, version);
        });
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
