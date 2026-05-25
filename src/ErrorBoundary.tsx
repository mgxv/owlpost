import React from "react";
import { log } from "./log";

interface State {
    error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
    override state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    override componentDidCatch(error: Error, info: React.ErrorInfo): void {
        log.error(`[ErrorBoundary] ${error.message}`, info.componentStack ?? error.stack);
    }

    override render() {
        const { error } = this.state;
        if (error) {
            return (
                <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-100 px-6 text-center dark:bg-neutral-900">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Something went wrong</p>
                    <p className="max-w-xs text-xs text-neutral-500 dark:text-neutral-400">{error.message}</p>
                    <button
                        type="button"
                        onClick={() => {
                            this.setState({ error: null });
                        }}
                        className="rounded-md bg-neutral-200 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
