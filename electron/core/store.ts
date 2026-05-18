export type SystemTheme = "light" | "dark" | "system";

export interface Prefs {
    systemTheme: SystemTheme;
    defaultZoom: number;
    showDockBadge: boolean;
    launchAtStartup: boolean;
    crashReporting: boolean;
    notificationsEnabled: boolean;
}

export const DEFAULTS: Prefs = {
    systemTheme: "system",
    defaultZoom: 100,
    showDockBadge: true,
    launchAtStartup: false,
    crashReporting: false,
    notificationsEnabled: false,
};

interface TypedStore {
    get<K extends keyof Prefs>(key: K): Prefs[K];
    set<K extends keyof Prefs>(key: K, value: Prefs[K]): void;
}

let _store: TypedStore;

// electron-store v11 is ESM-only; loaded via dynamic import inside whenReady().
// Must be awaited before any getPref or setPref call.
export async function initStore(): Promise<void> {
    const { default: Store } = await import("electron-store");
    _store = new Store<Prefs>({ name: "preferences", defaults: DEFAULTS });
}

export function getPrefs(): Prefs {
    return {
        systemTheme: _store.get("systemTheme"),
        defaultZoom: _store.get("defaultZoom"),
        showDockBadge: _store.get("showDockBadge"),
        launchAtStartup: _store.get("launchAtStartup"),
        crashReporting: _store.get("crashReporting"),
        notificationsEnabled: _store.get("notificationsEnabled"),
    };
}

export function getPref<K extends keyof Prefs>(key: K): Prefs[K] {
    return _store.get(key);
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
    _store.set(key, value);
}
