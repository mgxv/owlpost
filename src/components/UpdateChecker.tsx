import { useEffect, useState } from "react";
import { log } from "../log";

type UpdateState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "up-to-date" }
    | { status: "downloading"; version: string }
    | { status: "ready"; version: string }
    | { status: "error"; message: string };

export default function UpdateChecker() {
    const [state, setState] = useState<UpdateState>({ status: "idle" });

    useEffect(() => {
        let cancelled = false as boolean;

        // Restore ready state if a download completed in a previous check session.
        window.owlpost.update
            .pendingVersion()
            .then((version) => {
                if (!cancelled && version) setState({ status: "ready", version });
            })
            .catch((e: unknown) => {
                log.warn("[update] pendingVersion check failed", e);
            });

        // Background download started (auto-check on startup, or manual check found an update).
        const unsubDownloading = window.owlpost.update.onDownloading((version) => {
            if (!cancelled) setState({ status: "downloading", version });
        });

        // Background download finished.
        const unsubReady = window.owlpost.update.onReady((version) => {
            if (!cancelled) setState({ status: "ready", version });
        });

        return () => {
            cancelled = true;
            unsubDownloading();
            unsubReady();
        };
    }, []);

    async function checkForUpdates() {
        setState({ status: "checking" });
        try {
            await window.owlpost.update.check();
            // Only fall back to up-to-date if onDownloading hasn't already moved us forward.
            setState((s) => (s.status === "checking" ? { status: "up-to-date" } : s));
        } catch (e) {
            setState({ status: "error", message: String(e) });
        }
    }

    const isDisabled = state.status === "checking" || state.status === "downloading";

    const message =
        state.status === "downloading"
            ? `Downloading v${state.version}…`
            : state.status === "ready"
              ? `v${state.version} ready — restart to install`
              : state.status === "up-to-date"
                ? "You're on the latest version."
                : state.status === "error"
                  ? state.message
                  : null;

    const buttonLabel =
        state.status === "checking"
            ? "Checking…"
            : state.status === "downloading"
              ? "Downloading…"
              : state.status === "ready"
                ? "Restart to update"
                : "Check for updates";

    return (
        <div className="mt-auto flex flex-col items-center gap-1 pt-4">
            {message && (
                <p
                    className={`text-[11px] ${
                        state.status === "error"
                            ? "text-red-600 dark:text-red-400"
                            : "text-neutral-500 dark:text-neutral-400"
                    }`}
                >
                    {message}
                </p>
            )}
            <button
                type="button"
                onClick={() => {
                    if (state.status === "ready") {
                        void window.owlpost.update.install();
                    } else {
                        void checkForUpdates();
                    }
                }}
                disabled={isDisabled}
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-[13px] hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            >
                {buttonLabel}
            </button>
        </div>
    );
}
