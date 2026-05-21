import { shell } from "electron";
import path from "path";
import { logger } from "../core/logger";

export const PRELOAD_GMAIL = path.join(__dirname, "../preload/gmail.js");

export const GMAIL_ALLOWED_HOSTS = new Set(["mail.google.com", "accounts.google.com"]);

export interface WindowState {
    x?: number;
    y?: number;
    width: number;
    height: number;
}

export function openExternal(url: string): void {
    shell.openExternal(url).catch((e: unknown) => {
        logger.warn("[shell] openExternal failed:", e);
    });
}
