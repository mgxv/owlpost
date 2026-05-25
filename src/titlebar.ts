import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLongLeftIcon, ArrowLongRightIcon, Cog6ToothIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { createRendererLog, installGlobalHandlers } from "./log";

declare global {
    interface Window {
        tb: {
            goBack(): void;
            goForward(): void;
            openPrefs(): void;
            openFind(): void;
            onUpdate(fn: (s: { canGoBack: boolean; canGoForward: boolean; title: string }) => void): () => void;
            log: (level: "warn" | "error", message: string, detail?: string) => void;
        };
    }
}

installGlobalHandlers(createRendererLog(window.tb.log));

const back = document.getElementById("back") as HTMLButtonElement;
const fwd = document.getElementById("fwd") as HTMLButtonElement;
const find = document.getElementById("find") as HTMLButtonElement;
const prefs = document.getElementById("prefs") as HTMLButtonElement;
const titleEl = document.getElementById("title") as HTMLParagraphElement;

createRoot(back).render(createElement(ArrowLongLeftIcon, { width: 14, height: 14 }));
createRoot(fwd).render(createElement(ArrowLongRightIcon, { width: 14, height: 14 }));
createRoot(find).render(createElement(MagnifyingGlassIcon, { width: 14, height: 14 }));
createRoot(prefs).render(createElement(Cog6ToothIcon, { width: 14, height: 14 }));

back.addEventListener("click", () => {
    window.tb.goBack();
});
fwd.addEventListener("click", () => {
    window.tb.goForward();
});
find.addEventListener("click", () => {
    window.tb.openFind();
});
prefs.addEventListener("click", () => {
    window.tb.openPrefs();
});

window.tb.onUpdate(({ canGoBack, canGoForward, title }) => {
    back.disabled = !canGoBack;
    fwd.disabled = !canGoForward;
    titleEl.textContent = title || "Gmail";
});
