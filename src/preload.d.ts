export interface Prefs {
    systemTheme: "light" | "dark" | "system";
    defaultZoom: number;
    showDockBadge: boolean;
    launchAtStartup: boolean;
    crashReporting: boolean;
    notificationsEnabled: boolean;
}

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
        onReady: (handler: (version: string) => void) => UnsubFn;
    };
    app: {
        reset: () => Promise<void>;
        relaunch: () => Promise<void>;
    };
}

declare global {
    interface Window {
        owlpost: OwlpostAPI;
        __owlpost__: {
            EMAIL_RE: RegExp;
            onReady: (fn: () => void) => void;
            emit: (name: string, payload: unknown) => void;
        };
    }
}
