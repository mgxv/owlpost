import { shell } from "electron";
import path from "path";
import { logger } from "../core/logger";

export const PRELOAD_GMAIL = path.join(__dirname, "../preload/gmail.js");

// Only https: and mailto: are forwarded to prevent protocol-handler abuse.
export function safeOpenExternal(url: string): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return;
    }
    if (parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:") {
        shell.openExternal(url).catch((e: unknown) => {
            logger.warn("[shell] openExternal failed:", e);
        });
    }
}
