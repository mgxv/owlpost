import { app } from "electron";
import { writeFileSync } from "fs";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import path from "path";
import { autoUpdater, type UpdateInfo } from "electron-updater";
import { isDev } from "../core/env";
import { logger } from "../core/logger";
import { saveWindowState } from "../windows/gmail";

let pendingVersion: string | null = null;
let listenersBound = false;
let onDownloadingCb: (version: string) => void = () => {};
let onReadyCb: (version: string) => void = () => {};

export function getPendingVersion(): string | null {
    return pendingVersion;
}

// Bind the autoUpdater event handlers once; callbacks are refreshed via module refs per check.
function bindUpdaterListeners(): void {
    if (listenersBound) return;
    listenersBound = true;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("update-available", (info: UpdateInfo) => {
        onDownloadingCb(info.version);
    });
    autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
        pendingVersion = info.version;
        onReadyCb(info.version);
    });
    autoUpdater.on("error", (err: Error) => {
        logger.error("[updater] error:", err.message);
    });
}

export function checkForUpdates(onDownloading: (version: string) => void, onReady: (version: string) => void): void {
    if (isDev) return;

    onDownloadingCb = onDownloading;
    onReadyCb = onReady;
    bindUpdaterListeners();

    autoUpdater.checkForUpdates().catch((err: unknown) => {
        logger.error("[updater] check failed:", err);
    });
}

export async function manualCheck(
    onDownloading: (version: string) => void,
    onReady: (version: string) => void,
): Promise<void> {
    if (isDev) return;

    // Update already downloaded in this session — report it immediately.
    if (pendingVersion !== null) {
        onReady(pendingVersion);
        return;
    }

    onDownloadingCb = onDownloading;
    onReadyCb = onReady;
    bindUpdaterListeners();

    try {
        await autoUpdater.checkForUpdates();
    } catch (err: unknown) {
        logger.error("[updater] manual check:", err);
    }
}

export function installUpdate(): void {
    if (process.platform !== "darwin") {
        autoUpdater.quitAndInstall(false, true);
        return;
    }

    const mu = autoUpdater as unknown as Record<string, unknown>;

    // If Squirrel hasn't staged the update yet, skip the native path entirely.
    if (!mu.squirrelDownloadedUpdate) {
        logger.info("[updater] Squirrel update not staged, using fallback installer");
        installUpdateMac();
        return;
    }

    // Squirrel has the update staged. Try the native path; fall back on any error.
    const onError = (err: Error): void => {
        autoUpdater.removeListener("error", onError);
        logger.warn("[updater] Squirrel quitAndInstall failed, using fallback:", err.message);
        installUpdateMac();
    };

    autoUpdater.on("error", onError);
    setTimeout(() => autoUpdater.removeListener("error", onError), 15_000);

    autoUpdater.quitAndInstall(false, true);
}

function installUpdateMac(): void {
    const helper = (autoUpdater as unknown as Record<string, unknown>).downloadedUpdateHelper as {
        file: string | null;
    } | null;
    const zipPath = helper?.file;

    if (!zipPath) {
        logger.error("[updater] installUpdateMac: no downloaded update file");
        return;
    }

    const appBundle = path.resolve(app.getAppPath(), "../../..");
    const installDir = path.dirname(appBundle);
    const scriptPath = path.join(app.getPath("temp"), `owlpost-update-${randomUUID()}.sh`);

    writeFileSync(
        scriptPath,
        [
            "#!/bin/bash",
            "sleep 2",
            `ditto -xk "${zipPath}" "${installDir}"`,
            `open "${appBundle}"`,
            `rm -f "${scriptPath}"`,
        ].join("\n"),
        { mode: 0o700 },
    );

    spawn("/bin/bash", [scriptPath], { detached: true, stdio: "ignore" }).unref();
    logger.info("[updater] spawned install script, exiting");
    saveWindowState();
    app.exit(0);
}
