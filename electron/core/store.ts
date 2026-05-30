import { DEFAULTS, type Prefs } from "./prefs";

export { DEFAULTS };
export type { Prefs };

let _store: {
    get<K extends keyof Prefs>(key: K): Prefs[K];
    set<K extends keyof Prefs>(key: K, value: Prefs[K]): void;
};

// electron-store v11 is ESM-only; loaded via dynamic import inside whenReady().
// Must be awaited before any getPref or setPref call.
export async function initStore(): Promise<void> {
    const { default: Store } = await import("electron-store");
    _store = new Store<Prefs>({ name: "preferences", defaults: DEFAULTS });
}

export function getPrefs(): Prefs {
    const prefs = {} as Prefs;
    for (const key of Object.keys(DEFAULTS) as (keyof Prefs)[]) {
        prefs[key] = _store.get(key) as never;
    }
    return prefs;
}

export function getPref<K extends keyof Prefs>(key: K): Prefs[K] {
    return _store.get(key);
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
    _store.set(key, value);
}
