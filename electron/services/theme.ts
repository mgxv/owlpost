import { nativeTheme } from "electron";
import { getPref } from "../core/store";

export function applyNativeTheme(): void {
    const t = getPref("systemTheme");
    nativeTheme.themeSource = t === "light" ? "light" : t === "dark" ? "dark" : "system";
}
