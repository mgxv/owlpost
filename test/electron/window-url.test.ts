import { describe, it, expect } from "vitest";
import { parseMailtoUrl, extractAccount } from "../../electron/windows/window-url";

describe("parseMailtoUrl", () => {
    it("wraps the mailto URI in Gmail's extsrc=mailto compose URL", () => {
        const result = parseMailtoUrl("mailto:alice@example.com");
        const url = new URL(result);
        expect(url.origin).toBe("https://mail.google.com");
        expect(url.pathname).toBe("/mail/");
        expect(url.searchParams.get("extsrc")).toBe("mailto");
        expect(url.searchParams.get("url")).toBe("mailto:alice@example.com");
    });

    it("round-trips a mailto URI carrying subject and body without losing data", () => {
        const mailto = "mailto:bob@example.com?subject=Hello%20World&body=Line%201%0ALine%202&cc=carol@example.com";
        const url = new URL(parseMailtoUrl(mailto));
        // The original URI is preserved verbatim in the url param for Gmail to parse.
        expect(url.searchParams.get("url")).toBe(mailto);
    });

    it("handles a bare mailto with no recipient", () => {
        const url = new URL(parseMailtoUrl("mailto:"));
        expect(url.searchParams.get("url")).toBe("mailto:");
        expect(url.searchParams.get("extsrc")).toBe("mailto");
    });
});

describe("extractAccount", () => {
    it.each([
        ["https://mail.google.com/mail/u/0/#inbox", "0"],
        ["https://mail.google.com/mail/u/1/#inbox", "1"],
        ["https://mail.google.com/mail/u/12/#search/foo", "12"],
        ["https://mail.google.com/mail/u/0", "0"],
    ])("extracts the account index from %s", (url, expected) => {
        expect(extractAccount(url)).toBe(expected);
    });

    it.each([
        ["https://mail.google.com/mail/#inbox"],
        ["https://accounts.google.com/ServiceLogin"],
        ["https://mail.google.com/chat/u/0/"],
    ])("returns null when there is no /mail/u/<n> segment: %s", (url) => {
        expect(extractAccount(url)).toBeNull();
    });

    it("returns null for a malformed URL", () => {
        expect(extractAccount("not a url")).toBeNull();
        expect(extractAccount("")).toBeNull();
    });
});
