import { shell, screen } from "electron";
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

// Strips saved position if it no longer falls on any connected display,
// so the window doesn't open invisibly after a monitor is disconnected.
export function clampToDisplays(state: WindowState): WindowState {
    const { x, y } = state;
    if (x === undefined || y === undefined) return state;
    const visible = screen
        .getAllDisplays()
        .some(
            ({ bounds }) =>
                x < bounds.x + bounds.width &&
                x + state.width > bounds.x &&
                y < bounds.y + bounds.height &&
                y + state.height > bounds.y,
        );
    if (visible) return state;
    return { width: state.width, height: state.height };
}

export function openExternal(url: string): void {
    shell.openExternal(url).catch((e: unknown) => {
        logger.warn("[shell] openExternal failed:", e);
    });
}
