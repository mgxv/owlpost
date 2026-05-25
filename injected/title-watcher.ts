/// <reference path="./global.d.ts" />
import { isInboxListView, extractUnreadCount, looksLikeUnknownCount, redactEmail } from "./title-parser";

(function () {
    try {
        if (!window.__owlpost__) return;
        const owl = window.__owlpost__;

        owl.onReady(() => {
            let lastCount = -1;
            let warnedFormat = false;

            function readCount(): number | null {
                if (!isInboxListView(location.hash || "")) return null;
                const title = document.title || "";
                const n = extractUnreadCount(title);
                if (n !== null) return n;
                if (!warnedFormat && looksLikeUnknownCount(title)) {
                    warnedFormat = true;
                    owl.emit("title-format-unknown", redactEmail(title));
                }
                return 0;
            }

            function tick(): void {
                const count = readCount();
                if (count !== null && count !== lastCount) {
                    lastCount = count;
                    owl.emit("unread-count", count);
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
