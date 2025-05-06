// src/hooks/useYouonPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    youonGyouList,
    youonGyouChars,
    youonDanMapping,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
    CharInfoYouon,
    allYouonCharInfos,
    PracticeHighlightResult,
} from './usePracticeCommons';

type YouonStage = 'gyouInput' | 'youonInput' | 'danInput';

export default function useYouonPractice({ gIdx, dIdx, isActive, side, kb, isRandomMode }: PracticeHookProps): PracticeHookResult {
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

    const youonKeyCode = useMemo(() => {
        const gyouMap = kb === 'tw-20v'
            ? (side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana)
            : (side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana);
        // 押下コードのみを対象とする (<= 0x14 or 0x10)
        const maxPressCode = kb === 'tw-20v' ? 0x10 : 0x14;
        const entry = Object.entries(gyouMap).find(([codeStr, name]) => name === '拗音' && parseInt(codeStr) <= maxPressCode);
        return entry ? parseInt(entry[0]) : null;
    }, [side, kb]);

    const [randomTarget, setRandomTarget] = useState<CharInfoYouon | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);

    const selectNextRandomTarget = useCallback(() => {
        if (allYouonCharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allYouonCharInfos.length);
            setRandomTarget(allYouonCharInfos[randomIndex]);
            setStage('gyouInput'); // ステージもリセット
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage]);

    useEffect(() => {

        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            // --- リセット条件 ---
            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                setStage('gyouInput');
                setRandomTarget(null);
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }

            // --- ランダムターゲット選択条件 (初回のみ or リセット後) ---
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
            // 非アクティブになったら全てリセット
            setStage('gyouInput');
            setRandomTarget(null);
            prevGIdxRef.current = -1;
            prevDIdxRef.current = -1;
            isInitialMount.current = true;
            prevIsRandomModeRef.current = isRandomMode;
        }

    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, selectNextRandomTarget]);

    // 通常モード用の現在行・段キー (変更なし)
    const currentGyouKey = useMemo(() => {
        if (!isActive || isRandomMode || gIdx < 0 || gIdx >= youonGyouList.length) return null;
        return youonGyouList[gIdx];
    }, [isActive, isRandomMode, gIdx]);

    const currentDanKey = useMemo(() => {
        if (!isActive || isRandomMode || !currentGyouKey || !youonDanMapping[currentGyouKey]) return null;
        const danList = youonDanMapping[currentGyouKey];
        if (!danList || dIdx < 0 || dIdx >= danList.length) return null; // danList チェック済み
        return danList[dIdx];
    }, [isActive, isRandomMode, currentGyouKey, dIdx]);

    // ヘッダー文字 (変更なし)
    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            if (!currentGyouKey || !youonGyouChars[currentGyouKey]) return [];
            return youonGyouChars[currentGyouKey] || [];
        }
    }, [isActive, isRandomMode, randomTarget, currentGyouKey]);

    // 期待キー (変更なし)
    const expectedGyouKey = useMemo(() => (isRandomMode ? randomTarget?.gyouKey : currentGyouKey) ?? null, [isRandomMode, randomTarget, currentGyouKey]);
    const expectedDanKey = useMemo(() => (isRandomMode ? randomTarget?.danKey : currentDanKey) ?? null, [isRandomMode, randomTarget, currentDanKey]);

    // handleInput
    const handleInput = useCallback((info: PracticeInputInfo): PracticeInputResult => {

        if (!isActive) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (!expectedGyouKey || !expectedDanKey || youonKeyCode === null) {
             return { isExpected: false, shouldGoToNext: false };
        }

        let isExpected = false;
        let shouldGoToNext = false;

        if (info.type === 'release') {
            if (stage === 'gyouInput') {
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === expectedGyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedGyouKeyCodes.includes(info.pressCode)) {
                    setStage('youonInput');
                    isExpected = true;
                } else {
                    isExpected = false;
                }
            } else if (stage === 'youonInput') {
                if (info.pressCode === youonKeyCode) {
                    setStage('danInput');
                    isExpected = true;
                } else {
                    isExpected = false;
                    setStage('gyouInput');
                }
            } else if (stage === 'danInput') {
                const expectedDanKeyCodes = Object.entries(hid2Dan)
                    .filter(([_, name]) => name === expectedDanKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedDanKeyCodes.includes(info.pressCode)) {
                    isExpected = true;
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                        setStage('gyouInput'); // ★★★ 正解時にステージをリセット ★★★
                    }
                } else {
                    isExpected = false;
                    setStage('gyouInput');
                }
            }
        }

        return { isExpected, shouldGoToNext };
    }, [
        isActive, stage, expectedGyouKey, expectedDanKey, youonKeyCode,
        hid2Gyou, hid2Dan, isRandomMode, selectNextRandomTarget, setStage
    ]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive) {
            return noHighlight;
        }
        if (!expectedGyouKey || !expectedDanKey) {
            return noHighlight;
        }

        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);

        // インデックスが変わった直後は、実際の stage state によらず 'gyouInput' として扱う
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === 'gyouInput') {
            expectedKeyName = expectedGyouKey;
            targetLayoutIndex = 2; // スタートレイヤー
        } else if (currentStageForHighlight === 'youonInput') {
            expectedKeyName = '拗音';
            targetLayoutIndex = 2; // スタートレイヤー
        } else if (currentStageForHighlight === 'danInput') {
            expectedKeyName = expectedDanKey;
            targetLayoutIndex = 3; // エンドレイヤー
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    }, [isActive, stage, expectedGyouKey, expectedDanKey, isRandomMode, gIdx, dIdx]);

    // reset
    const reset = useCallback(() => {
        setStage('gyouInput');
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget]);

    // isInvalidInputTarget
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        if (stage === 'gyouInput' || stage === 'youonInput') {
            expectedLayoutIndex = 2;
        } else if (stage === 'danInput') {
            expectedLayoutIndex = 3;
        }

        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive, stage]);

    return {
        handleInput,
        getHighlightClassName,
        headingChars,
        reset,
        isInvalidInputTarget,
    };
}
