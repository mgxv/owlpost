import { describe, it, expect } from "vitest";
import { isOfflineError, describeLoadError } from "../../electron/core/net-errors";

describe("isOfflineError", () => {
    it.each([-7, -21, -105, -106, -109, -118])("treats %i as offline", (code) => {
        expect(isOfflineError(code)).toBe(true);
    });

    it.each([-3, -2, -100, -101, -102, 0, 404])("treats %i as not offline", (code) => {
        expect(isOfflineError(code)).toBe(false);
    });
});

describe("describeLoadError", () => {
    it("returns the offline prompt for offline-class codes, ignoring the raw description", () => {
        expect(describeLoadError(-106, "ERR_INTERNET_DISCONNECTED")).toMatch(/offline/i);
    });

    it("falls back to the raw description for non-offline codes", () => {
        expect(describeLoadError(-102, "ERR_CONNECTION_REFUSED")).toBe("ERR_CONNECTION_REFUSED");
    });

    it("supplies a generic message when the description is empty", () => {
        expect(describeLoadError(-102, "")).toBe("Something went wrong while loading Gmail.");
    });
});
