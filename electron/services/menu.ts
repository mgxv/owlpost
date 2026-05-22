import { Menu, type MenuItemConstructorOptions } from "electron";

interface MenuCallbacks {
    onPreferences: () => void;
    onCompose: () => void;
    onReload: () => void;
    onFind: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
}

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
                    click: () => {
                        cb.onCompose();
                    },
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
                    click: cb.onFind,
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
