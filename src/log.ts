export type LogLevel = "warn" | "error";
export type LogSink = (level: LogLevel, message: string, detail?: string) => void;

export interface RendererLog {
    warn(message: string, detail?: unknown): void;
    error(message: string, detail?: unknown): void;
}

function stringifyDetail(detail: unknown): string | undefined {
    if (detail === undefined) return undefined;
    if (detail instanceof Error) return detail.stack ?? `${detail.name}: ${detail.message}`;
    if (typeof detail === "string") return detail;
    try {
        return JSON.stringify(detail);
    } catch {
        return "[unserializable value]";
    }
}

export function createRendererLog(sink: LogSink): RendererLog {
    const emit = (level: LogLevel, message: string, detail?: unknown): void => {
        if (level === "warn") console.warn(message, detail);
        else console.error(message, detail);
        sink(level, message, stringifyDetail(detail));
    };
    return {
        warn: (message, detail) => {
            emit("warn", message, detail);
        },
        error: (message, detail) => {
            emit("error", message, detail);
        },
    };
}

export function installGlobalHandlers(log: RendererLog): void {
    window.addEventListener("error", (e) => {
        log.error(`Uncaught error: ${e.message}`, e.error ?? `${e.filename}:${String(e.lineno)}:${String(e.colno)}`);
    });
    window.addEventListener("unhandledrejection", (e) => {
        log.error("Unhandled promise rejection", e.reason);
    });
}

export const log = createRendererLog((level, message, detail) => {
    window.owlpost.log(level, message, detail);
});
