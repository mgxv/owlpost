import { nativeTheme } from "electron";
import { getPref } from "../core/store";

export function applyNativeTheme(): void {
    nativeTheme.themeSource = getPref("systemTheme");
}
