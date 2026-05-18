interface OwlpostBridge {
    EMAIL_RE: RegExp;
    onReady: (fn: () => void) => void;
    emit: (name: string, payload: unknown) => void;
}

declare interface Window {
    __owlpost__?: OwlpostBridge;
}
