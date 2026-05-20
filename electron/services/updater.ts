import { app } from "electron";
import { writeFileSync } from "fs";
import { spawn } from "child_process";
import path from "path";
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

export async function manualCheck(onDownloading: (version: string) => void): Promise<void> {
    if (isDev) return;
    autoUpdater.autoDownload = true;
    autoUpdater.once("update-available", (info: UpdateInfo) => {
        onDownloading(info.version);
    });
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

    // Squirrel.Mac rejects updates signed with a different identity than the running app.
    // Fall back to a shell script installer when that happens.
    const onSignatureError = (err: Error): void => {
        if (err.message.includes("Code signature") || err.message.includes("code failed to satisfy")) {
            autoUpdater.removeListener("error", onSignatureError);
            installUpdateMac();
        }
    };

    autoUpdater.on("error", onSignatureError);
    setTimeout(() => autoUpdater.removeListener("error", onSignatureError), 15_000);

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
    const scriptPath = path.join(app.getPath("temp"), "owlpost-update.sh");

    writeFileSync(
        scriptPath,
        [
            "#!/bin/bash",
            "sleep 2",
            `ditto -xk "${zipPath}" "${installDir}"`,
            `open "${appBundle}"`,
            `rm -f "${scriptPath}"`,
        ].join("\n"),
        { mode: 0o755 },
    );

    spawn("/bin/bash", [scriptPath], { detached: true, stdio: "ignore" }).unref();
    logger.info("[updater] spawned install script, exiting");
    app.exit(0);
}
