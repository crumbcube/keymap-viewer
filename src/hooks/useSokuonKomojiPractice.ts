// src/hooks/useSokuonKomojiPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    sokuonKomojiData,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
    CharInfoSokuonKomoji,
    allSokuonKomojiCharInfos,
    PracticeHighlightResult,
} from './usePracticeCommons';

type SokuonKomojiStage = 'tsuInput' | 'gyouInput' | 'middleInput' | 'danInput';

export default function useSokuonKomojiPractice({ gIdx, dIdx, okVisible, isActive, side, kb, isRandomMode }: PracticeHookProps): PracticeHookResult {
    const [stage, setStage] = useState<SokuonKomojiStage>(() => {
        const initialChar = sokuonKomojiData[gIdx]?.chars[dIdx];
        return initialChar === 'っ' ? 'tsuInput' : 'gyouInput';
    });
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

    const tsuKeyCode = useMemo(() => {
        const gyouMap = kb === 'tw-20v'
            ? (side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana)
            : (side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana);
        const entry = Object.entries(gyouMap).find(([_, name]) => name === '促音');
        return entry ? parseInt(entry[0]) : null;
    }, [kb, side]);

    const dakuonKeyCode = useMemo(() => {
        const gyouMap = kb === 'tw-20v'
            ? (side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana)
            : (side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana);
        const entry = Object.entries(gyouMap).find(([_, name]) => name === '濁音');
        return entry ? parseInt(entry[0]) : null;
    }, [kb, side]);


    const [randomTarget, setRandomTarget] = useState<CharInfoSokuonKomoji | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);

    const selectNextRandomTarget = useCallback(() => {
        if (allSokuonKomojiCharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allSokuonKomojiCharInfos.length);
            const nextTarget = allSokuonKomojiCharInfos[randomIndex];
            setRandomTarget(nextTarget);
            setStage(nextTarget.isTsu ? 'tsuInput' : 'gyouInput');
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage]);

    const reset = useCallback(() => {
        const initialChar = sokuonKomojiData[gIdx]?.chars[dIdx];
        setStage(initialChar === 'っ' ? 'tsuInput' : 'gyouInput');
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget, gIdx, dIdx]); // gIdx, dIdx を追加

    useEffect(() => {

        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                const initialChar = sokuonKomojiData[gIdx]?.chars[dIdx];
                setStage(initialChar === 'っ' ? 'tsuInput' : 'gyouInput');
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
                 const initialChar = sokuonKomojiData[gIdx]?.chars[dIdx];
                 setStage(initialChar === 'っ' ? 'tsuInput' : 'gyouInput');
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }

            prevIsRandomModeRef.current = isRandomMode;

        } else {
            setStage('gyouInput'); // デフォルトは gyouInput
            setRandomTarget(null);
            prevGIdxRef.current = -1;
            prevDIdxRef.current = -1;
            isInitialMount.current = true;
            prevIsRandomModeRef.current = isRandomMode;
        }

    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, selectNextRandomTarget, setStage]);

    const currentSet = useMemo(() => {
        if (isRandomMode || !isActive || gIdx < 0 || gIdx >= sokuonKomojiData.length) return null;
        return sokuonKomojiData[gIdx];
    }, [gIdx, isActive, isRandomMode]);

    const currentInputDef = useMemo(() => {
        if (isRandomMode || !currentSet || dIdx < 0 || dIdx >= currentSet.inputs.length) return null;
        return currentSet.inputs[dIdx];
    }, [currentSet, dIdx, isRandomMode]);

    const currentChar = useMemo(() => {
        if (isRandomMode) return randomTarget?.char ?? null;
        if (!currentSet || dIdx < 0 || dIdx >= currentSet.chars.length) return null;
        return currentSet.chars[dIdx];
    }, [isRandomMode, randomTarget, currentSet, dIdx]);

    const isCurrentCharTsu = useMemo(() => {
        if (isRandomMode) return randomTarget?.isTsu ?? false;
        return currentChar === 'っ';
    }, [isRandomMode, randomTarget, currentChar]);

    const isMiddleKeyRequired = useMemo(() => {
        if (isRandomMode) return !!randomTarget?.middleKey;
        return !!currentInputDef?.middleKey;
    }, [isRandomMode, randomTarget, currentInputDef]);

    // ヘッダー文字 (変更なし)
    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            return currentSet?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget, currentSet]);

    const expectedGyouKey = useMemo(() => {
        if (isRandomMode) return randomTarget?.gyouKey ?? null;
        return currentInputDef?.gyouKey ?? null;
    }, [isRandomMode, randomTarget, currentInputDef]);

    const expectedDanKey = useMemo(() => {
        if (isRandomMode) return randomTarget?.danKey ?? null;
        return currentInputDef?.dan ?? null;
    }, [isRandomMode, randomTarget, currentInputDef]);

    const currentOkVisible = okVisible;

    const handleInput = useCallback((input: PracticeInputInfo): PracticeInputResult => {

        if (!isActive || okVisible) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (tsuKeyCode === null || (isMiddleKeyRequired && dakuonKeyCode === null)) {
            console.error("Sokuon/Komoji Input Error: Required key codes are null");
            return { isExpected: false, shouldGoToNext: false };
        }

        let isExpected = false;
        let shouldGoToNext = false;

        if (input.type === 'release') {
            if (stage === 'tsuInput') { // 促音「っ」の入力
                if (input.pressCode === tsuKeyCode) {
                    isExpected = true;
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                    }
                } else {
                    isExpected = false;
                }
            } else if (stage === 'gyouInput') { // 小文字の1打目（行キー）
                if (!expectedGyouKey) return { isExpected: false, shouldGoToNext: false };
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === expectedGyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedGyouKeyCodes.includes(input.pressCode)) {
                    setStage(isMiddleKeyRequired ? 'middleInput' : 'danInput');
                    isExpected = true;
                } else {
                    isExpected = false;
                }
            } else if (stage === 'middleInput') { // 小文字の2打目（濁音キー）
                if (input.pressCode === dakuonKeyCode) {
                    setStage('danInput');
                    isExpected = true;
                } else {
                    isExpected = false;
                    setStage('gyouInput'); // 1打目からやり直し
                }
            } else if (stage === 'danInput') { // 小文字の最終打（段キー）
                if (!expectedDanKey) return { isExpected: false, shouldGoToNext: false };
                const expectedDanKeyCodes = Object.entries(hid2Dan)
                    .filter(([_, name]) => name === expectedDanKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedDanKeyCodes.includes(input.pressCode)) {
                    isExpected = true;
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                    }
                } else {
                    isExpected = false;
                    setStage('gyouInput'); // 1打目からやり直し
                }
            }
        }

        if (!isExpected && input.type === 'release' && stage !== 'tsuInput') {
            // 促音入力以外で間違えたら、必ず gyouInput に戻す
            setStage('gyouInput');
        }

        return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, stage, expectedGyouKey, expectedDanKey, isCurrentCharTsu, tsuKeyCode, dakuonKeyCode, // dakuonKeyCode 追加
        hid2Gyou, hid2Dan, isRandomMode, selectNextRandomTarget, setStage, isMiddleKeyRequired // isMiddleKeyRequired 追加
    ]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive || okVisible) {
            return noHighlight;
        }

        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);

        let currentStageForHighlight: SokuonKomojiStage;
        if (indicesJustChanged) {
            const nextChar = sokuonKomojiData[gIdx]?.chars[dIdx];
            currentStageForHighlight = nextChar === 'っ' ? 'tsuInput' : 'gyouInput';
        } else {
            currentStageForHighlight = stage;
        }

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === 'tsuInput') {
            expectedKeyName = '促音';
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'gyouInput') {
            expectedKeyName = expectedGyouKey;
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'middleInput') {
            expectedKeyName = '濁音';
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'danInput') {
            expectedKeyName = expectedDanKey;
            targetLayoutIndex = 3;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    }, [isActive, okVisible, stage, expectedGyouKey, expectedDanKey, isRandomMode, gIdx, dIdx]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        if (stage === 'tsuInput' || stage === 'gyouInput' || stage === 'middleInput') {
            expectedLayoutIndex = 2;
        } else if (stage === 'danInput') {
            expectedLayoutIndex = 3;
        }

        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive, stage]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        isOkVisible: currentOkVisible,
    };
}
