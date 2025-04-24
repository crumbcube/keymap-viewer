// src/hooks/useYouonPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    youonGyouList,
    youonGyouChars,
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
import { youonDanMapping } from '../data/keymapData';

type YouonStage = 'gyouInput' | 'youonInput' | 'danInput';

export default function useYouonPractice({ gIdx, dIdx, okVisible, isActive, side, kb }: PracticeHookProps): PracticeHookResult {
    const [stage, setStage] = useState<YouonStage>('gyouInput');
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

    // side に応じた拗音キーコードを取得 (TW-20V は要確認)
    const youonKeyCode = useMemo(() => {
        if (kb === 'tw-20v') {
            // TW-20V の拗音コード (仮 - 正確な値に要修正)
            return side === 'left' ? 0x03 : 0x03; // 仮の値
        } else { // TW-20H
            // TW-20H Left/Right ともに 0x03
            return 0x03;
        }
    }, [side, kb]);

    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            if (isInitialMount.current || indicesChanged) {
                setStage('gyouInput');
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
        if (!isActive || gIdx < 0 || gIdx >= youonGyouList.length) return null;
        return youonGyouList[gIdx];
    }, [isActive, gIdx]);

    const currentDanKey = useMemo(() => {
        if (!isActive || !currentGyouKey || !youonDanMapping[currentGyouKey]) return null;
        const danList = youonDanMapping[currentGyouKey];
        if (!danList || dIdx < 0 || dIdx >= danList.length) return null;
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
        const pressCode = info.pressCode;
        let isExpected = false;
        let shouldGoToNext = false;

        switch (stage) {
            case 'gyouInput':
                if (inputGyou === currentGyouKey) {
                    setStage('youonInput');
                    isExpected = true;
                }
                break;
            case 'youonInput':
                if (pressCode === youonKeyCode) {
                    setStage('danInput');
                    isExpected = true;
                }
                break;
            case 'danInput':
                if (inputDan === currentDanKey) {
                    isExpected = true;
                    shouldGoToNext = true;
                }
                break;
        }

        // 不正解だった場合、最初のステージに戻す
        if (!isExpected && (stage === 'youonInput' || stage === 'danInput')) {
             setStage('gyouInput');
             isExpected = false;
        } else if (!isExpected && stage === 'gyouInput') {
            // gyouInput での不正解は何もしない
        }

        return { isExpected, shouldGoToNext };
    }, [isActive, okVisible, stage, currentGyouKey, currentDanKey, hid2Gyou, hid2Dan, youonKeyCode, kb, side]);

    const getHighlightClassName = (key: string, layoutIndex: number): string | null => {
        const indicesJustChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
        const isProblemSwitch = indicesJustChanged && !okVisible;

        if (!isActive || okVisible || !currentGyouKey || !currentDanKey) {
            return null;
        }

        // 問題切り替え直後は強制的に 'gyouInput' として扱う
        const currentStageForHighlight = isProblemSwitch ? 'gyouInput' : stage;

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = currentGyouKey;
                targetLayoutIndex = 2;
                break;
            case 'youonInput':
                expectedKeyName = '拗音';
                targetLayoutIndex = 2;
                break;
            case 'danInput':
                expectedKeyName = currentDanKey;
                targetLayoutIndex = 3;
                break;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return 'bg-blue-100';
        }
        return null;
    };

    const headingChars = useMemo(() => {
        if (!isActive || !currentGyouKey || !youonGyouChars[currentGyouKey]) return [];
        return youonGyouChars[currentGyouKey] || [];
    }, [isActive, currentGyouKey]);

    const reset = useCallback(() => {
        setStage('gyouInput');
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
