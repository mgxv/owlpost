import { contextBridge, ipcRenderer } from "electron";
import { IPC_FROM_GMAIL } from "../core/constants";

contextBridge.exposeInMainWorld("__owlpost__", {
    EMAIL_RE: /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i,

    onReady(fn: () => void): void {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn, { once: true });
        } else {
            fn();
        }
    },

    emit(name: string, payload: unknown): void {
        ipcRenderer.send(IPC_FROM_GMAIL, { name, payload });
    },
});
