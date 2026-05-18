import { app, BrowserWindow } from "electron";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { logger } from "../core/logger";
import { getPref } from "../core/store";
import { PRELOAD_GMAIL, safeOpenExternal, GMAIL_ALLOWED_HOSTS } from "./shared";

// ServiceLogin URL ensures logged-out users land on the sign-in form rather than a workspace redirect.
const GMAIL_INITIAL_URL =
    "https://accounts.google.com/ServiceLogin?service=mail&continue=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0";

function loadInjected(name: string): string {
    const dir = app.isPackaged
        ? path.join(process.resourcesPath, "injected")
        : path.join(app.getAppPath(), "dist-injected");
    return readFileSync(path.join(dir, name), "utf-8");
}

async function injectGmailScripts(win: BrowserWindow): Promise<void> {
    if (win.isDestroyed()) return;
    const wc = win.webContents;
    try {
        await wc.executeJavaScript(loadInjected("title-watcher.js"));
        await wc.executeJavaScript(loadInjected("notifications.js"));
    } catch (e) {
        logger.error("[inject] executeJavaScript:", e);
    }
}

interface WindowState {
    x?: number;
    y?: number;
    width: number;
    height: number;
}

const ZOOM_STEP = 10;
const ZOOM_MIN = 50;
const ZOOM_MAX = 150;

let _gmailWindow: BrowserWindow | null = null;
let _currentZoom = 100;
let _windowStatePath = "";

export function getGmailWindow(): BrowserWindow | null {
    return _gmailWindow;
}

export function getCurrentZoom(): number {
    return _currentZoom;
}

export function showGmailWindow(): void {
    if (!_gmailWindow || _gmailWindow.isDestroyed()) return;
    if (_gmailWindow.isMinimized()) _gmailWindow.restore();
    _gmailWindow.show();
    _gmailWindow.focus();
}

export function reloadGmail(): void {
    if (_gmailWindow && !_gmailWindow.isDestroyed()) _gmailWindow.webContents.reload();
}

export function executeInGmail(js: string): void {
    if (!_gmailWindow || _gmailWindow.isDestroyed()) return;
    _gmailWindow.webContents.executeJavaScript(js).catch((e: unknown) => {
        logger.warn("[gmail] executeJavaScript failed:", e);
    });
}

export function zoomIn(): void {
    if (_gmailWindow && !_gmailWindow.isDestroyed()) applyZoom(_gmailWindow, _currentZoom + ZOOM_STEP);
}

export function zoomOut(): void {
    if (_gmailWindow && !_gmailWindow.isDestroyed()) applyZoom(_gmailWindow, _currentZoom - ZOOM_STEP);
}

export function zoomReset(): void {
    if (_gmailWindow && !_gmailWindow.isDestroyed()) applyZoom(_gmailWindow, getPref("defaultZoom"));
}

function applyZoom(win: BrowserWindow, percent: number): void {
    _currentZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, percent));
    win.webContents.setZoomFactor(_currentZoom / 100);
}

function loadWindowState(): WindowState {
    const defaults: WindowState = { width: 1200, height: 800 };
    try {
        return { ...defaults, ...(JSON.parse(readFileSync(_windowStatePath, "utf-8")) as Partial<WindowState>) };
    } catch {
        return defaults;
    }
}

function saveWindowState(win: BrowserWindow): void {
    if (win.isMinimized() || win.isMaximized()) return;
    const bounds = win.getBounds();
    try {
        writeFileSync(_windowStatePath, JSON.stringify(bounds, null, 2));
    } catch (e) {
        logger.warn("[window-state] save failed:", e);
    }
}

function attachNavigationHandlers(win: BrowserWindow): void {
    win.webContents.setWindowOpenHandler(({ url }) => {
        try {
            const host = new URL(url).hostname;
            if (GMAIL_ALLOWED_HOSTS.has(host)) {
                void win.webContents.loadURL(url);
            } else {
                safeOpenExternal(url);
            }
        } catch (e) {
            logger.debug("[gmail] setWindowOpenHandler — malformed URL:", e);
        }
        return { action: "deny" };
    });

    win.webContents.on("will-navigate", (event, url) => {
        try {
            const host = new URL(url).hostname;
            if (!GMAIL_ALLOWED_HOSTS.has(host)) {
                event.preventDefault();
                safeOpenExternal(url);
            }
        } catch {
            event.preventDefault();
        }
    });
}

export function createGmailWindow(windowStatePath: string, isQuitting: () => boolean): BrowserWindow {
    _windowStatePath = windowStatePath;
    _currentZoom = getPref("defaultZoom");

    const state = loadWindowState();
    const win = new BrowserWindow({
        ...state,
        minWidth: 800,
        minHeight: 600,
        title: "",
        webPreferences: {
            preload: PRELOAD_GMAIL,
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
        },
    });

    // Prevents badge and notification updates from being throttled when the window is hidden.
    win.webContents.setBackgroundThrottling(false);
    void win.loadURL(GMAIL_INITIAL_URL);
    applyZoom(win, _currentZoom);

    win.webContents.on("did-finish-load", () => {
        injectGmailScripts(win).catch((e: unknown) => {
            logger.error("[inject] did-finish-load:", e);
        });
    });

    win.on("page-title-updated", (event) => {
        event.preventDefault();
    });

    win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, _url, isMainFrame) => {
        if (!isMainFrame) return;
        if (errorCode === -3) return; // ERR_ABORTED — user navigated away before load completed
        logger.error("[gmail] did-fail-load:", errorCode, errorDescription);
        const html = encodeURIComponent(
            `<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:3rem">` +
                `<h2 style="color:#444">Could not reach Gmail</h2>` +
                `<p style="color:#666">${errorDescription}</p>` +
                `<button onclick="window.location.assign('${GMAIL_INITIAL_URL}')" style="padding:8px 16px;cursor:pointer">Retry</button>` +
                `</body></html>`,
        );
        void win.webContents.loadURL(`data:text/html;charset=utf-8,${html}`);
    });

    attachNavigationHandlers(win);

    // Hide on close so the Gmail session (cookies, service workers) stays alive; Cmd+Q still quits.
    win.on("close", (event) => {
        if (!isQuitting()) {
            event.preventDefault();
            win.hide();
        }
    });

    win.on("resize", () => {
        saveWindowState(win);
    });
    win.on("move", () => {
        saveWindowState(win);
    });

    _gmailWindow = win;
    return win;
}
