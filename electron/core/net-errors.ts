const OFFLINE_ERROR_CODES = new Set<number>([-7, -21, -105, -106, -109, -118]);

export function isOfflineError(code: number): boolean {
    return OFFLINE_ERROR_CODES.has(code);
}

export function describeLoadError(code: number, description: string): string {
    if (isOfflineError(code)) {
        return "You appear to be offline. Check your internet connection, then try again.";
    }
    return description || "Something went wrong while loading Gmail.";
}
