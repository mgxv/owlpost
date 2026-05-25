import {
    shell,
    screen,
    Menu,
    clipboard,
    type WebContents,
    type BrowserWindow,
    type MenuItemConstructorOptions,
} from "electron";
import path from "path";
import { logger } from "../core/logger";

export const PRELOAD_GMAIL = path.join(__dirname, "../preload/gmail.js");

export const GMAIL_ALLOWED_HOSTS = new Set(["mail.google.com", "accounts.google.com"]);

export interface WindowState {
    x?: number;
    y?: number;
    width: number;
    height: number;
}

export const TITLEBAR_HEIGHT = 32;

export function clampToDisplays(state: WindowState): WindowState {
    const { x, y } = state;
    if (x === undefined || y === undefined) return state;
    const visible = screen.getAllDisplays().some(({ bounds }) => {
        const titleBarVisible = y >= bounds.y && y + TITLEBAR_HEIGHT <= bounds.y + bounds.height;
        const horizontallyReachable =
            x + state.width > bounds.x + TITLEBAR_HEIGHT && x < bounds.x + bounds.width - TITLEBAR_HEIGHT;
        return titleBarVisible && horizontallyReachable;
    });
    if (visible) return state;
    return { width: state.width, height: state.height };
}

export function openExternal(url: string): void {
    shell.openExternal(url).catch((e: unknown) => {
        logger.warn("[shell] openExternal failed:", e);
    });
}

export function attachContextMenu(wc: WebContents, win: BrowserWindow): void {
    wc.on("context-menu", (_event, params) => {
        const flags = params.editFlags;
        const sections: MenuItemConstructorOptions[][] = [];

        if (params.isEditable) {
            sections.push(
                [
                    {
                        label: "Undo",
                        enabled: flags.canUndo,
                        click: () => {
                            wc.undo();
                        },
                    },
                    {
                        label: "Redo",
                        enabled: flags.canRedo,
                        click: () => {
                            wc.redo();
                        },
                    },
                ],
                [
                    {
                        label: "Cut",
                        enabled: flags.canCut,
                        click: () => {
                            wc.cut();
                        },
                    },
                    {
                        label: "Copy",
                        enabled: flags.canCopy,
                        click: () => {
                            wc.copy();
                        },
                    },
                    {
                        label: "Paste",
                        enabled: flags.canPaste,
                        click: () => {
                            wc.paste();
                        },
                    },
                ],
                [
                    {
                        label: "Select All",
                        enabled: flags.canSelectAll,
                        click: () => {
                            wc.selectAll();
                        },
                    },
                ],
            );
        } else if (params.selectionText.trim().length > 0) {
            sections.push([
                {
                    label: "Copy",
                    enabled: flags.canCopy,
                    click: () => {
                        wc.copy();
                    },
                },
                {
                    label: "Select All",
                    enabled: flags.canSelectAll,
                    click: () => {
                        wc.selectAll();
                    },
                },
            ]);
        }

        if (params.linkURL.length > 0) {
            const url = params.linkURL;
            sections.push([
                {
                    label: "Open Link in Browser",
                    enabled: /^https?:/i.test(url),
                    click: () => {
                        openExternal(url);
                    },
                },
                {
                    label: "Copy Link Address",
                    enabled: url.length > 0,
                    click: () => {
                        clipboard.writeText(url);
                    },
                },
            ]);
        }

        if (params.mediaType === "image") {
            const src = params.srcURL;
            sections.push([
                {
                    label: "Copy Image",
                    enabled: params.hasImageContents,
                    click: () => {
                        wc.copyImageAt(params.x, params.y);
                    },
                },
                {
                    label: "Save Image",
                    enabled: params.mediaFlags.canSave && /^https?:/i.test(src),
                    click: () => {
                        wc.downloadURL(src);
                    },
                },
            ]);
        }

        if (sections.length === 0) return;

        const template = sections.flatMap<MenuItemConstructorOptions>((section, i) =>
            i === 0 ? section : [{ type: "separator" as const }, ...section],
        );

        Menu.buildFromTemplate(template).popup({ window: win });
    });
}
