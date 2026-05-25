import { describe, it, expect } from "vitest";
import { isValidPrefValue, ZOOM_OPTIONS, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "../../electron/core/prefs";

describe("isValidPrefValue", () => {
    describe("systemTheme", () => {
        it.each(["light", "dark", "system"])("accepts %s", (v) => {
            expect(isValidPrefValue("systemTheme", v)).toBe(true);
        });

        it.each([["blue"], [123], [null], [undefined], [true], [{}]])("rejects %o", (v) => {
            expect(isValidPrefValue("systemTheme", v)).toBe(false);
        });
    });

    describe("defaultZoom", () => {
        it.each([80, 100, 120])("accepts in-range %i", (v) => {
            expect(isValidPrefValue("defaultZoom", v)).toBe(true);
        });

        it.each([79, 121, 50, 150, 0, -100])("rejects out-of-range %i", (v) => {
            expect(isValidPrefValue("defaultZoom", v)).toBe(false);
        });

        it.each([[NaN], [Infinity], [-Infinity], ["100"], [null], [true]])("rejects non-finite/non-number %o", (v) => {
            expect(isValidPrefValue("defaultZoom", v)).toBe(false);
        });
    });

    describe.each(["showDockBadge", "launchAtStartup", "crashReporting", "notificationsEnabled"] as const)(
        "%s (boolean)",
        (key) => {
            it.each([true, false])("accepts %s", (v) => {
                expect(isValidPrefValue(key, v)).toBe(true);
            });

            it.each([["true"], [0], [1], [null], [undefined], [{}]])("rejects %o", (v) => {
                expect(isValidPrefValue(key, v)).toBe(false);
            });
        },
    );
});

describe("zoom bounds are a single source of truth", () => {
    it("derives ZOOM_OPTIONS from the bounds and step", () => {
        expect(ZOOM_OPTIONS).toEqual([80, 85, 90, 95, 100, 105, 110, 115, 120]);
        expect(ZOOM_OPTIONS[0]).toBe(ZOOM_MIN);
        expect(ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]).toBe(ZOOM_MAX);
        expect(ZOOM_STEP).toBeGreaterThan(0);
    });

    it("accepts every dropdown option as a valid defaultZoom", () => {
        for (const z of ZOOM_OPTIONS) {
            expect(isValidPrefValue("defaultZoom", z)).toBe(true);
        }
    });

    it("rejects values just outside the bounds the UI offers", () => {
        expect(isValidPrefValue("defaultZoom", ZOOM_MIN - 1)).toBe(false);
        expect(isValidPrefValue("defaultZoom", ZOOM_MAX + 1)).toBe(false);
    });
});
