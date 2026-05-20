interface OwlpostBridge {
    onReady: (fn: () => void) => void;
    emit: (name: string, payload: unknown) => void;
}

declare interface Window {
    __owlpost__?: OwlpostBridge;
}
