/// <reference path="./global.d.ts" />
(function () {
    try {
        const owl = window.__owlpost__;
        if (!owl) return;

        owl.onReady(() => {
            function OwlpostNotification(this: Notification, title: string, options?: NotificationOptions) {
                options = options || {};
                window.__owlpost__?.emit("notification", {
                    title,
                    body: options.body ?? "",
                });
                this.close = function () {};
                this.addEventListener = function () {};
                this.removeEventListener = function () {};
                this.onclick = null;
                this.onshow = null;
                this.onclose = null;
                this.onerror = null;
            }

            OwlpostNotification.permission = "granted" as NotificationPermission;
            OwlpostNotification.requestPermission = function () {
                return Promise.resolve("granted" as NotificationPermission);
            };

            Object.defineProperty(window, "Notification", {
                value: OwlpostNotification,
                writable: true,
                configurable: true,
            });

            Object.defineProperty(document, "visibilityState", {
                get: () => "hidden",
                configurable: true,
            });
            Object.defineProperty(document, "hidden", {
                get: () => true,
                configurable: true,
            });
        });
    } catch (e) {
        try {
            window.__owlpost__?.emit("injected-script-error", {
                script: "notifications",
                error: String(e),
            });
        } catch {
            /* ignore */
        }
    }
})();
