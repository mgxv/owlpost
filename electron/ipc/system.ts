import { app, ipcMain, session } from "electron";
import {
    IPC_UPDATE_CHECK,
    IPC_UPDATE_DOWNLOADING,
    IPC_UPDATE_INSTALL,
    IPC_UPDATE_PENDING,
    IPC_UPDATE_READY,
    IPC_APP_RESET,
    IPC_APP_RELAUNCH,
    IPC_RESET_WINDOW_STATES,
} from "../core/constants";
import { getPendingVersion, manualCheck, installUpdate } from "../services/updater";
import { getPrefsWindow } from "../windows/prefs";
import { DEFAULTS, setPref, type Prefs } from "../core/store";
import { resetWindowState } from "../windows/gmail";
import { resetComposeState } from "../windows/compose";

export function registerSystemIpc(markQuitting: () => void): void {
    ipcMain.handle(IPC_UPDATE_CHECK, async () => {
        await manualCheck(
            (version) => {
                const pw = getPrefsWindow();
                if (pw && !pw.isDestroyed()) pw.webContents.send(IPC_UPDATE_DOWNLOADING, version);
            },
            (version) => {
                const pw = getPrefsWindow();
                if (pw && !pw.isDestroyed()) pw.webContents.send(IPC_UPDATE_READY, version);
            },
        );
    });

    ipcMain.handle(IPC_UPDATE_INSTALL, () => {
        markQuitting();
        installUpdate();
    });

    ipcMain.handle(IPC_UPDATE_PENDING, () => getPendingVersion());

    ipcMain.handle(IPC_APP_RESET, async () => {
        await session.defaultSession.clearStorageData();
        await session.defaultSession.clearCache();
        await session.fromPartition("persist:prefs").clearStorageData();
        await session.fromPartition("persist:prefs").clearCache();
        (Object.keys(DEFAULTS) as (keyof Prefs)[]).forEach((k) => {
            setPref(k, DEFAULTS[k] as never);
        });
        markQuitting();
        app.relaunch();
        app.quit();
    });

    ipcMain.handle(IPC_APP_RELAUNCH, () => {
        markQuitting();
        app.relaunch();
        app.quit();
    });

    ipcMain.handle(IPC_RESET_WINDOW_STATES, () => {
        resetWindowState();
        resetComposeState();
    });
}
