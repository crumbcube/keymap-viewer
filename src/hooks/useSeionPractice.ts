// src/hooks/useSeionPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    gyouList,
    danOrder,
    KeyboardModel,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
} from './usePracticeCommons';
import { gyouChars } from '../data/keymapData';

type SeionStage = "line" | "dan";

export default function useSeionPractice({ gIdx, dIdx, okVisible, isActive, side, kb }: PracticeHookProps): PracticeHookResult {
    const [stage, setStage] = useState<SeionStage>("line");
    const { hid2Gyou, hid2Dan } = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left'
                ? { hid2Gyou: hid2GyouVLeft_Kana, hid2Dan: hid2DanVLeft_Kana }
                : { hid2Gyou: hid2GyouVRight_Kana, hid2Dan: hid2DanVRight_Kana };
        } else { // TW-20H
            return side === 'left'
                ? { hid2Gyou: hid2GyouHLeft_Kana, hid2Dan: hid2DanHLeft_Kana }
                : { hid2Gyou: hid2GyouHRight_Kana, hid2Dan: hid2DanHRight_Kana };
        }
    }, [side, kb]);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            if (isInitialMount.current || indicesChanged) {
                setStage("line");
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }
        } else {
             prevGIdxRef.current = -1;
             prevDIdxRef.current = -1;
             isInitialMount.current = true;
        }
    }, [isActive, gIdx, dIdx]);

    const currentGyouKey = useMemo(() => {
        if (!isActive || gIdx < 0 || gIdx >= gyouList.length) return null;
        return gyouList[gIdx];
    }, [isActive, gIdx]);

    const currentDanKey = useMemo(() => {
        if (!isActive || !currentGyouKey || !danOrder[currentGyouKey]) return null;
        const danList = danOrder[currentGyouKey];
        if (dIdx < 0 || dIdx >= danList.length) return null;
        return danList[dIdx];
    }, [isActive, currentGyouKey, dIdx]);

    const handleInput = useCallback((info: PracticeInputInfo): PracticeInputResult => {
        if (!isActive || okVisible || !currentGyouKey || !currentDanKey) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (info.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const inputGyou = hid2Gyou[info.pressCode] ?? null;
        const inputDan = hid2Dan[info.pressCode] ?? null;
        let isExpected = false;
        let shouldGoToNext = false;

        if (stage === "line") {
            if (inputGyou === currentGyouKey) {
                setStage("dan");
                isExpected = true;
            }
        } else if (stage === "dan") {
            if (inputDan === currentDanKey) {
                isExpected = true;
                shouldGoToNext = true;
            } else {
                // 段入力で間違えた場合は、行入力からやり直し
                setStage("line");
                isExpected = false;
            }
        }

        return { isExpected, shouldGoToNext };
    }, [isActive, okVisible, stage, currentGyouKey, currentDanKey, hid2Gyou, hid2Dan, kb, side]);

    const getHighlightClassName = (key: string, layoutIndex: number): string | null => {
        const indicesJustChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
        const isProblemSwitch = indicesJustChanged && !okVisible;

        if (!isActive || okVisible || !currentGyouKey || !currentDanKey) {
            return null;
        }

        // 問題切り替え直後は強制的に "line" として扱う
        const currentStageForHighlight = isProblemSwitch ? "line" : stage;

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === "line") {
            expectedKeyName = currentGyouKey;
            targetLayoutIndex = 2;
        } else { // currentStageForHighlight === "dan"
            expectedKeyName = currentDanKey;
            targetLayoutIndex = 3;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return 'bg-blue-100';
        }
        return null;
    };

    const headingChars = useMemo(() => {
        if (!currentGyouKey || !gyouChars[currentGyouKey]) return [];
        return gyouChars[currentGyouKey];
    }, [currentGyouKey]);

    const reset = useCallback(() => {
        setStage("line");
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
    }, []);

    const isInvalidInputTarget = useCallback((keyCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        // HIDコードが1始まりと仮定
        const targetKeyIndex = keyCode - 1;
        // layoutIndex や stage による絞り込みを行わない
        const isTarget = keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive]);

    return {
        handleInput,
        getHighlightClassName,
        headingChars,
        reset,
        isInvalidInputTarget,
    };
}
