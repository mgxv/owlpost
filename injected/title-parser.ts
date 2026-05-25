const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const UNREAD_RE = /\(([\d,]+)\)/;

// Gmail only shows an unread count in the title while an inbox list view is active.
export function isInboxListView(hash: string): boolean {
    const h = hash || "";
    if (h === "" || h === "#" || h === "#inbox") return true;
    if (h.startsWith("#inbox?")) return true;
    return /^#inbox\/p\d+(?:\?|$)/.test(h);
}

export function extractUnreadCount(title: string): number | null {
    const m = title.match(UNREAD_RE);
    if (!m) return null;
    const [, value = "0"] = m;
    const n = parseInt(value.replace(/,/g, ""), 10);
    return Number.isNaN(n) ? 0 : n;
}

export function looksLikeUnknownCount(title: string): boolean {
    return /\d/.test(title.replace(EMAIL_RE, ""));
}

export function redactEmail(title: string): string {
    return title.replace(EMAIL_RE, "<email>");
}
