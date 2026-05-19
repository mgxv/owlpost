import { contextBridge, ipcRenderer } from "electron";

type NavState = { canGoBack: boolean; canGoForward: boolean; title: string };

contextBridge.exposeInMainWorld("tb", {
    goBack(): void {
        ipcRenderer.send("tb:go-back");
    },
    goForward(): void {
        ipcRenderer.send("tb:go-forward");
    },
    openPrefs(): void {
        ipcRenderer.send("tb:open-prefs");
    },
    onUpdate(fn: (s: NavState) => void): void {
        ipcRenderer.on("tb:update", (_e, s) => {
            fn(s as NavState);
        });
    },
});
