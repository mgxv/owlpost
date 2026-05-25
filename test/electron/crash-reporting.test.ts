import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
    app: { getAppPath: vi.fn(() => "/nonexistent") },
    crashReporter: { start: vi.fn() },
}));

vi.mock("../../electron/core/logger", () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { dsnToMinidumpUrl, isCrashReportingAvailable } from "../../electron/services/crash-reporting";

describe("dsnToMinidumpUrl", () => {
    it("converts a hosted Sentry DSN to its minidump endpoint", () => {
        expect(dsnToMinidumpUrl("https://abc123@o55.ingest.sentry.io/456")).toBe(
            "https://o55.ingest.sentry.io/api/456/minidump/?sentry_key=abc123",
        );
    });

    it("preserves a path prefix for self-hosted Sentry", () => {
        expect(dsnToMinidumpUrl("https://key@sentry.example.com/path/789")).toBe(
            "https://sentry.example.com/path/api/789/minidump/?sentry_key=key",
        );
    });

    it("preserves a non-default port", () => {
        expect(dsnToMinidumpUrl("https://key@localhost:9000/2")).toBe(
            "https://localhost:9000/api/2/minidump/?sentry_key=key",
        );
    });

    it.each([
        ["not a url"],
        [""],
        ["https://o55.ingest.sentry.io/456"], // missing public key
        ["https://key@sentry.io/"], // missing project id
    ])("returns null for an invalid DSN: %o", (dsn) => {
        expect(dsnToMinidumpUrl(dsn)).toBeNull();
    });
});

describe("isCrashReportingAvailable", () => {
    it("is false when no DSN is baked in and SENTRY_DSN is unset", () => {
        const prev = process.env.SENTRY_DSN;
        delete process.env.SENTRY_DSN;
        try {
            expect(isCrashReportingAvailable()).toBe(false);
        } finally {
            if (prev !== undefined) process.env.SENTRY_DSN = prev;
        }
    });
});
