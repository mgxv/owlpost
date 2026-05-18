/// <reference path="./global.d.ts" />
(function () {
    try {
        if (!window.__owlpost__) return;
        const owl = window.__owlpost__;

        owl.onReady(() => {
            const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
            const UNREAD_RE = /\(([\d,]+)\)/;

            function isInboxListView(): boolean {
                const h = location.hash || "";
                if (h === "" || h === "#" || h === "#inbox") return true;
                if (h.startsWith("#inbox?")) return true;
                return /^#inbox\/p\d+(?:\?|$)/.test(h);
            }

            let lastCount = -1;
            let lastEmail = "";
            let warnedFormat = false;

            function readCount(): number | null {
                if (!isInboxListView()) return null;
                const title = document.title || "";
                const m = title.match(UNREAD_RE);
                if (m) {
                    const [, value = "0"] = m;
                    const n = parseInt(value.replace(/,/g, ""), 10);
                    return Number.isNaN(n) ? 0 : n;
                }
                if (!warnedFormat && /\d/.test(title.replace(EMAIL_RE, ""))) {
                    warnedFormat = true;
                    owl.emit("title-format-unknown", title.replace(EMAIL_RE, "<email>"));
                }
                return 0;
            }

            function readEmail(): string | null {
                const title = document.title || "";
                const m = title.match(EMAIL_RE);
                return m ? m[0] : null;
            }

            function tick(): void {
                const count = readCount();
                if (count !== null && count !== lastCount) {
                    lastCount = count;
                    owl.emit("unread-count", count);
                }
                const email = readEmail();
                if (email && email !== lastEmail) {
                    lastEmail = email;
                    owl.emit("account-email", email);
                }
            }

            const titleEl = document.querySelector("title");
            if (titleEl) {
                new MutationObserver(tick).observe(titleEl, {
                    childList: true,
                    characterData: true,
                    subtree: true,
                });
            }
            window.addEventListener("hashchange", tick);
            tick();
        });
    } catch (e) {
        try {
            window.__owlpost__?.emit("injected-script-error", {
                script: "title-watcher",
                error: String(e),
            });
        } catch {
            /* ignore */
        }
    }
})();
