import { ipcMain, Notification } from "electron";
import {
    IPC_FROM_GMAIL,
    GMAIL_EVT_UNREAD_COUNT,
    GMAIL_EVT_ACCOUNT_EMAIL,
    GMAIL_EVT_NOTIFICATION,
    GMAIL_EVT_INJECTED_ERROR,
    GMAIL_EVT_TITLE_FORMAT_UNKNOWN,
    GMAIL_EVT_MENU_ACTION_FAILED,
} from "../core/constants";
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
            case GMAIL_EVT_UNREAD_COUNT:
                if (typeof payload === "number") {
                    updateBadge(payload, getPref("showDockBadge"));
                }
                break;

            case GMAIL_EVT_ACCOUNT_EMAIL: {
                const win = getGmailWindow();
                if (typeof payload === "string" && win && !win.isDestroyed()) {
                    win.setTitle(payload);
                }
                break;
            }

            case GMAIL_EVT_NOTIFICATION:
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

            case GMAIL_EVT_INJECTED_ERROR:
            case GMAIL_EVT_TITLE_FORMAT_UNKNOWN:
            case GMAIL_EVT_MENU_ACTION_FAILED:
                logger.warn(`[injected] ${name}:`, payload);
                break;
        }
    });
}
