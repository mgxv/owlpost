import { shell } from "electron";
import path from "path";
import { logger } from "../core/logger";

export const PRELOAD_GMAIL = path.join(__dirname, "../preload/gmail.js");

export const GMAIL_ALLOWED_HOSTS = new Set(["mail.google.com", "accounts.google.com"]);

export function safeOpenExternal(url: string): void {
    shell.openExternal(url).catch((e: unknown) => {
        logger.warn("[shell] openExternal failed:", e);
    });
}
