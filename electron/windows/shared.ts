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

export const TITLEBAR_HEIGHT = 32;

export function clampToDisplays(state: WindowState): WindowState {
    const { x, y } = state;
    if (x === undefined || y === undefined) return state;
    const visible = screen.getAllDisplays().some(({ bounds }) => {
        const titleBarVisible = y >= bounds.y && y + TITLEBAR_HEIGHT <= bounds.y + bounds.height;
        const horizontallyReachable =
            x + state.width > bounds.x + TITLEBAR_HEIGHT && x < bounds.x + bounds.width - TITLEBAR_HEIGHT;
        return titleBarVisible && horizontallyReachable;
    });
    if (visible) return state;
    return { width: state.width, height: state.height };
}

export function openExternal(url: string): void {
    shell.openExternal(url).catch((e: unknown) => {
        logger.warn("[shell] openExternal failed:", e);
    });
}
