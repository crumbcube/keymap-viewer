import { useState, useCallback, useRef } from 'react';

export interface AppInteractionsResult {
    showKeyLabels: boolean;
    setShowKeyLabels: React.Dispatch<React.SetStateAction<boolean>>;
    isRandomMode: boolean;
    setIsRandomMode: React.Dispatch<React.SetStateAction<boolean>>;
    lastInvalidKeyCode: number | null;
    setLastInvalidKeyCodeWithTimeout: (code: number | null) => void;
    clearLastInvalidKeyCode: () => void; // Explicitly clear without timeout logic
}

export const useAppInteractions = (
    initialShowKeyLabels: boolean = true,
    initialIsRandomMode: boolean = false
): AppInteractionsResult => {
    const [showKeyLabels, setShowKeyLabels] = useState<boolean>(initialShowKeyLabels);
    const [isRandomMode, setIsRandomMode] = useState<boolean>(initialIsRandomMode);
    const [lastInvalidKeyCode, setLastInvalidKeyCodeState] = useState<number | null>(null);
    const invalidInputTimeoutRef = useRef<number | null>(null);

    const clearLastInvalidKeyCode = useCallback(() => {
        if (invalidInputTimeoutRef.current !== null) {
            clearTimeout(invalidInputTimeoutRef.current);
            invalidInputTimeoutRef.current = null;
        }
        setLastInvalidKeyCodeState(null);
    }, []);

    const setLastInvalidKeyCodeWithTimeout = useCallback((code: number | null) => {
        if (code === null) {
            clearLastInvalidKeyCode();
            return;
        }

        setLastInvalidKeyCodeState(code); // Set immediately

        if (invalidInputTimeoutRef.current !== null) {
            clearTimeout(invalidInputTimeoutRef.current);
        }

        const invalidHighlightDuration = 500;
        const timerId = window.setTimeout(() => {
            setLastInvalidKeyCodeState(prevCode => {
                if (prevCode === code) { // Only clear if it's still the same code
                    return null;
                }
                return prevCode;
            });
            invalidInputTimeoutRef.current = null;
        }, invalidHighlightDuration);
        invalidInputTimeoutRef.current = timerId;
    }, [clearLastInvalidKeyCode]);

    return {
        showKeyLabels,
        setShowKeyLabels,
        isRandomMode,
        setIsRandomMode,
        lastInvalidKeyCode,
        setLastInvalidKeyCodeWithTimeout,
        clearLastInvalidKeyCode,
    };
};
