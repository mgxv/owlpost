import { app, crashReporter } from "electron";
import { readFileSync } from "fs";
import path from "path";
import { logger } from "../core/logger";

let _resolvedDsn = false;
let _dsn: string | undefined;
let _started = false;

function readBakedDsn(): string | undefined {
    try {
        const pkgPath = path.join(app.getAppPath(), "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { sentryDsn?: unknown };
        return typeof pkg.sentryDsn === "string" && pkg.sentryDsn.length > 0 ? pkg.sentryDsn : undefined;
    } catch {
        return undefined;
    }
}

export function getSentryDsn(): string | undefined {
    if (!_resolvedDsn) {
        _dsn = readBakedDsn() ?? process.env.SENTRY_DSN;
        _resolvedDsn = true;
    }
    return _dsn;
}

export function isCrashReportingAvailable(): boolean {
    return getSentryDsn() !== undefined;
}

export function dsnToMinidumpUrl(dsn: string): string | null {
    try {
        const u = new URL(dsn);
        const publicKey = u.username;
        if (!publicKey) return null;
        const segments = u.pathname.split("/").filter(Boolean);
        const projectId = segments.pop();
        if (!projectId) return null;
        const projectPath = segments.length > 0 ? `/${segments.join("/")}` : "";
        return `${u.protocol}//${u.host}${projectPath}/api/${projectId}/minidump/?sentry_key=${publicKey}`;
    } catch {
        return null;
    }
}

export function startCrashReporter(): void {
    if (_started) return;
    const dsn = getSentryDsn();
    if (!dsn) return;
    const submitURL = dsnToMinidumpUrl(dsn);
    if (!submitURL) {
        logger.warn("[crash] configured DSN is not a valid Sentry DSN; crash reporting disabled");
        return;
    }
    crashReporter.start({ submitURL, uploadToServer: true });
    _started = true;
    logger.info("[crash] crash reporting started");
}
