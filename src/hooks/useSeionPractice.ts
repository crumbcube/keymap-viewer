// src/hooks/useSeionPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    gyouList,
    danOrder,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
    CharInfoSeion,
    allSeionCharInfos,
    gyouChars,
} from './usePracticeCommons';

type SeionStage = "line" | "dan";

export default function useSeionPractice({ gIdx, dIdx, okVisible, isActive, side, kb, isRandomMode }: PracticeHookProps): PracticeHookResult {
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

    const [randomTarget, setRandomTarget] = useState<CharInfoSeion | null>(null);

    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);

    const selectNextRandomTarget = useCallback(() => {
        if (allSeionCharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allSeionCharInfos.length);
            console.log(">>> Selecting new random target (Seion):", allSeionCharInfos[randomIndex]);
            setRandomTarget(allSeionCharInfos[randomIndex]);
            setStage("line");
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage]);

    useEffect(() => {
        console.log("Seion useEffect run. isActive:", isActive, "isRandomMode:", isRandomMode, "randomTarget:", randomTarget?.char);

        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                console.log("Resetting to normal mode or index changed");
                setStage("line");
                setRandomTarget(null);
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }

            if (isRandomMode && !randomTarget && (randomModeChangedToTrue || isInitialMount.current)) {
                 selectNextRandomTarget();
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            } else if (!isRandomMode && isInitialMount.current) {
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }

            prevIsRandomModeRef.current = isRandomMode;

        } else {
            setStage("line");
            setRandomTarget(null);
            prevGIdxRef.current = -1;
            prevDIdxRef.current = -1;
            isInitialMount.current = true;
            prevIsRandomModeRef.current = isRandomMode;
        }

    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, selectNextRandomTarget]);

    const currentGyouKey = useMemo(() => {
        if (!isActive || isRandomMode || gIdx < 0 || gIdx >= gyouList.length) return null;
        return gyouList[gIdx];
    }, [isActive, isRandomMode, gIdx]);

    const currentDanKey = useMemo(() => {
        if (!isActive || isRandomMode || !currentGyouKey || !danOrder[currentGyouKey]) return null;
        const danList = danOrder[currentGyouKey];
        if (dIdx < 0 || dIdx >= danList.length) return null;
        return danList[dIdx];
    }, [isActive, isRandomMode, currentGyouKey, dIdx]);

    const headingChars = useMemo(() => {
        console.log("Calculating headingChars. isRandomMode:", isRandomMode, "randomTarget:", randomTarget?.char);
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            if (!currentGyouKey || !gyouChars[currentGyouKey]) return [];
            return gyouChars[currentGyouKey] || [];
        }
    }, [isActive, isRandomMode, randomTarget, currentGyouKey]);

    const expectedGyouKey = useMemo(() => (isRandomMode ? randomTarget?.gyouKey : currentGyouKey) ?? null, [isRandomMode, randomTarget, currentGyouKey]);
    const expectedDanKey = useMemo(() => (isRandomMode ? randomTarget?.danKey : currentDanKey) ?? null, [isRandomMode, randomTarget, currentDanKey]);

    const currentOkVisible = okVisible;

    const handleInput = useCallback((info: PracticeInputInfo): PracticeInputResult => {
        console.log("Seion Input:", info, "Stage:", stage, "Expected Gyou:", expectedGyouKey, "Expected Dan:", expectedDanKey, "RandomMode:", isRandomMode, "PropOK:", okVisible);

        if (!isActive || okVisible) {
            console.log("Seion Input Ignored: Inactive or Prop OK visible");
            return { isExpected: false, shouldGoToNext: false };
        }
        if (!expectedGyouKey || !expectedDanKey) {
             console.log("Seion Input Ignored: Expected keys invalid");
             return { isExpected: false, shouldGoToNext: false };
        }

        const inputGyou = hid2Gyou[info.pressCode] ?? null;
        const inputDan = hid2Dan[info.pressCode] ?? null;
        let isExpected = false;
        let shouldGoToNext = false;

        if (info.type === 'release') {
            if (stage === "line") {
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === expectedGyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                console.log("Stage: line, Input Gyou:", inputGyou, "Expected Gyou:", expectedGyouKey, "Input Code:", info.pressCode, "Expected Codes:", expectedGyouKeyCodes);
                if (expectedGyouKeyCodes.includes(info.pressCode)) {
                    setStage("dan");
                    isExpected = true;
                    console.log("Transition to dan stage");
                } else {
                    isExpected = false;
                    console.log("Incorrect gyou input");
                }
            } else if (stage === "dan") {
                const expectedDanKeyCodes = Object.entries(hid2Dan)
                    .filter(([_, name]) => name === expectedDanKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                console.log("Stage: dan, Input Dan:", inputDan, "Expected Dan:", expectedDanKey, "Input Code:", info.pressCode, "Expected Codes:", expectedDanKeyCodes);
                if (expectedDanKeyCodes.includes(info.pressCode)) {
                    isExpected = true;
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                    }
                    console.log("Correct dan input");
                } else {
                    isExpected = false;
                    console.log("Incorrect dan input");
                    setStage("line");
                }
            }

        }

        console.log("Seion Result:", { isExpected, shouldGoToNext });
        return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, stage, expectedGyouKey, expectedDanKey,
        hid2Gyou, hid2Dan, isRandomMode, selectNextRandomTarget, setStage
    ]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): string | null => {
        if (!isActive || okVisible) {
            return null;
        }
        if (!expectedGyouKey || !expectedDanKey) {
            return null;
        }

        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);

        const currentStageForHighlight = indicesJustChanged ? 'line' : stage;

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === "line") {
            expectedKeyName = expectedGyouKey;
            targetLayoutIndex = 2; // スタートレイヤー
        } else { // 'dan'
            expectedKeyName = expectedDanKey;
            targetLayoutIndex = 3; // エンドレイヤー
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return 'bg-blue-100';
        }
        return null;
    }, [isActive, okVisible, stage, expectedGyouKey, expectedDanKey, isRandomMode, gIdx, dIdx]);

    const reset = useCallback(() => {
        console.log("Resetting Seion Practice Hook");
        setStage("line");
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        if (stage === "line") {
            expectedLayoutIndex = 2;
        } else if (stage === "dan") {
            expectedLayoutIndex = 3;
        }

        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive, stage]); // kb を削除済み

    return {
        handleInput,
        getHighlightClassName,
        headingChars,
        reset,
        isInvalidInputTarget,
        isOkVisible: currentOkVisible,
    };
}
