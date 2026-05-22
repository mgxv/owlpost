import { isDev } from "../env";
import type { SystemTheme } from "../usePreferences";

const ZOOM_OPTIONS = [80, 85, 90, 95, 100, 105, 110, 115, 120] as const;

interface Props {
    systemTheme: SystemTheme;
    setSystemTheme: (v: SystemTheme) => void;
    defaultZoom: number;
    setDefaultZoom: (v: number) => void;
}

export default function AppearanceTab({ systemTheme, setSystemTheme, defaultZoom, setDefaultZoom }: Props) {
    async function handleResetWindowStates() {
        const ok = window.confirm(
            "This will reset the Gmail and compose windows to their default size and position. Your session and preferences will not be affected.",
        );
        if (!ok) return;
        await window.owlpost.app.resetWindowStates();
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-start justify-center">
                <div className="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-4">
                    <label htmlFor="pref-theme" className="text-right">
                        System theme
                    </label>
                    <select
                        id="pref-theme"
                        value={systemTheme}
                        onChange={(e) => {
                            setSystemTheme(e.target.value as SystemTheme);
                        }}
                        className="rounded border border-neutral-300 bg-white px-2 py-1 text-[13px] dark:border-neutral-700 dark:bg-neutral-800"
                    >
                        <option value="system">System</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>

                    <label htmlFor="pref-zoom" className="text-right">
                        Default zoom
                    </label>
                    <select
                        id="pref-zoom"
                        value={defaultZoom}
                        onChange={(e) => {
                            setDefaultZoom(Number(e.target.value));
                        }}
                        className="rounded border border-neutral-300 bg-white px-2 py-1 text-[13px] dark:border-neutral-700 dark:bg-neutral-800"
                    >
                        {ZOOM_OPTIONS.map((z) => (
                            <option key={z} value={z}>
                                {z}%
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-center pt-4">
                <button
                    type="button"
                    onClick={() => void handleResetWindowStates()}
                    disabled={isDev}
                    className="rounded border border-neutral-300 bg-white px-2 py-1 text-[13px] hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                    Reset window positions
                </button>
            </div>
        </div>
    );
}
