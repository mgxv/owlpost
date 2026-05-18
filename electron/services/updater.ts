import { autoUpdater, type UpdateInfo } from "electron-updater";
import { app } from "electron";
import { logger } from "../core/logger";

let pendingVersion: string | null = null;

export function getPendingVersion(): string | null {
    return pendingVersion;
}

export function checkForUpdates(onReady: (version: string) => void): void {
    if (!app.isPackaged) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
        pendingVersion = info.version;
        onReady(info.version);
    });

    autoUpdater.on("error", (err: Error) => {
        logger.error("[updater] error:", err.message);
    });

    autoUpdater.checkForUpdates().catch((err: unknown) => {
        logger.error("[updater] check failed:", err);
    });
}

export function installUpdate(): void {
    autoUpdater.quitAndInstall(false, true);
}
