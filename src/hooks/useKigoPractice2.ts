// src/hooks/useKigoPractice2.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { kigoPractice2Data } from '../data/keymapData';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    KeyboardModel,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
} from './usePracticeCommons';

type KigoPractice2Stage = 'gyouInput' | 'kigoInput';

const useKigoPractice2 = ({ gIdx, dIdx, isActive, okVisible, side, kb }: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<KigoPractice2Stage>('gyouInput');
    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana;
        }
    }, [side, kb]);

    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);

    const reset = useCallback(() => {
        setStage('gyouInput');
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
    }, []);

    useEffect(() => {
        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            if (isInitialMount.current || indicesChanged) {
                reset();
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }
        } else {
            reset();
        }
    }, [isActive, gIdx, dIdx, reset]);

    const currentGroup = useMemo(() => {
        if (!isActive || gIdx < 0 || gIdx >= kigoPractice2Data.length) return null;
        return kigoPractice2Data[gIdx];
    }, [isActive, gIdx]);

    const currentInputDef = useMemo(() => {
        if (!currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) {
            return null;
        }
        return currentGroup.inputs[dIdx];
    }, [currentGroup, dIdx]);

    const headingChars = useMemo(() => {
        return currentGroup?.chars ?? [];
    }, [currentGroup]);

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        if (!isActive || !currentInputDef || okVisible) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const inputGyou = hid2Gyou[inputInfo.pressCode] ?? null;
        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext = false;

        switch (stage) {
            case 'gyouInput':
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === currentInputDef.gyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));

                if (expectedGyouKeyCodes.includes(pressCode) && inputGyou === currentInputDef.gyouKey) {
                    isExpected = true;
                    setStage('kigoInput');
                }
                break;
            case 'kigoInput':
                const expectedKigoKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === '記号')
                    .map(([codeStr, _]) => parseInt(codeStr));

                if (expectedKigoKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    shouldGoToNext = true;
                    setStage('gyouInput');
                }
                break;
        }

        if (!isExpected) {
            reset();
        }

        return { isExpected, shouldGoToNext };
    }, [isActive, currentInputDef, okVisible, reset, stage, hid2Gyou, kb, side]);

    const getHighlightClassName = (key: string, layoutIndex: number): string | null => {
        const indicesJustChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
        const isProblemSwitch = indicesJustChanged && !okVisible;

        if (!isActive || !currentInputDef || okVisible) {
            return null;
        }

        const currentStageForHighlight = isProblemSwitch ? 'gyouInput' : stage;

        let expectedKeyName: string | null = null;
        const targetLayoutIndex = 2;

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = currentInputDef.gyouKey;
                break;
            case 'kigoInput':
                expectedKeyName = '記号';
                break;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return 'bg-blue-100';
        }
        return null;
    };

    const isInvalidInputTarget = useCallback((keyCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        // HIDコードが1始まりと仮定
        const targetKeyIndex = keyCode - 1;
        // layoutIndex や stage による絞り込みを行わない
        const isTarget = keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget
    };
};

export default useKigoPractice2;
