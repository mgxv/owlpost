import { app } from "electron";
import { isDev } from "../core/env";

export function isLaunchAtLoginEnabled(): boolean {
    if (process.platform !== "darwin" || isDev) return false;
    return app.getLoginItemSettings().openAtLogin;
}

export function applyLaunchAtLogin(enabled: boolean): void {
    if (process.platform !== "darwin" || isDev) return;
    app.setLoginItemSettings({ openAtLogin: enabled });
}
