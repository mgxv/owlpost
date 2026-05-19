import { autoUpdater, type UpdateInfo } from "electron-updater";
import { isDev } from "../core/env";
import { logger } from "../core/logger";

let pendingVersion: string | null = null;

export function getPendingVersion(): string | null {
    return pendingVersion;
}

export function checkForUpdates(onReady: (version: string) => void, onDownloading: (version: string) => void): void {
    if (isDev) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("update-available", (info: UpdateInfo) => {
        onDownloading(info.version);
    });

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
