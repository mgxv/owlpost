import "./titlebar.css";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLongLeftIcon, ArrowLongRightIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

declare global {
    interface Window {
        tb: {
            goBack(): void;
            goForward(): void;
            openPrefs(): void;
            onUpdate(fn: (s: { canGoBack: boolean; canGoForward: boolean; title: string }) => void): void;
        };
    }
}

const back = document.getElementById("back") as HTMLButtonElement;
const fwd = document.getElementById("fwd") as HTMLButtonElement;
const prefs = document.getElementById("prefs") as HTMLButtonElement;

createRoot(back).render(createElement(ArrowLongLeftIcon, { width: 14, height: 14 }));
createRoot(fwd).render(createElement(ArrowLongRightIcon, { width: 14, height: 14 }));
createRoot(prefs).render(createElement(Cog6ToothIcon, { width: 14, height: 14 }));
const titleEl = document.getElementById("title") as HTMLParagraphElement;

back.addEventListener("click", () => {
    window.tb.goBack();
});
fwd.addEventListener("click", () => {
    window.tb.goForward();
});
prefs.addEventListener("click", () => {
    window.tb.openPrefs();
});

window.tb.onUpdate(({ canGoBack, canGoForward, title }) => {
    back.disabled = !canGoBack;
    fwd.disabled = !canGoForward;
    titleEl.textContent = title || "Gmail";
});
