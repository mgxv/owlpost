import { useEffect, useState } from "react";
import type { Prefs } from "./preload.d";

const KEY_THEME = "systemTheme" as const;
const KEY_DEFAULT_ZOOM = "defaultZoom" as const;
const KEY_SHOW_DOCK_BADGE = "showDockBadge" as const;
const KEY_LAUNCH_AT_STARTUP = "launchAtStartup" as const;
const KEY_CRASH_REPORTING = "crashReporting" as const;
const KEY_NOTIFICATIONS_ENABLED = "notificationsEnabled" as const;

export type SystemTheme = Prefs["systemTheme"];

type UsePreferences = Prefs & {
    setSystemTheme: (v: SystemTheme) => void;
    setDefaultZoom: (v: number) => void;
    setShowDockBadge: (v: boolean) => void;
    setLaunchAtStartup: (v: boolean) => void;
    setCrashReporting: (v: boolean) => void;
    setNotificationsEnabled: (v: boolean) => void;
};

export function usePreferences(): UsePreferences {
    const [systemTheme, setSystemThemeState] = useState<SystemTheme>("system");
    const [defaultZoom, setDefaultZoomState] = useState(100);
    const [showDockBadge, setShowDockBadgeState] = useState(true);
    const [launchAtStartup, setLaunchAtStartupState] = useState(false);
    const [crashReporting, setCrashReportingState] = useState(false);
    const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
    useEffect(() => {
        let cancelled = false as boolean;

        void (async () => {
            try {
                const prefs = await window.owlpost.prefs.get();

                const actualLaunchAtStartup = await window.owlpost.launchAtLogin
                    .get()
                    .catch(() => prefs.launchAtStartup);

                if (actualLaunchAtStartup !== prefs.launchAtStartup) {
                    await window.owlpost.prefs.set(KEY_LAUNCH_AT_STARTUP, actualLaunchAtStartup);
                }

                if (cancelled) return;
                setSystemThemeState(prefs.systemTheme);
                setDefaultZoomState(prefs.defaultZoom);
                setShowDockBadgeState(prefs.showDockBadge);
                setLaunchAtStartupState(actualLaunchAtStartup);
                setCrashReportingState(prefs.crashReporting);
                setNotificationsEnabledState(prefs.notificationsEnabled);
            } catch (e) {
                console.error("Failed to load preferences:", e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    function makeSetter<K extends keyof Prefs>(key: K, localSetter: (v: Prefs[K]) => void): (v: Prefs[K]) => void {
        return (value: Prefs[K]) => {
            localSetter(value);
            void window.owlpost.prefs.set(key, value);
        };
    }

    return {
        systemTheme,
        setSystemTheme: makeSetter(KEY_THEME, setSystemThemeState),
        defaultZoom,
        setDefaultZoom: makeSetter(KEY_DEFAULT_ZOOM, setDefaultZoomState),
        showDockBadge,
        setShowDockBadge: makeSetter(KEY_SHOW_DOCK_BADGE, setShowDockBadgeState),
        launchAtStartup,
        setLaunchAtStartup: makeSetter(KEY_LAUNCH_AT_STARTUP, setLaunchAtStartupState),
        crashReporting,
        setCrashReporting: makeSetter(KEY_CRASH_REPORTING, setCrashReportingState),
        notificationsEnabled,
        setNotificationsEnabled: makeSetter(KEY_NOTIFICATIONS_ENABLED, setNotificationsEnabledState),
    };
}
