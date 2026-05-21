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
    openFind(): void {
        ipcRenderer.send("tb:open-find");
    },
    onUpdate(fn: (s: NavState) => void): () => void {
        const listener = (_e: Electron.IpcRendererEvent, s: unknown) => {
            fn(s as NavState);
        };
        ipcRenderer.on("tb:update", listener);
        return () => ipcRenderer.off("tb:update", listener);
    },
});
