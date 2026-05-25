export interface Prefs {
    systemTheme: "light" | "dark" | "system";
    defaultZoom: number;
    showDockBadge: boolean;
    launchAtStartup: boolean;
    crashReporting: boolean;
    notificationsEnabled: boolean;
}

export const DEFAULTS: Prefs = {
    systemTheme: "system",
    defaultZoom: 100,
    showDockBadge: true,
    launchAtStartup: false,
    crashReporting: false,
    notificationsEnabled: false,
};

export const ZOOM_MIN = 80;
export const ZOOM_MAX = 120;
export const ZOOM_STEP = 5;

export const ZOOM_OPTIONS: number[] = Array.from(
    { length: Math.floor((ZOOM_MAX - ZOOM_MIN) / ZOOM_STEP) + 1 },
    (_, i) => ZOOM_MIN + i * ZOOM_STEP,
);

// Guards against a compromised renderer sending arbitrary pref values.
export function isValidPrefValue(key: keyof Prefs, value: unknown): boolean {
    switch (key) {
        case "systemTheme":
            return value === "light" || value === "dark" || value === "system";
        case "defaultZoom":
            return typeof value === "number" && Number.isFinite(value) && value >= ZOOM_MIN && value <= ZOOM_MAX;
        case "showDockBadge":
        case "launchAtStartup":
        case "crashReporting":
        case "notificationsEnabled":
            return typeof value === "boolean";
    }
}
