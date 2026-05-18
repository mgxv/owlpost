import { Menu, type MenuItemConstructorOptions } from "electron";

interface MenuCallbacks {
    onPreferences: () => void;
    onCompose: () => void;
    onReload: () => void;
    onFocusSearch: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
}

// Tries known Gmail search-bar selectors in order; Gmail's DOM structure varies across versions.
export const FOCUS_SEARCH_JS = `(() => {
  const SELECTORS = [
    'input[aria-label*="Search" i]',
    'input[name="q"]',
    'header[role="search"] input',
  ];
  for (const sel of SELECTORS) {
    const el = document.querySelector(sel);
    if (el) { el.focus(); if (el.select) el.select(); return; }
  }
  if (window.__owlpost__) window.__owlpost__.emit("menu-action-failed", "focus_search");
})();`;

export function buildMenu(cb: MenuCallbacks): Menu {
    const template: MenuItemConstructorOptions[] = [
        {
            label: "Owlpost",
            submenu: [
                { role: "about" },
                { type: "separator" },
                {
                    label: "Preferences…",
                    accelerator: "CmdOrCtrl+,",
                    click: cb.onPreferences,
                },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" },
            ],
        },
        {
            label: "File",
            submenu: [
                {
                    label: "New Message",
                    accelerator: "CmdOrCtrl+Shift+N",
                    click: cb.onCompose,
                },
            ],
        },
        {
            label: "Edit",
            submenu: [
                { role: "undo" },
                { role: "redo" },
                { type: "separator" },
                { role: "cut" },
                { role: "copy" },
                { role: "paste" },
                { role: "pasteAndMatchStyle", accelerator: "CmdOrCtrl+Shift+V" },
                { role: "selectAll" },
            ],
        },
        {
            label: "View",
            submenu: [
                {
                    label: "Reload",
                    accelerator: "CmdOrCtrl+R",
                    click: cb.onReload,
                },
                {
                    label: "Find",
                    accelerator: "CmdOrCtrl+F",
                    click: cb.onFocusSearch,
                },
                { type: "separator" },
                {
                    label: "Zoom In",
                    accelerator: "CmdOrCtrl+Plus",
                    click: cb.onZoomIn,
                },
                {
                    label: "Zoom Out",
                    accelerator: "CmdOrCtrl+-",
                    click: cb.onZoomOut,
                },
                {
                    label: "Actual Size",
                    accelerator: "CmdOrCtrl+0",
                    click: cb.onZoomReset,
                },
                { type: "separator" },
                { role: "togglefullscreen" },
            ],
        },
        {
            label: "Window",
            submenu: [
                { role: "minimize" },
                { role: "zoom" },
                { role: "close" },
                { type: "separator" },
                { role: "front" },
            ],
        },
    ];

    return Menu.buildFromTemplate(template);
}
