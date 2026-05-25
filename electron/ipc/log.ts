import { ipcMain } from "electron";
import { IPC_RENDERER_LOG } from "../core/constants";
import { logger } from "../core/logger";

const MAX_MESSAGE = 500;
const MAX_DETAIL = 4000;
const MAX_SOURCE = 32;

function clamp(value: unknown, max: number): string {
    return (typeof value === "string" ? value : "").slice(0, max);
}

export interface FormattedLog {
    level: "warn" | "error";
    line: string;
}

// Turns an untrusted renderer log payload into a single sanitized log line, or null
// if there is nothing worth logging.
export function formatRendererLog(msg: unknown): FormattedLog | null {
    if (typeof msg !== "object" || msg === null) return null;
    const { source, level, message, detail } = msg as Record<string, unknown>;
    const text = clamp(message, MAX_MESSAGE);
    if (!text) return null;
    const src = clamp(source, MAX_SOURCE) || "renderer";
    const detailText = clamp(detail, MAX_DETAIL);
    const body = detailText ? `${text} — ${detailText}` : text;
    return {
        level: level === "error" ? "error" : "warn",
        line: `[renderer:${src}] ${body}`,
    };
}

export function registerLogIpc(): void {
    ipcMain.on(IPC_RENDERER_LOG, (_event, msg: unknown) => {
        const out = formatRendererLog(msg);
        if (!out) return;
        if (out.level === "error") logger.error(out.line);
        else logger.warn(out.line);
    });
}
