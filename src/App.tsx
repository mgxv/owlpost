import { useEffect, useState } from "react";
import { Cog6ToothIcon, SwatchIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

import { usePreferences } from "./usePreferences";
import GeneralTab from "./components/GeneralTab";
import AppearanceTab from "./components/AppearanceTab";
import AdvancedTab from "./components/AdvancedTab";

type TabId = "general" | "appearance" | "advanced";

const TABS: { id: TabId; label: string; Icon: typeof Cog6ToothIcon }[] = [
    { id: "general", label: "General", Icon: Cog6ToothIcon },
    { id: "appearance", label: "Appearance", Icon: SwatchIcon },
    { id: "advanced", label: "Advanced", Icon: WrenchScrewdriverIcon },
];

export default function App() {
    const [activeTab, setActiveTab] = useState<TabId>("general");

    const {
        systemTheme,
        setSystemTheme,
        defaultZoom,
        setDefaultZoom,
        showDockBadge,
        setShowDockBadge,
        launchAtStartup,
        setLaunchAtStartup,
        crashReporting,
        setCrashReporting,
        notificationsEnabled,
        setNotificationsEnabled,
    } = usePreferences();

    // Apply native dark/light class based on the theme pref
    useEffect(() => {
        const html = document.documentElement;
        const apply = (isDark: boolean) => {
            html.classList.toggle("dark", isDark);
            html.style.colorScheme = isDark ? "dark" : "light";
        };
        if (systemTheme === "light") {
            apply(false);
            return;
        }
        if (systemTheme === "dark") {
            apply(true);
            return;
        }
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        apply(media.matches);
        const handler = (e: MediaQueryListEvent) => {
            apply(e.matches);
        };
        media.addEventListener("change", handler);
        return () => {
            media.removeEventListener("change", handler);
        };
    }, [systemTheme]);

    return (
        <div className="flex h-screen flex-col bg-neutral-100 font-[system-ui] text-[13px] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
            <header className="drag relative border-b border-neutral-200/80 bg-neutral-100 dark:border-neutral-700/80 dark:bg-neutral-900">
                <div className="relative flex h-[38px] items-center justify-center">
                    <p className="pointer-events-none text-[12px] font-medium text-neutral-600 dark:text-neutral-300">
                        {TABS.find((t) => t.id === activeTab)?.label ?? "Preferences"}
                    </p>
                </div>
                <nav className="no-drag flex justify-center gap-1 px-4 pb-2 pt-1">
                    {TABS.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            className={`no-drag flex w-22 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-300 ${
                                activeTab === id
                                    ? "bg-neutral-200/60 dark:bg-neutral-700/60"
                                    : "hover:bg-neutral-200/40 dark:hover:bg-neutral-700/40"
                            }`}
                            onClick={() => {
                                setActiveTab(id);
                            }}
                        >
                            <Icon className="h-6 w-6" />
                            <span className="text-[11px] leading-none">{label}</span>
                        </button>
                    ))}
                </nav>
            </header>

            <section className="flex-1 overflow-auto space-y-4 px-6 py-5">
                {activeTab === "general" && (
                    <GeneralTab
                        notificationsEnabled={notificationsEnabled}
                        setNotificationsEnabled={setNotificationsEnabled}
                        showDockBadge={showDockBadge}
                        setShowDockBadge={setShowDockBadge}
                        launchAtStartup={launchAtStartup}
                        setLaunchAtStartup={setLaunchAtStartup}
                    />
                )}
                {activeTab === "appearance" && (
                    <AppearanceTab
                        systemTheme={systemTheme}
                        setSystemTheme={setSystemTheme}
                        defaultZoom={defaultZoom}
                        setDefaultZoom={setDefaultZoom}
                    />
                )}
                {activeTab === "advanced" && (
                    <AdvancedTab crashReporting={crashReporting} setCrashReporting={setCrashReporting} />
                )}
            </section>
        </div>
    );
}
