import { app } from "electron";

export function isLaunchAtLoginEnabled(): boolean {
    if (process.platform !== "darwin") return false;
    return app.getLoginItemSettings().openAtLogin;
}

export function applyLaunchAtLogin(enabled: boolean): void {
    if (process.platform !== "darwin") return;
    app.setLoginItemSettings({ openAtLogin: enabled });
}
