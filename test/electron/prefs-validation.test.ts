import { describe, it, expect } from "vitest";
import { isValidPrefValue } from "../../electron/core/prefs-validation";

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
        // Note: the validator's accepted range (50–150) is intentionally wider than
        // the UI options (80–120) and the runtime clamp in windows/gmail.ts.
        it.each([50, 80, 100, 120, 150])("accepts in-range %i", (v) => {
            expect(isValidPrefValue("defaultZoom", v)).toBe(true);
        });

        it.each([49, 151, 0, -100, 1000])("rejects out-of-range %i", (v) => {
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
