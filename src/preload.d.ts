import type { Prefs } from "../electron/core/prefs";
export type { Prefs };

type UnsubFn = () => void;

interface OwlpostAPI {
    prefs: {
        get: () => Promise<Prefs>;
        set: (key: keyof Prefs, value: unknown) => Promise<void>;
        onChange: (handler: (key: string, value: unknown) => void) => UnsubFn;
    };
    launchAtLogin: {
        get: () => Promise<boolean>;
    };
    crashReportingAvailable: () => Promise<boolean>;
    notificationPermission: () => Promise<boolean>;
    update: {
        check: () => Promise<void>;
        install: () => Promise<void>;
        pendingVersion: () => Promise<string | null>;
        onDownloading: (handler: (version: string) => void) => UnsubFn;
        onReady: (handler: (version: string) => void) => UnsubFn;
    };
    app: {
        reset: () => Promise<void>;
        relaunch: () => Promise<void>;
        resetWindowStates: () => Promise<void>;
    };
}

declare global {
    interface Window {
        owlpost: OwlpostAPI;
        __owlpost__: {
            onReady: (fn: () => void) => void;
            emit: (name: string, payload: unknown) => void;
        };
    }
}
