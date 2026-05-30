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
import { logger } from "../core/logger";

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
        try {
            markQuitting();
            installUpdate();
        } catch (e) {
            logger.error("[system] update install failed:", e);
        }
    });

    ipcMain.handle(IPC_UPDATE_PENDING, () => getPendingVersion());

    ipcMain.handle(IPC_APP_RESET, async () => {
        const clears = await Promise.allSettled([
            session.defaultSession.clearStorageData(),
            session.defaultSession.clearCache(),
            session.fromPartition("persist:prefs").clearStorageData(),
            session.fromPartition("persist:prefs").clearCache(),
        ]);
        for (const result of clears) {
            if (result.status === "rejected") {
                logger.error("[system] app reset — clear failed:", result.reason);
            }
        }

        try {
            (Object.keys(DEFAULTS) as (keyof Prefs)[]).forEach((k) => {
                setPref(k, DEFAULTS[k] as never);
            });
        } catch (e) {
            logger.error("[system] app reset — pref reset failed:", e);
        }

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
