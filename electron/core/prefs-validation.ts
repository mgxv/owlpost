import type { Prefs } from "./store";

// Guards against a compromised renderer sending arbitrary pref values.
export function isValidPrefValue(key: keyof Prefs, value: unknown): boolean {
    switch (key) {
        case "systemTheme":
            return value === "light" || value === "dark" || value === "system";
        case "defaultZoom":
            return typeof value === "number" && Number.isFinite(value) && value >= 50 && value <= 150;
        case "showDockBadge":
        case "launchAtStartup":
        case "crashReporting":
        case "notificationsEnabled":
            return typeof value === "boolean";
    }
}
