import { describe, it, expect } from "vitest";
import { isInboxListView, extractUnreadCount, looksLikeUnknownCount, redactEmail } from "../../injected/title-parser";

describe("isInboxListView", () => {
    it.each(["", "#", "#inbox", "#inbox?compose=new", "#inbox/p2", "#inbox/p10?foo=bar"])(
        "treats %o as an inbox list view",
        (hash) => {
            expect(isInboxListView(hash)).toBe(true);
        },
    );

    it.each(["#sent", "#search/foo", "#label/Work", "#settings/general", "#inboxx", "#inbox/p", "#inbox/foo"])(
        "treats %o as NOT an inbox list view",
        (hash) => {
            expect(isInboxListView(hash)).toBe(false);
        },
    );
});

describe("extractUnreadCount", () => {
    it.each([
        ["Inbox (5) - alice@example.com - Gmail", 5],
        ["Inbox (1,234) - alice@example.com", 1234],
        ["(0)", 0],
        ["(12) (34) leftover", 12],
    ])("parses %o → %i", (title, expected) => {
        expect(extractUnreadCount(title)).toBe(expected);
    });

    it.each(["Gmail", "Inbox - alice@example.com", "(abc)", "no count here"])(
        "returns null when there is no parenthesised count: %o",
        (title) => {
            expect(extractUnreadCount(title)).toBeNull();
        },
    );
});

describe("looksLikeUnknownCount", () => {
    it.each(["Inbox 5 messages - a@b.com", "5 unread", "Gmail 2026"])(
        "flags %o (digit remains after removing email)",
        (title) => {
            expect(looksLikeUnknownCount(title)).toBe(true);
        },
    );

    it.each(["Inbox - alice@example.com", "alice@example.com", "Gmail", ""])(
        "does not flag %o (no stray digit)",
        (title) => {
            expect(looksLikeUnknownCount(title)).toBe(false);
        },
    );
});

describe("redactEmail", () => {
    it("replaces an email address with <email>", () => {
        expect(redactEmail("Inbox (5) - alice@example.com")).toBe("Inbox (5) - <email>");
    });

    it("leaves a title without an email untouched", () => {
        expect(redactEmail("Inbox (5) - Gmail")).toBe("Inbox (5) - Gmail");
    });
});
