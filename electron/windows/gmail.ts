import { app, BrowserWindow, WebContentsView, nativeTheme, type WebContents } from "electron";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import path from "path";
import Findbar from "electron-findbar";
import { isDev } from "../core/env";
import { logger } from "../core/logger";
import { getPref } from "../core/store";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "../core/prefs";
import {
    PRELOAD_GMAIL,
    TITLEBAR_HEIGHT,
    openExternal,
    GMAIL_ALLOWED_HOSTS,
    clampToDisplays,
    attachContextMenu,
    type WindowState,
} from "./shared";
import { extractAccount } from "./window-url";
import { describeLoadError } from "../core/net-errors";

const WINDOW_DEFAULTS: WindowState = { width: 1200, height: 800 };
const PRELOAD_TITLEBAR = path.join(__dirname, "../preload/titlebar.js");

const GMAIL_BG_DARK = "#1f1f1f";
const GMAIL_BG_LIGHT = "#ffffff";

function resolveGmailBackground(): string {
    const theme = getPref("systemTheme");
    const dark = theme === "dark" || (theme === "system" && nativeTheme.shouldUseDarkColors);
    return dark ? GMAIL_BG_DARK : GMAIL_BG_LIGHT;
}

Findbar.setDefaultTheme("system");
Findbar.setDefaultBoundsHandler((parent, bar) => ({
    x: parent.x + parent.width - bar.width - 20,
    y: parent.y + (process.platform === "darwin" ? TITLEBAR_HEIGHT : 0) + 8,
    width: bar.width,
    height: bar.height,
}));
Findbar.setDefaultWindowHandler((win) => {
    win.setBackgroundColor(nativeTheme.shouldUseDarkColors ? GMAIL_BG_DARK : GMAIL_BG_LIGHT);
});

function loadTitlebar(wc: WebContents): void {
    if (isDev) {
        void wc.loadURL("http://localhost:3000/titlebar.html");
    } else {
        void wc.loadFile(path.join(__dirname, "../../dist/titlebar.html"));
    }
}

// ServiceLogin URL ensures logged-out users land on the sign-in form rather than a workspace redirect.
const GMAIL_INITIAL_URL =
    "https://accounts.google.com/ServiceLogin?service=mail&continue=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0";

const _injectedCache = new Map<string, string>();

function loadInjected(name: string): string {
    const cached = _injectedCache.get(name);
    if (cached !== undefined) return cached;
    const dir = isDev ? path.join(app.getAppPath(), "dist-injected") : path.join(process.resourcesPath, "injected");
    const content = readFileSync(path.join(dir, name), "utf-8");
    _injectedCache.set(name, content);
    return content;
}

function loadErrorPage(wc: WebContents, description: string): void {
    if (isDev) {
        const url = new URL("http://localhost:3000/errorPage.html");
        url.searchParams.set("desc", description);
        void wc.loadURL(url.toString());
    } else {
        void wc.loadFile(path.join(__dirname, "../../dist/errorPage.html"), { query: { desc: description } });
    }
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

let _gmailWindow: BrowserWindow | null = null;
let _gmailView: WebContentsView | null = null;
let _titlebarView: WebContentsView | null = null;
let _currentZoom = 100;
let _windowStatePath = "";
let _currentAccount: string | null = null;
let _lastTitlebarKey: string | null = null;

function pushTitlebarState(wc: WebContents): void {
    if (!_titlebarView || _titlebarView.webContents.isDestroyed()) return;
    const title = wc.getTitle().match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] ?? "Gmail";
    const canGoBack = wc.navigationHistory.canGoBack();
    const canGoForward = wc.navigationHistory.canGoForward();
    const key = `${String(canGoBack)}|${String(canGoForward)}|${title}`;
    if (key === _lastTitlebarKey) return;
    _lastTitlebarKey = key;
    _titlebarView.webContents.send("tb:update", { canGoBack, canGoForward, title });
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

export function openFindbar(): void {
    const wc = getGmailWebContents();
    if (!wc) return;
    Findbar.from(wc).open();
}

export function showGmailWindow(): void {
    if (!_gmailWindow || _gmailWindow.isDestroyed()) return;
    if (_gmailWindow.isMinimized()) _gmailWindow.restore();
    _gmailWindow.show();
    _gmailWindow.focus();
}

export function resetWindowState(): void {
    if (!_windowStatePath) return;
    try {
        unlinkSync(_windowStatePath);
    } catch {
        /* already absent */
    }
    if (_gmailWindow && !_gmailWindow.isDestroyed() && !_gmailWindow.isFullScreen()) {
        _gmailWindow.setSize(WINDOW_DEFAULTS.width, WINDOW_DEFAULTS.height);
        _gmailWindow.center();
    }
}

export function reloadGmail(): void {
    if (_gmailView && !_gmailView.webContents.isDestroyed()) _gmailView.webContents.reload();
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
    try {
        const saved = JSON.parse(readFileSync(_windowStatePath, "utf-8")) as Partial<WindowState>;
        return clampToDisplays({ ...WINDOW_DEFAULTS, ...saved });
    } catch {
        return WINDOW_DEFAULTS;
    }
}

export function saveWindowState(): void {
    if (!_gmailWindow || _gmailWindow.isDestroyed()) return;
    if (_gmailWindow.isMinimized() || _gmailWindow.isFullScreen()) return;
    const bounds = _gmailWindow.getBounds();
    try {
        writeFileSync(_windowStatePath, JSON.stringify(bounds, null, 4));
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
                openExternal(url);
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
                openExternal(url);
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
        backgroundColor: resolveGmailBackground(),
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
        loadErrorPage(gmailView.webContents, describeLoadError(errorCode, errorDescription));
    });

    attachNavigationHandlers(gmailView.webContents);

    gmailView.webContents.on("did-navigate", (_event, url) => {
        const account = extractAccount(url);
        if (account !== null && account !== _currentAccount) {
            _currentAccount = account;
            gmailView.webContents.navigationHistory.clear();
        }
        if (isMac) pushTitlebarState(gmailView.webContents);
    });

    if (isMac) {
        gmailView.webContents.on("did-navigate-in-page", () => {
            pushTitlebarState(gmailView.webContents);
        });
        gmailView.webContents.on("page-title-updated", () => {
            pushTitlebarState(gmailView.webContents);
        });
    }

    attachContextMenu(gmailView.webContents, win);

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
        saveWindowState();
        if (!isQuitting()) {
            event.preventDefault();
            win.hide();
        }
    });

    win.on("resize", () => {
        const { width: w, height: h } = win.getBounds();
        if (!gmailView.webContents.isDestroyed()) {
            gmailView.setBounds({ x: 0, y: yOffset, width: w, height: h - yOffset });
        }
        if (_titlebarView && !_titlebarView.webContents.isDestroyed()) {
            _titlebarView.setBounds({ x: 0, y: 0, width: w, height: TITLEBAR_HEIGHT });
        }
    });

    win.on("resized", () => {
        saveWindowState();
    });
    win.on("moved", () => {
        saveWindowState();
    });

    _gmailWindow = win;
    return win;
}
