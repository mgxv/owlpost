import { useEffect, useState } from "react";

type UpdateState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "up-to-date" }
    | { status: "available" }
    | { status: "installing" }
    | { status: "ready"; version: string }
    | { status: "error"; message: string };

export default function UpdateChecker() {
    const [state, setState] = useState<UpdateState>({ status: "idle" });

    useEffect(() => {
        let cancelled = false;

        window.owlpost.update
            .pendingVersion()
            .then((version) => {
                if (!cancelled && version) setState({ status: "ready", version });
            })
            .catch((e: unknown) => {
                console.warn("[update] pendingVersion check failed:", e);
            });

        const unsub = window.owlpost.update.onReady((version) => {
            if (!cancelled) setState({ status: "ready", version });
        });

        return () => {
            cancelled = true;
            unsub();
        };
    }, []);

    async function checkForUpdates() {
        setState({ status: "checking" });
        try {
            await window.owlpost.update.check();
            setState((s) => (s.status === "checking" ? { status: "up-to-date" } : s));
        } catch (e) {
            setState({ status: "error", message: String(e) });
        }
    }

    async function installUpdate() {
        setState({ status: "installing" });
        try {
            await window.owlpost.update.install();
        } catch (e) {
            setState({ status: "error", message: String(e) });
        }
    }

    const busy = state.status === "checking" || state.status === "installing";

    const message =
        state.status === "ready"
            ? `v${state.version} installed — restart to apply`
            : state.status === "up-to-date"
              ? "You're on the latest version."
              : state.status === "error"
                ? state.message
                : null;

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
                        void window.owlpost.app.relaunch();
                    } else if (state.status === "available") {
                        void installUpdate();
                    } else {
                        void checkForUpdates();
                    }
                }}
                disabled={busy}
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-[13px] hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            >
                {state.status === "checking" && "Checking…"}
                {state.status === "installing" && "Installing…"}
                {state.status === "ready" && "Restart now"}
                {(state.status === "idle" ||
                    state.status === "up-to-date" ||
                    state.status === "available" ||
                    state.status === "error") &&
                    "Check for updates"}
            </button>
        </div>
    );
}
