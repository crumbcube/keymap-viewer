// src/hooks/useYouonPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    youonGyouList,
    youonGyouChars,
    KeyboardModel, // MODIFIED: ESLint Warning 対応のためコメント解除 (実際には未使用だが型定義として必要)
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
            // usePracticeCommons.ts の hid2GyouV***_Kana の定義に合わせる
            return side === 'left' ? 0x03 : 0x02; // Left: 0x03, Right: 0x02 と仮定
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
        // デバッグログ追加
        console.log("Youon Input:", info, "Stage:", stage, "Gyou:", currentGyouKey, "Dan:", currentDanKey);
        console.log("Expected Youon Key Code:", youonKeyCode); // 期待される拗音キーコード

        if (!isActive || okVisible || !currentGyouKey || !currentDanKey) {
            console.log("Youon Input Ignored: Inactive, OK visible, or keys invalid");
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
                console.log("Stage: gyouInput, Input Gyou:", inputGyou, "Expected Gyou:", currentGyouKey); // ログ
                if (inputGyou === currentGyouKey) {
                    setStage('youonInput');
                    isExpected = true;
                    console.log("Transition to youonInput stage"); // ログ
                } else {
                    console.log("Incorrect gyou input"); // ログ
                }
                break;
            case 'youonInput':
                console.log("Stage: youonInput, Input Code:", pressCode, "Expected Code (youonKeyCode):", youonKeyCode); // ログ
                if (pressCode === youonKeyCode) {
                    setStage('danInput');
                    isExpected = true;
                    console.log("Transition to danInput stage"); // ログ
                } else {
                    console.log("Incorrect youon key input"); // ログ
                }
                break;
            case 'danInput':
                console.log("Stage: danInput, Input Dan:", inputDan, "Expected Dan:", currentDanKey); // ログ
                if (inputDan === currentDanKey) {
                    isExpected = true;
                    shouldGoToNext = true;
                    console.log("Correct dan input, should go next"); // ログ
                } else {
                    console.log("Incorrect dan input"); // ログ
                }
                break;
        }

        // 不正解だった場合、最初のステージに戻す
        if (!isExpected && (stage === 'youonInput' || stage === 'danInput')) {
             console.log("Incorrect input, resetting to gyouInput stage"); // ログ
             setStage('gyouInput');
             isExpected = false;
        } else if (!isExpected && stage === 'gyouInput') {
            // gyouInput での不正解は何もしない
        }

        console.log("Youon Result:", { isExpected, shouldGoToNext }); // ログ
        return { isExpected, shouldGoToNext };
    // 依存配列から kb, side を削除 (ESLint Warning 対応)
    // MODIFIED: youonKeyCode を依存配列に追加
    }, [isActive, okVisible, stage, currentGyouKey, currentDanKey, hid2Gyou, hid2Dan, youonKeyCode]);

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
