import { app } from "electron";

let lastCount = 0;

export function updateBadge(count: number, showBadge: boolean): void {
    lastCount = count;
    applyBadge(showBadge);
}

export function applyBadge(showBadge: boolean): void {
    if (process.platform !== "darwin" || !app.dock) return;
    const text = showBadge && lastCount > 0 ? String(lastCount) : "";
    app.dock.setBadge(text);
}
