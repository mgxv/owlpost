import { useEffect, useState } from "react";
import type { Prefs } from "./preload.d";
import { DEFAULTS } from "../electron/core/prefs";

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
    const [systemTheme, setSystemThemeState] = useState<SystemTheme>(DEFAULTS.systemTheme);
    const [defaultZoom, setDefaultZoomState] = useState(DEFAULTS.defaultZoom);
    const [showDockBadge, setShowDockBadgeState] = useState(DEFAULTS.showDockBadge);
    const [launchAtStartup, setLaunchAtStartupState] = useState(DEFAULTS.launchAtStartup);
    const [crashReporting, setCrashReportingState] = useState(DEFAULTS.crashReporting);
    const [notificationsEnabled, setNotificationsEnabledState] = useState(DEFAULTS.notificationsEnabled);
    useEffect(() => {
        let cancelled = false as boolean;

        const unsubChange = window.owlpost.prefs.onChange((key, value) => {
            switch (key) {
                case "systemTheme":
                    setSystemThemeState(value as SystemTheme);
                    break;
                case "defaultZoom":
                    setDefaultZoomState(value as number);
                    break;
                case "showDockBadge":
                    setShowDockBadgeState(value as boolean);
                    break;
                case "launchAtStartup":
                    setLaunchAtStartupState(value as boolean);
                    break;
                case "crashReporting":
                    setCrashReportingState(value as boolean);
                    break;
                case "notificationsEnabled":
                    setNotificationsEnabledState(value as boolean);
                    break;
            }
        });

        void (async () => {
            try {
                const prefs = await window.owlpost.prefs.get();

                const actualLaunchAtStartup = await window.owlpost.launchAtLogin
                    .get()
                    .catch(() => prefs.launchAtStartup);

                if (actualLaunchAtStartup !== prefs.launchAtStartup) {
                    await window.owlpost.prefs.set("launchAtStartup", actualLaunchAtStartup);
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
            unsubChange();
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
        setSystemTheme: makeSetter("systemTheme", setSystemThemeState),
        defaultZoom,
        setDefaultZoom: makeSetter("defaultZoom", setDefaultZoomState),
        showDockBadge,
        setShowDockBadge: makeSetter("showDockBadge", setShowDockBadgeState),
        launchAtStartup,
        setLaunchAtStartup: makeSetter("launchAtStartup", setLaunchAtStartupState),
        crashReporting,
        setCrashReporting: makeSetter("crashReporting", setCrashReportingState),
        notificationsEnabled,
        setNotificationsEnabled: makeSetter("notificationsEnabled", setNotificationsEnabledState),
    };
}
