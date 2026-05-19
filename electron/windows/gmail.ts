import { app, BrowserWindow, WebContentsView, type WebContents } from "electron";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { logger } from "../core/logger";
import { getPref } from "../core/store";
import { PRELOAD_GMAIL, safeOpenExternal, GMAIL_ALLOWED_HOSTS } from "./shared";

const TITLEBAR_HEIGHT = 32;
const PRELOAD_TITLEBAR = path.join(__dirname, "../preload/titlebar.js");

function loadTitlebar(wc: WebContents): void {
    if (app.isPackaged) {
        void wc.loadFile(path.join(__dirname, "../../dist/titlebar.html"));
    } else {
        void wc.loadURL("http://localhost:3000/titlebar.html");
    }
}

// ServiceLogin URL ensures logged-out users land on the sign-in form rather than a workspace redirect.
const GMAIL_INITIAL_URL =
    "https://accounts.google.com/ServiceLogin?service=mail&continue=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0";

function loadInjected(name: string): string {
    const dir = app.isPackaged
        ? path.join(process.resourcesPath, "injected")
        : path.join(app.getAppPath(), "dist-injected");
    return readFileSync(path.join(dir, name), "utf-8");
}

async function injectGmailScripts(wc: WebContents): Promise<void> {
    if (wc.isDestroyed()) return;
    try {
        await wc.executeJavaScript(loadInjected("title-watcher.js"));
        await wc.executeJavaScript(loadInjected("notifications.js"));
    } catch (e) {
        logger.error("[inject] executeJavaScript:", e);
    }
}

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;

function extractGmailTitle(rawTitle: string): string {
    const m = rawTitle.match(EMAIL_RE);
    return m?.[0] ?? "Gmail";
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
let _gmailView: WebContentsView | null = null;
let _titlebarView: WebContentsView | null = null;
let _currentZoom = 100;
let _windowStatePath = "";

function pushTitlebarState(wc: WebContents): void {
    if (!_titlebarView || _titlebarView.webContents.isDestroyed()) return;
    _titlebarView.webContents.send("tb:update", {
        canGoBack: wc.navigationHistory.canGoBack(),
        canGoForward: wc.navigationHistory.canGoForward(),
        title: extractGmailTitle(wc.getTitle()),
    });
}

export function getGmailWindow(): BrowserWindow | null {
    return _gmailWindow;
}

export function getGmailWebContents(): WebContents | null {
    if (!_gmailView || _gmailView.webContents.isDestroyed()) return null;
    return _gmailView.webContents;
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
    if (_gmailView && !_gmailView.webContents.isDestroyed()) _gmailView.webContents.reload();
}

export function executeInGmail(js: string): void {
    if (!_gmailView || _gmailView.webContents.isDestroyed()) return;
    _gmailView.webContents.executeJavaScript(js).catch((e: unknown) => {
        logger.warn("[gmail] executeJavaScript failed:", e);
    });
}

export function zoomIn(): void {
    if (_gmailWindow && !_gmailWindow.isDestroyed()) applyZoom(_currentZoom + ZOOM_STEP);
}

export function zoomOut(): void {
    if (_gmailWindow && !_gmailWindow.isDestroyed()) applyZoom(_currentZoom - ZOOM_STEP);
}

export function zoomReset(): void {
    if (_gmailWindow && !_gmailWindow.isDestroyed()) applyZoom(getPref("defaultZoom"));
}

function applyZoom(percent: number): void {
    _currentZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, percent));
    if (_gmailView && !_gmailView.webContents.isDestroyed()) {
        _gmailView.webContents.setZoomFactor(_currentZoom / 100);
    }
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

function attachNavigationHandlers(wc: WebContents): void {
    wc.setWindowOpenHandler(({ url }) => {
        try {
            const host = new URL(url).hostname;
            if (GMAIL_ALLOWED_HOSTS.has(host)) {
                void wc.loadURL(url);
            } else {
                safeOpenExternal(url);
            }
        } catch (e) {
            logger.debug("[gmail] setWindowOpenHandler — malformed URL:", e);
        }
        return { action: "deny" };
    });

    wc.on("will-navigate", (event, url) => {
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
    const isMac = process.platform === "darwin";
    const yOffset = isMac ? TITLEBAR_HEIGHT : 0;

    const win = new BrowserWindow({
        ...state,
        show: false,
        minWidth: 800,
        minHeight: 600,
        title: "Owlpost",
        titleBarStyle: isMac ? "hiddenInset" : "default",
        ...(isMac ? { trafficLightPosition: { x: 12, y: 10 } } : {}),
        webPreferences: {
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
        },
    });

    // ── Gmail content view ────────────────────────────────────────────────────
    const gmailView = new WebContentsView({
        webPreferences: {
            preload: PRELOAD_GMAIL,
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
        },
    });
    _gmailView = gmailView;

    const { width, height } = win.getBounds();
    win.contentView.addChildView(gmailView);
    gmailView.setBounds({ x: 0, y: yOffset, width, height: height - yOffset });

    // Prevents badge and notification updates from being throttled when the window is hidden.
    gmailView.webContents.setBackgroundThrottling(false);
    void gmailView.webContents.loadURL(GMAIL_INITIAL_URL);
    applyZoom(_currentZoom);

    gmailView.webContents.on("did-finish-load", () => {
        injectGmailScripts(gmailView.webContents).catch((e: unknown) => {
            logger.error("[inject] did-finish-load:", e);
        });
        if (isMac) pushTitlebarState(gmailView.webContents);
    });

    gmailView.webContents.on("did-fail-load", (_event, errorCode, errorDescription, _url, isMainFrame) => {
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
        void gmailView.webContents.loadURL(`data:text/html;charset=utf-8,${html}`);
    });

    attachNavigationHandlers(gmailView.webContents);

    if (isMac) {
        gmailView.webContents.on("did-navigate", () => {
            pushTitlebarState(gmailView.webContents);
        });
        gmailView.webContents.on("did-navigate-in-page", () => {
            pushTitlebarState(gmailView.webContents);
        });
        gmailView.webContents.on("page-title-updated", () => {
            pushTitlebarState(gmailView.webContents);
        });
    }

    // ── Titlebar view (macOS only) ────────────────────────────────────────────
    if (isMac) {
        const tbView = new WebContentsView({
            webPreferences: {
                preload: PRELOAD_TITLEBAR,
                contextIsolation: true,
                sandbox: true,
                nodeIntegration: false,
            },
        });
        win.contentView.addChildView(tbView);
        tbView.setBounds({ x: 0, y: 0, width, height: TITLEBAR_HEIGHT });
        tbView.webContents.once("did-finish-load", () => {
            win.show();
        });
        loadTitlebar(tbView.webContents);
        _titlebarView = tbView;
    } else {
        win.show();
    }

    // Hide on close so the Gmail session (cookies, service workers) stays alive; Cmd+Q still quits.
    win.on("close", (event) => {
        if (!isQuitting()) {
            event.preventDefault();
            win.hide();
        }
    });

    win.on("resize", () => {
        saveWindowState(win);
        const { width: w, height: h } = win.getBounds();
        if (!gmailView.webContents.isDestroyed()) {
            gmailView.setBounds({ x: 0, y: yOffset, width: w, height: h - yOffset });
        }
        if (_titlebarView && !_titlebarView.webContents.isDestroyed()) {
            _titlebarView.setBounds({ x: 0, y: 0, width: w, height: TITLEBAR_HEIGHT });
        }
    });
    win.on("move", () => {
        saveWindowState(win);
    });

    _gmailWindow = win;
    return win;
}
