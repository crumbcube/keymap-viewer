// /home/coffee/my-keymap-viewer/src/hooks/useYoudakuonPractice.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    youdakuonPracticeData,
    YoudakuonInputDef,
    youdakuonGyouChars, // 通常モードのヘッダー表示用
    youdakuonDanMapping, // 通常モードの段キー判定用
} from '../data/keymapData';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
    functionKeyMaps,
    PracticeHighlightResult,
    // allYoudakuonCharInfos はランダムモードで使う
    CharInfoYoudakuon, // CharInfoYoudakuon をインポート
    allYoudakuonCharInfos, // allYoudakuonCharInfos をインポート
} from './usePracticeCommons';

// 拗濁音練習の入力ステージ
type YoudakuonStage = 'gyouInput' | 'youonInput' | 'dakuonInput' | 'danInput';

// CharInfoYoudakuon は usePracticeCommons.ts に移動済みなのでここでは不要

const useYoudakuonPractice = ({
    gIdx,
    dIdx,
    isActive,
    side,
    kb,
    // onAdvance, // シーケンサーを使わないので不要
    layers,
    isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<YoudakuonStage>('gyouInput');
    const [randomTarget, setRandomTarget] = useState<CharInfoYoudakuon | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsActiveRef = useRef(isActive);
    const prevIsRandomModeRef = useRef(isRandomMode);


    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana;
        }
    }, [kb, side]);

    const hid2Dan = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2DanVLeft_Kana : hid2DanVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2DanHLeft_Kana : hid2DanHRight_Kana;
        }
    }, [kb, side]);

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    const selectNextRandomTarget = useCallback(() => {
        if (allYoudakuonCharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allYoudakuonCharInfos.length);
            setRandomTarget(allYoudakuonCharInfos[randomIndex]);
            setStage('gyouInput');
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage]);

    const reset = useCallback(() => {
        setStage('gyouInput');
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget]);

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
                setStage('gyouInput');
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
    
    const currentInputDef = useMemo((): YoudakuonInputDef | null => {
        if (isRandomMode) {
            return randomTarget?.inputDef ?? null;
        }
        // 通常モード
        if (!isActive || gIdx < 0 || gIdx >= youdakuonPracticeData.length) return null;
        const group = youdakuonPracticeData[gIdx];
        if (!group || !group.inputs || dIdx < 0 || dIdx >= group.inputs.length) return null;
        return group.inputs[dIdx];
    }, [isActive, isRandomMode, randomTarget, gIdx, dIdx]);

    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            if (gIdx < 0 || gIdx >= youdakuonPracticeData.length) return [];
            return youdakuonPracticeData[gIdx]?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget, gIdx]);


    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        if (!isActive || !currentInputDef) {
            return { isExpected: false, shouldGoToNext: undefined };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: undefined };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext_final: boolean | undefined = undefined;
        let nextStageInternal: YoudakuonStage = stage;

        const youonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        const expectedYouonKeyCode = youonKeyCodeEntry ? parseInt(youonKeyCodeEntry[0]) + 1 : -1;
        const expectedDakuonKeyCode = dakuonKeyCodeEntry ? parseInt(dakuonKeyCodeEntry[0]) + 1 : -1;

        if (expectedYouonKeyCode === -1 || expectedDakuonKeyCode === -1) {
            console.error("useYoudakuonPractice: Could not find key codes for '拗音' or '濁音'.");
            return { isExpected: false, shouldGoToNext: undefined };
        }

        switch (stage) {
            case 'gyouInput':
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === currentInputDef.gyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedGyouKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    nextStageInternal = 'youonInput';
                    shouldGoToNext_final = undefined;
                } else {
                    nextStageInternal = 'gyouInput';
                    shouldGoToNext_final = undefined;
                }
                break;
            case 'youonInput':
                 if (pressCode === expectedYouonKeyCode) {
                    isExpected = true;
                    nextStageInternal = 'dakuonInput';
                    shouldGoToNext_final = undefined;
                } else {
                    nextStageInternal = 'gyouInput';
                    shouldGoToNext_final = undefined;
                }
                break;
            case 'dakuonInput':
                if (pressCode === expectedDakuonKeyCode) {
                    isExpected = true;
                    nextStageInternal = 'danInput';
                    shouldGoToNext_final = undefined;
                } else {
                    nextStageInternal = 'gyouInput';
                    shouldGoToNext_final = undefined;
                }
                break;
            case 'danInput':
                const expectedDanKeyCodes = Object.entries(hid2Dan)
                    .filter(([_, name]) => name === currentInputDef.dan)
                    .map(([codeStr, _]) => parseInt(codeStr));
                nextStageInternal = 'gyouInput';
                if (expectedDanKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    if (isRandomMode) {
                        selectNextRandomTarget(); // ランダムモードではフック内部で次のターゲットを選択
                        shouldGoToNext_final = false; // App.tsx は gIdx/dIdx を進めない
                    } else {
                        // 通常モード: 現在の文字がグループの最後か判定
                        const currentGroupChars = youdakuonPracticeData[gIdx]?.chars ?? [];
                        const isLastInGroup = dIdx >= currentGroupChars.length - 1;
                        shouldGoToNext_final = isLastInGroup;
                    }
                } else {
                    shouldGoToNext_final = undefined;
                }
                break;
        }

        if (nextStageInternal !== stage) {
            setStage(nextStageInternal);
        } else if (!isExpected && stage !== 'gyouInput') { 
            setStage('gyouInput');
        }

        return { isExpected, shouldGoToNext: shouldGoToNext_final };
    }, [
        isActive, stage, currentInputDef, hid2Gyou, hid2Dan, currentFunctionKeyMap,
        isRandomMode, setStage, selectNextRandomTarget, gIdx, dIdx // gIdx, dIdx を依存配列に追加
    ]);

    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive || !currentInputDef) {
            return noHighlight;
        }

        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;


        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        const youonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        const youonDisplayName = youonKeyEntry ? currentFunctionKeyMap[parseInt(youonKeyEntry[0])] : '拗音';
        const dakuonDisplayName = dakuonKeyEntry ? currentFunctionKeyMap[parseInt(dakuonKeyEntry[0])] : '濁音';

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = currentInputDef.gyouKey;
                targetLayoutIndex = 2;
                break;
            case 'youonInput':
                expectedKeyName = youonDisplayName;
                targetLayoutIndex = 2;
                break;
            case 'dakuonInput':
                expectedKeyName = dakuonDisplayName;
                targetLayoutIndex = 2;
                break;
            case 'danInput':
                expectedKeyName = currentInputDef.dan;
                targetLayoutIndex = 3;
                break;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }

        return noHighlight;
    }, [
        isActive, stage, currentInputDef, currentFunctionKeyMap, isRandomMode, gIdx, dIdx
    ]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        switch (stage) {
            case 'gyouInput':
            case 'youonInput':
            case 'dakuonInput':
                expectedLayoutIndex = 2;
                break;
            case 'danInput':
                expectedLayoutIndex = 3;
                break;
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
        currentTarget: isRandomMode ? randomTarget ?? undefined : (currentInputDef ? { type: 'youdakuon', char: youdakuonPracticeData[gIdx]?.chars[dIdx] ?? '', inputDef: currentInputDef } : undefined),
   };
};

export default useYoudakuonPractice;
