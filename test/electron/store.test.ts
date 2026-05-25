import { describe, it, expect, beforeEach, vi } from "vitest";

// Minimal in-memory stand-in for electron-store: seeds from `defaults` and
// supports the typed get/set the store wrapper uses.
vi.mock("electron-store", () => {
    class FakeStore<T extends Record<string, unknown>> {
        private data: T;
        constructor(opts: { defaults: T }) {
            this.data = { ...opts.defaults };
        }
        get<K extends keyof T>(key: K): T[K] {
            return this.data[key];
        }
        set<K extends keyof T>(key: K, value: T[K]): void {
            this.data[key] = value;
        }
    }
    return { default: FakeStore };
});

import { initStore, getPref, setPref, getPrefs, DEFAULTS, type Prefs } from "../../electron/core/store";

describe("DEFAULTS", () => {
    it("defines every preference key with its default value", () => {
        expect(DEFAULTS).toStrictEqual({
            systemTheme: "system",
            defaultZoom: 100,
            showDockBadge: true,
            launchAtStartup: false,
            crashReporting: false,
            notificationsEnabled: false,
        } satisfies Prefs);
    });
});

describe("store wrapper", () => {
    beforeEach(async () => {
        await initStore();
    });

    it("reads defaults before anything is written", () => {
        expect(getPref("defaultZoom")).toBe(100);
        expect(getPref("showDockBadge")).toBe(true);
    });

    it("round-trips a written value through get", () => {
        setPref("defaultZoom", 110);
        setPref("notificationsEnabled", true);
        expect(getPref("defaultZoom")).toBe(110);
        expect(getPref("notificationsEnabled")).toBe(true);
    });

    it("getPrefs returns the full set of keys reflecting writes", () => {
        setPref("systemTheme", "dark");
        expect(getPrefs()).toStrictEqual({
            systemTheme: "dark",
            defaultZoom: 100,
            showDockBadge: true,
            launchAtStartup: false,
            crashReporting: false,
            notificationsEnabled: false,
        } satisfies Prefs);
    });
});
