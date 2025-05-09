// /home/coffee/my-keymap-viewer/src/hooks/useSokuonKomojiPractice.ts
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

export default function useSokuonKomojiPractice({ gIdx, dIdx, isActive, side, kb, isRandomMode }: PracticeHookProps): PracticeHookResult {
    const [stage, setStage] = useState<SokuonKomojiStage>(() => {
        const initialCharInfo = isRandomMode ? null : sokuonKomojiData[gIdx]?.chars[dIdx];
        return initialCharInfo === 'っ' ? 'tsuInput' : 'gyouInput';
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
    const prevIsActiveRef = useRef(isActive);
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
        const initialChar = isRandomMode ? null : sokuonKomojiData[gIdx]?.chars[dIdx];
        setStage(initialChar === 'っ' ? 'tsuInput' : 'gyouInput');
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget, gIdx, dIdx, isRandomMode]);

    useEffect(() => {
        if (!isActive && prevIsActiveRef.current) {
            reset();
        }

        if (isActive) {
            if (isActive && !prevIsActiveRef.current) {
                isInitialMount.current = true;
            }

            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                const currentPracticeChar = sokuonKomojiData[gIdx]?.chars[dIdx];
                setStage(currentPracticeChar === 'っ' ? 'tsuInput' : 'gyouInput');
                setRandomTarget(null);
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            } else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
                 selectNextRandomTarget();
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }
        }
        prevIsActiveRef.current = isActive;
        prevIsRandomModeRef.current = isRandomMode;
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget, setStage]);


    const currentSet = useMemo(() => {
        if (!isRandomMode && isActive && gIdx >= 0 && gIdx < sokuonKomojiData.length) {
            return sokuonKomojiData[gIdx];
        }
        return null;
    }, [gIdx, isActive, isRandomMode]);

    const currentInputDef = useMemo((): CharInfoSokuonKomoji | null => {
        if (isRandomMode) return randomTarget;
        if (!currentSet || dIdx < 0 || dIdx >= currentSet.chars.length) return null;

        const char = currentSet.chars[dIdx];
        if (!char) return null;

        if (char === 'っ') {
            return {
                type: 'sokuonKomoji',
                char: 'っ',
                isTsu: true,
                // gyouKey, middleKey, danKey は undefined (オプショナルなので問題なし)
            };
        }

        // 「っ」以外の文字の場合
        if (dIdx >= currentSet.inputs.length) return null; // inputs 配列の範囲外チェック
        const inputDefFromData = currentSet.inputs[dIdx];
        // 「っ」以外の文字では inputDefFromData が null であってはならない
        if (!inputDefFromData) {
            console.error(`[SokuonKomojiPractice] Missing input definition for non-'っ' char: ${char} at gIdx=${gIdx}, dIdx=${dIdx}`);
            return null;
        }

        return {
            type: 'sokuonKomoji',
            char: char,
            isTsu: false, // char === 'っ' は上で処理済みなので、ここは false
            gyouKey: inputDefFromData.gyouKey,
            middleKey: inputDefFromData.middleKey,
            danKey: inputDefFromData.dan,
        };
    }, [currentSet, dIdx, isRandomMode, randomTarget, gIdx]); // gIdx を依存配列に追加 (エラーログ用)


    const currentChar = useMemo(() => {
        return currentInputDef?.char ?? null;
    }, [currentInputDef]);

    const isCurrentCharTsu = useMemo(() => { // この useMemo は currentInputDef があれば不要になるかも
        return currentInputDef?.isTsu ?? false;
    }, [currentInputDef]);

    const isMiddleKeyRequired = useMemo(() => {
        return !!currentInputDef?.middleKey;
    }, [currentInputDef]);

    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            return currentSet?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget, currentSet]);

    const expectedGyouKey = useMemo(() => {
        return currentInputDef?.gyouKey ?? null;
    }, [currentInputDef]);

    const expectedDanKey = useMemo(() => {
        return currentInputDef?.danKey ?? null;
    }, [currentInputDef]);

    const handleInput = useCallback((input: PracticeInputInfo): PracticeInputResult => {
        if (!isActive) {
            return { isExpected: false, shouldGoToNext: undefined };
        }
        // currentInputDef の存在をチェック
        if (!currentInputDef) { // isCurrentCharTsu のチェックは不要、currentInputDef.isTsu を直接参照
            console.error("Sokuon/Komoji Input Error: currentInputDef is null.");
            return { isExpected: false, shouldGoToNext: undefined };
        }
        // tsuKeyCode のチェックは isTsu の場合のみ、dakuonKeyCode のチェックは isMiddleKeyRequired の場合のみ
        if (currentInputDef.isTsu && tsuKeyCode === null) {
            console.error("Sokuon/Komoji Input Error: tsuKeyCode is null for 'っ'.");
            return { isExpected: false, shouldGoToNext: undefined };
        }
        if (isMiddleKeyRequired && dakuonKeyCode === null) { // isMiddleKeyRequired は currentInputDef から導出
            console.error("Sokuon/Komoji Input Error: dakuonKeyCode is null when middleKey is required.");
            return { isExpected: false, shouldGoToNext: undefined };
        }

        if (input.type !== 'release') {
            return { isExpected: false, shouldGoToNext: undefined };
        }

        let isExpected = false;
        let shouldGoToNext_final: boolean | undefined = undefined;
        let nextHookStage: SokuonKomojiStage = stage;

        if (stage === 'tsuInput') { // currentInputDef.isTsu が true のはず
            if (input.pressCode === tsuKeyCode) {
                isExpected = true;
                nextHookStage = 'tsuInput'; 

                if (isRandomMode) {
                    selectNextRandomTarget(); 
                    shouldGoToNext_final = false; 
                } else {
                    const currentGroupData = sokuonKomojiData[gIdx];
                    const isLastInGroup = currentGroupData ? dIdx === currentGroupData.chars.length - 1 : false;
                    shouldGoToNext_final = isLastInGroup; 
                }
            } else {
                isExpected = false;
                nextHookStage = 'tsuInput'; 
            }
        } else if (stage === 'gyouInput') { // currentInputDef.isTsu が false のはず
            if (!expectedGyouKey) return { isExpected: false, shouldGoToNext: undefined };
            const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                .filter(([_, name]) => name === expectedGyouKey)
                .map(([codeStr, _]) => parseInt(codeStr));
            if (expectedGyouKeyCodes.includes(input.pressCode)) {
                isExpected = true;
                nextHookStage = isMiddleKeyRequired ? 'middleInput' : 'danInput';
                shouldGoToNext_final = undefined;
            } else {
                isExpected = false;
            }
        } else if (stage === 'middleInput') {
            if (input.pressCode === dakuonKeyCode) {
                isExpected = true;
                nextHookStage = 'danInput';
                shouldGoToNext_final = undefined;
            } else {
                isExpected = false;
                nextHookStage = 'gyouInput';
            }
        } else if (stage === 'danInput') {
            if (!expectedDanKey) return { isExpected: false, shouldGoToNext: undefined };
            const expectedDanKeyCodes = Object.entries(hid2Dan)
                .filter(([_, name]) => name === expectedDanKey)
                .map(([codeStr, _]) => parseInt(codeStr));
            if (expectedDanKeyCodes.includes(input.pressCode)) {
                isExpected = true;
                if (isRandomMode) {
                    selectNextRandomTarget(); 
                    shouldGoToNext_final = false;
                } else {
                    const currentGroupData = sokuonKomojiData[gIdx];
                    const isLastInGroup = currentGroupData ? dIdx === currentGroupData.chars.length - 1 : false;
                    shouldGoToNext_final = isLastInGroup;
                    // 次の文字が「っ」かどうかにかかわらず、小文字入力完了後は gyouInput に戻るべき
                    // (useEffect が次のターゲットに応じて tsuInput に設定する)
                    nextHookStage = 'gyouInput';
                }
            } else {
                isExpected = false;
                nextHookStage = 'gyouInput';
            }
        }

        if (nextHookStage !== stage) {
            setStage(nextHookStage); 
        } else if (!isExpected && stage !== 'tsuInput' && stage !== 'gyouInput') {
            setStage('gyouInput');
        }

        return { isExpected, shouldGoToNext: shouldGoToNext_final };
    }, [
        isActive, stage, expectedGyouKey, expectedDanKey, currentInputDef, 
        tsuKeyCode, dakuonKeyCode, hid2Gyou, hid2Dan, isRandomMode, selectNextRandomTarget,
        setStage, isMiddleKeyRequired, gIdx, dIdx
    ]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive || !currentInputDef) { 
            return noHighlight;
        }

        // `indicesJustChanged` のロジックは useEffect でステージが正しく設定されるため、
        // `getHighlightClassName` 内では現在の `stage` を直接参照する方がシンプルで信頼性が高い。
        const currentStageForHighlight: SokuonKomojiStage = stage;

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === 'tsuInput') {
            expectedKeyName = '促音';
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'gyouInput') {
            expectedKeyName = expectedGyouKey; // currentInputDef.gyouKey を使う
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'middleInput') {
            expectedKeyName = '濁音'; // currentInputDef.middleKey は '濁音' 固定なので直接指定
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'danInput') {
            expectedKeyName = expectedDanKey; // currentInputDef.danKey を使う
            targetLayoutIndex = 3;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    }, [isActive, stage, expectedGyouKey, expectedDanKey, currentInputDef]); // gIdx, dIdx, isRandomMode は不要に

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
    };
}
