import { app, BrowserWindow } from "electron";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import path from "path";
import { getCurrentZoom } from "./gmail";
import { PRELOAD_GMAIL, openExternal, GMAIL_ALLOWED_HOSTS, clampToDisplays, type WindowState } from "./shared";
import { logger } from "../core/logger";

const BLANK_COMPOSE_URL = "https://mail.google.com/mail/?view=cm&fs=1";

// extsrc=mailto tells Gmail to parse the full URI itself (recipient, subject, body).
function parseMailtoUrl(mailtoUrl: string): string {
    const compose = new URL("https://mail.google.com/mail/");
    compose.searchParams.set("extsrc", "mailto");
    compose.searchParams.set("url", mailtoUrl);
    return compose.toString();
}

const COMPOSE_DEFAULTS: WindowState = { width: 900, height: 700 };

let _composeStatePath = "";

function getComposeStatePath(): string {
    if (!_composeStatePath) {
        _composeStatePath = path.join(app.getPath("userData"), "compose-state.json");
    }
    return _composeStatePath;
}

function loadComposeState(): WindowState {
    try {
        const saved = JSON.parse(readFileSync(getComposeStatePath(), "utf-8")) as Partial<WindowState>;
        return clampToDisplays({ ...COMPOSE_DEFAULTS, ...saved });
    } catch {
        return COMPOSE_DEFAULTS;
    }
}

export function resetComposeState(): void {
    try {
        unlinkSync(getComposeStatePath());
    } catch {
        /* already absent */
    }
    for (const win of _composeWindows) {
        if (!win.isDestroyed() && !win.isFullScreen()) {
            win.setSize(COMPOSE_DEFAULTS.width, COMPOSE_DEFAULTS.height);
            win.center();
        }
    }
}

function saveComposeState(win: BrowserWindow): void {
    if (win.isMinimized() || win.isFullScreen()) return;
    const bounds = win.getBounds();
    try {
        writeFileSync(getComposeStatePath(), JSON.stringify(bounds, null, 4));
    } catch (e) {
        logger.warn("[compose] save state failed:", e);
    }
}

const _composeWindows = new Set<BrowserWindow>();

export function openCompose(mailtoUrl?: string): void {
    // Blank compose reuses an existing window rather than stacking duplicates.
    if (!mailtoUrl) {
        for (const existing of _composeWindows) {
            if (!existing.isDestroyed()) {
                if (existing.isMinimized()) existing.restore();
                existing.show();
                existing.focus();
                return;
            }
        }
    }

    const url = mailtoUrl ? parseMailtoUrl(mailtoUrl) : BLANK_COMPOSE_URL;
    const state = loadComposeState();

    const win = new BrowserWindow({
        ...state,
        show: false,
        minWidth: 600,
        minHeight: 500,
        title: "New Message",
        webPreferences: {
            preload: PRELOAD_GMAIL,
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
        },
    });

    win.once("ready-to-show", () => {
        win.show();
    });

    void win.loadURL(url);
    win.webContents.setZoomFactor(getCurrentZoom() / 100);

    win.webContents.on("will-navigate", (event, navUrl) => {
        try {
            const host = new URL(navUrl).hostname;
            if (!GMAIL_ALLOWED_HOSTS.has(host)) {
                event.preventDefault();
                openExternal(navUrl);
            }
        } catch {
            event.preventDefault();
        }
    });

    win.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
        openExternal(popupUrl);
        return { action: "deny" };
    });

    win.on("close", () => {
        saveComposeState(win);
    });

    win.on("closed", () => {
        _composeWindows.delete(win);
    });

    _composeWindows.add(win);
}
