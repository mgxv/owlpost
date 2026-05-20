import { useEffect, useState } from "react";
import { isDev } from "../env";

interface Props {
    crashReporting: boolean;
    setCrashReporting: (v: boolean) => void;
}

export default function AdvancedTab({ crashReporting, setCrashReporting }: Props) {
    const [crashReportingAvailable, setCrashReportingAvailable] = useState(true);
    const [pendingUpdate, setPendingUpdate] = useState(false);

    useEffect(() => {
        window.owlpost
            .crashReportingAvailable()
            .then(setCrashReportingAvailable)
            .catch(() => {
                setCrashReportingAvailable(false);
            });

        window.owlpost.update
            .pendingVersion()
            .then((v) => {
                setPendingUpdate(!!v);
            })
            .catch(() => undefined);

        const unsub = window.owlpost.update.onReady(() => {
            setPendingUpdate(true);
        });
        return unsub;
    }, []);

    async function handleReset() {
        const ok = window.confirm(
            "This will delete all session data, cookies, cache, and reset all settings " +
                "to defaults. You will need to sign in to Gmail again.",
        );
        if (!ok) return;
        await window.owlpost.app.reset();
    }

    async function handleRelaunch() {
        const msg = pendingUpdate
            ? "Owlpost will restart and install the pending update."
            : "Owlpost will restart immediately.";
        const ok = window.confirm(msg);
        if (!ok) return;
        if (pendingUpdate) {
            await window.owlpost.update.install();
        } else {
            await window.owlpost.app.relaunch();
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex justify-center">
                <div className="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-4">
                    <input
                        id="pref-crash-reporting"
                        type="checkbox"
                        checked={crashReporting && crashReportingAvailable}
                        onChange={(e) => {
                            setCrashReporting(e.target.checked);
                        }}
                        disabled={!crashReportingAvailable}
                        className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                    />
                    <label
                        htmlFor="pref-crash-reporting"
                        className={!crashReportingAvailable ? "text-neutral-500" : ""}
                    >
                        Share anonymous crash reports
                    </label>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-center gap-2 pt-4">
                <button
                    type="button"
                    onClick={() => void handleReset()}
                    disabled={isDev}
                    className="rounded border border-red-300 bg-white px-2 py-1 text-[13px] text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                    Reset app
                </button>
                <button
                    type="button"
                    onClick={() => void handleRelaunch()}
                    disabled={isDev}
                    className="rounded border border-neutral-300 bg-white px-2 py-1 text-[13px] hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                    Restart now
                </button>
            </div>
        </div>
    );
}
