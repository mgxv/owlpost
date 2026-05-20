import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import {
    IPC_PREFS_GET,
    IPC_PREFS_SET,
    IPC_PREFS_CHANGED,
    IPC_LAUNCH_AT_LOGIN_GET,
    IPC_CRASH_REPORTING_AVAIL,
    IPC_NOTIF_PERMISSION_GET,
    IPC_UPDATE_CHECK,
    IPC_UPDATE_DOWNLOADING,
    IPC_UPDATE_INSTALL,
    IPC_UPDATE_PENDING,
    IPC_UPDATE_READY,
    IPC_APP_RESET,
    IPC_APP_RELAUNCH,
} from "../core/constants";

type UnsubFn = () => void;

contextBridge.exposeInMainWorld("owlpost", {
    prefs: {
        get: () => ipcRenderer.invoke(IPC_PREFS_GET),

        set: (key: string, value: unknown) => ipcRenderer.invoke(IPC_PREFS_SET, { key, value }),

        onChange: (handler: (key: string, value: unknown) => void): UnsubFn => {
            const listener = (_: IpcRendererEvent, data: { key: string; value: unknown }) => {
                handler(data.key, data.value);
            };
            ipcRenderer.on(IPC_PREFS_CHANGED, listener);
            return () => ipcRenderer.off(IPC_PREFS_CHANGED, listener);
        },
    },

    launchAtLogin: {
        get: () => ipcRenderer.invoke(IPC_LAUNCH_AT_LOGIN_GET),
    },

    crashReportingAvailable: () => ipcRenderer.invoke(IPC_CRASH_REPORTING_AVAIL),

    notificationPermission: () => ipcRenderer.invoke(IPC_NOTIF_PERMISSION_GET),

    update: {
        check: () => ipcRenderer.invoke(IPC_UPDATE_CHECK),
        install: () => ipcRenderer.invoke(IPC_UPDATE_INSTALL),
        pendingVersion: () => ipcRenderer.invoke(IPC_UPDATE_PENDING),

        onDownloading: (handler: (version: string) => void): UnsubFn => {
            const listener = (_: IpcRendererEvent, version: string) => {
                handler(version);
            };
            ipcRenderer.on(IPC_UPDATE_DOWNLOADING, listener);
            return () => ipcRenderer.off(IPC_UPDATE_DOWNLOADING, listener);
        },

        onReady: (handler: (version: string) => void): UnsubFn => {
            const listener = (_: IpcRendererEvent, version: string) => {
                handler(version);
            };
            ipcRenderer.on(IPC_UPDATE_READY, listener);
            return () => ipcRenderer.off(IPC_UPDATE_READY, listener);
        },
    },

    app: {
        reset: () => ipcRenderer.invoke(IPC_APP_RESET),
        relaunch: () => ipcRenderer.invoke(IPC_APP_RELAUNCH),
    },
});
