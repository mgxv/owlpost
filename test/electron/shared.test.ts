import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "electron";

vi.mock("electron", () => ({
    shell: { openExternal: vi.fn() },
    screen: { getAllDisplays: vi.fn() },
}));

vi.mock("../../electron/core/logger", () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { clampToDisplays, type WindowState } from "../../electron/windows/shared";

const display = (x: number, y: number, width: number, height: number) => ({ bounds: { x, y, width, height } });

function withDisplays(...displays: ReturnType<typeof display>[]): void {
    vi.mocked(screen.getAllDisplays).mockReturnValue(displays as unknown as Electron.Display[]);
}

describe("clampToDisplays", () => {
    beforeEach(() => {
        withDisplays(display(0, 0, 1920, 1080));
    });

    it("passes through a window with no saved position (x/y undefined)", () => {
        const state: WindowState = { width: 1200, height: 800 };
        expect(clampToDisplays(state)).toEqual(state);
    });

    it("keeps a window fully inside a display", () => {
        const state: WindowState = { x: 100, y: 100, width: 1200, height: 800 };
        expect(clampToDisplays(state)).toEqual(state);
    });

    it("keeps a window whose titlebar sits flush at the top-left origin", () => {
        const state: WindowState = { x: 0, y: 0, width: 1200, height: 800 };
        expect(clampToDisplays(state)).toEqual(state);
    });

    it("drops position when the titlebar is above the display (negative y)", () => {
        const state: WindowState = { x: 100, y: -500, width: 1200, height: 800 };
        expect(clampToDisplays(state)).toEqual({ width: 1200, height: 800 });
    });

    it("drops position when the window is off the right edge", () => {
        const state: WindowState = { x: 5000, y: 100, width: 1200, height: 800 };
        expect(clampToDisplays(state)).toEqual({ width: 1200, height: 800 });
    });

    it("drops position when the window is dragged off the left edge (titlebar unreachable)", () => {
        const state: WindowState = { x: -1190, y: 100, width: 1200, height: 800 };
        expect(clampToDisplays(state)).toEqual({ width: 1200, height: 800 });
    });

    it("keeps a window that lives on a secondary display", () => {
        withDisplays(display(0, 0, 1920, 1080), display(1920, 0, 1920, 1080));
        const state: WindowState = { x: 2100, y: 100, width: 1200, height: 800 };
        expect(clampToDisplays(state)).toEqual(state);
    });

    it("drops position when it falls in the gap between displays", () => {
        withDisplays(display(0, 0, 800, 600), display(2000, 0, 800, 600));
        const state: WindowState = { x: 1200, y: 100, width: 400, height: 300 };
        expect(clampToDisplays(state)).toEqual({ width: 400, height: 300 });
    });
});
