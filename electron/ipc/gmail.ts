import { ipcMain, Notification } from "electron";
import { IPC_FROM_GMAIL } from "../core/constants";
import { getPref } from "../core/store";
import { updateBadge } from "../services/badge";
import { getGmailWindow } from "../windows/gmail";
import { logger } from "../core/logger";

export function registerGmailIpc(): void {
    ipcMain.on(IPC_FROM_GMAIL, (_event, msg: unknown) => {
        if (typeof msg !== "object" || msg === null) return;
        const { name, payload } = msg as Record<string, unknown>;
        if (typeof name !== "string") return;

        switch (name) {
            case "unread-count":
                if (typeof payload === "number") {
                    updateBadge(payload, getPref("showDockBadge"));
                }
                break;

            case "account-email": {
                const win = getGmailWindow();
                if (typeof payload === "string" && win && !win.isDestroyed()) {
                    win.setTitle(payload);
                }
                break;
            }

            case "notification":
                if (
                    getPref("notificationsEnabled") &&
                    Notification.isSupported() &&
                    typeof payload === "object" &&
                    payload !== null
                ) {
                    const p = payload as { title?: string; body?: string };
                    new Notification({ title: p.title ?? "Owlpost", body: p.body ?? "" }).show();
                }
                break;

            case "injected-script-error":
            case "title-format-unknown":
            case "menu-action-failed":
                logger.warn(`[injected] ${name}:`, payload);
                break;
        }
    });
}
