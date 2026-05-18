import { BrowserWindow } from "electron";
import { getCurrentZoom } from "./gmail";
import { PRELOAD_GMAIL, safeOpenExternal, GMAIL_ALLOWED_HOSTS } from "./shared";

const BLANK_COMPOSE_URL = "https://mail.google.com/mail/?view=cm&fs=1";

// extsrc=mailto tells Gmail to parse the full URI itself (recipient, subject, body).
function parseMailtoUrl(mailtoUrl: string): string {
    const compose = new URL("https://mail.google.com/mail/");
    compose.searchParams.set("extsrc", "mailto");
    compose.searchParams.set("url", mailtoUrl);
    return compose.toString();
}

let _composeWindow: BrowserWindow | null = null;

export function openCompose(mailtoUrl?: string): void {
    if (_composeWindow && !_composeWindow.isDestroyed()) {
        if (_composeWindow.isMinimized()) _composeWindow.restore();
        _composeWindow.show();
        _composeWindow.focus();
        return;
    }

    const url = mailtoUrl ? parseMailtoUrl(mailtoUrl) : BLANK_COMPOSE_URL;

    const win = new BrowserWindow({
        width: 900,
        height: 700,
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

    void win.loadURL(url);
    win.webContents.setZoomFactor(getCurrentZoom() / 100);

    win.webContents.on("will-navigate", (event, navUrl) => {
        try {
            const host = new URL(navUrl).hostname;
            if (!GMAIL_ALLOWED_HOSTS.has(host)) {
                event.preventDefault();
                safeOpenExternal(navUrl);
            }
        } catch {
            event.preventDefault();
        }
    });

    win.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
        safeOpenExternal(popupUrl);
        return { action: "deny" };
    });

    win.on("closed", () => {
        _composeWindow = null;
    });

    _composeWindow = win;
}
