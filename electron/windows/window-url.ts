// extsrc=mailto tells Gmail to parse the full URI itself (recipient, subject, body).
export function parseMailtoUrl(mailtoUrl: string): string {
    const compose = new URL("https://mail.google.com/mail/");
    compose.searchParams.set("extsrc", "mailto");
    compose.searchParams.set("url", mailtoUrl);
    return compose.toString();
}

// Returns the Gmail account index from a /mail/u/<n> path, or null if absent/malformed.
export function extractAccount(url: string): string | null {
    try {
        return new URL(url).pathname.match(/^\/mail\/u\/(\d+)/)?.[1] ?? null;
    } catch {
        return null;
    }
}
