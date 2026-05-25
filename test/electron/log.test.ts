import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({ ipcMain: { on: vi.fn() } }));
vi.mock("../../electron/core/logger", () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { formatRendererLog } from "../../electron/ipc/log";

describe("formatRendererLog", () => {
    it("formats an error with source and detail", () => {
        expect(formatRendererLog({ source: "prefs", level: "error", message: "boom", detail: "stack" })).toEqual({
            level: "error",
            line: "[renderer:prefs] boom — stack",
        });
    });

    it("formats a warning without detail", () => {
        expect(formatRendererLog({ source: "titlebar", level: "warn", message: "heads up" })).toEqual({
            level: "warn",
            line: "[renderer:titlebar] heads up",
        });
    });

    it("defaults an unknown level to warn", () => {
        expect(formatRendererLog({ source: "prefs", level: "info", message: "x" })?.level).toBe("warn");
        expect(formatRendererLog({ source: "prefs", message: "x" })?.level).toBe("warn");
    });

    it("defaults a missing source to 'renderer'", () => {
        expect(formatRendererLog({ level: "error", message: "x" })?.line).toBe("[renderer:renderer] x");
    });

    it.each([[null], [undefined], [42], ["string"], [{}], [{ message: "" }], [{ message: 123 }]])(
        "returns null for an unusable payload: %o",
        (msg) => {
            expect(formatRendererLog(msg)).toBeNull();
        },
    );

    it("clamps an over-long message and detail", () => {
        const out = formatRendererLog({
            source: "prefs",
            level: "error",
            message: "m".repeat(1000),
            detail: "d".repeat(8000),
        });
        expect(out).not.toBeNull();
        // 500 char message + " — " + 4000 char detail, plus the "[renderer:prefs] " prefix.
        expect(out?.line.length).toBe("[renderer:prefs] ".length + 500 + " — ".length + 4000);
    });

    it("clamps an over-long source", () => {
        const out = formatRendererLog({ source: "s".repeat(100), level: "warn", message: "x" });
        expect(out?.line).toBe(`[renderer:${"s".repeat(32)}] x`);
    });
});
