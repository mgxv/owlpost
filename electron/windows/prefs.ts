import { BrowserWindow, nativeTheme, session } from "electron";
import path from "path";
import { getPref } from "../core/store";
import { isDev } from "../core/env";

const PRELOAD_PREFS = path.join(__dirname, "../preload/prefs.js");
// Match App.tsx: bg-neutral-900 / bg-neutral-100
const BG_DARK = "#171717";
const BG_LIGHT = "#f5f5f5";

let _prefsWindow: BrowserWindow | null = null;
let _ready = false;

export function getPrefsWindow(): BrowserWindow | null {
    return _prefsWindow;
}

function resolveBackgroundColor(): string {
    const theme = getPref("systemTheme");
    const dark = theme === "dark" || (theme === "system" && nativeTheme.shouldUseDarkColors);
    return dark ? BG_DARK : BG_LIGHT;
}

export function initPrefsWindow(isQuitting: () => boolean): void {
    _ready = false;

    const win = new BrowserWindow({
        width: 500,
        height: 480,
        resizable: false,
        minimizable: false,
        maximizable: false,
        show: false,
        title: "Preferences",
        titleBarStyle: "hiddenInset",
        trafficLightPosition: { x: 12, y: 13 },
        backgroundColor: resolveBackgroundColor(),
        webPreferences: {
            preload: PRELOAD_PREFS,
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            session: session.fromPartition("persist:prefs"),
        },
    });

    win.once("ready-to-show", () => {
        _ready = true;
    });

    if (isDev) {
        void win.loadURL("http://localhost:3000");
    } else {
        void win.loadFile(path.join(__dirname, "../../dist/index.html"));
    }

    win.on("close", (event) => {
        if (!isQuitting()) {
            event.preventDefault();
            win.hide();
        }
    });

    _prefsWindow = win;
}

export function showPrefs(): void {
    const win = _prefsWindow;
    if (!win || win.isDestroyed()) return;
    const doShow = (): void => {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
    };
    if (_ready) {
        doShow();
    } else {
        win.once("ready-to-show", doShow);
    }
}

export function togglePrefs(isQuitting: () => boolean): void {
    if (!_prefsWindow || _prefsWindow.isDestroyed()) {
        initPrefsWindow(isQuitting);
    }

    const win = _prefsWindow;
    if (!win) return;
    if (win.isVisible() && win.isFocused()) {
        win.hide();
        return;
    }

    const doShow = (): void => {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
    };

    if (_ready) {
        doShow();
    } else {
        win.once("ready-to-show", doShow);
    }
}
