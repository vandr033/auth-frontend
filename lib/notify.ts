type FeedbackTone = "success" | "error" | "warning" | "info";

export type FeedbackToastEvent = {
    id: string;
    tone: FeedbackTone;
    title: string;
    text?: string;
};

export type FeedbackConfirmRequest = {
    id: string;
    title: string;
    text?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    variant?: "default" | "destructive";
    resolve: (value: { isConfirmed: boolean }) => void;
};

type FeedbackEvent =
    | { type: "toast"; toast: FeedbackToastEvent }
    | { type: "confirm"; request: FeedbackConfirmRequest };

type FeedbackListener = (event: FeedbackEvent) => void;

const listeners = new Set<FeedbackListener>();

function emit(event: FeedbackEvent) {
    listeners.forEach((listener) => listener(event));
}

function makeId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pushToast(tone: FeedbackTone, title: string, text?: string) {
    emit({
        type: "toast",
        toast: {
            id: makeId(),
            tone,
            title,
            text,
        },
    });
    return Promise.resolve();
}

export function subscribeToFeedback(listener: FeedbackListener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export const notify = {
    success: (title: string, text?: string) => pushToast("success", title, text),
    error: (title: string, text?: string) => pushToast("error", title, text),
    warning: (title: string, text?: string) => pushToast("warning", title, text),
    info: (title: string, text?: string) => pushToast("info", title, text),
    confirm: (
        title: string,
        text?: string,
        options?: {
            confirmButtonText?: string;
            cancelButtonText?: string;
            variant?: "default" | "destructive";
        },
    ) =>
        new Promise<{ isConfirmed: boolean }>((resolve) => {
            emit({
                type: "confirm",
                request: {
                    id: makeId(),
                    title,
                    text,
                    confirmButtonText: options?.confirmButtonText,
                    cancelButtonText: options?.cancelButtonText,
                    variant: options?.variant,
                    resolve,
                },
            });
        }),
};
