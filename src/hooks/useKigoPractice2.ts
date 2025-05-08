// /home/coffee/my-keymap-viewer/src/hooks/useKigoPractice2.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { kigoPractice2Data, functionKeyMaps, kigoMapping2 } from '../data/keymapData';
import {
    KeyboardSide,
    KeyboardModel,
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    CharInfoKigo2,
    allKigo2CharInfos,
    PracticeHighlightResult,
} from './usePracticeCommons';

type KigoPractice2Stage = 'gyouInput' | 'kigoInput';

const useKigoPractice2 = ({
    gIdx,
    dIdx,
    isActive,
    side,
    kb,
    layers, // layers を受け取る
    isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<KigoPractice2Stage>('gyouInput');
    // hid2Gyou, hid2Dan は不要になるので削除
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持
    const prevIsRandomModeRef = useRef(isRandomMode);

    const [randomTarget, setRandomTarget] = useState<CharInfoKigo2 | null>(null);

    // 通常モード用
    const currentGroup = useMemo(() => {
        if (isRandomMode || !isActive || gIdx < 0 || gIdx >= kigoPractice2Data.length) return null;
        return kigoPractice2Data[gIdx];
    }, [isActive, isRandomMode, gIdx]);

    const currentInputDef = useMemo(() => {
        if (isRandomMode || !currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) {
            return null;
        }
        return currentGroup.inputs[dIdx];
    }, [isRandomMode, currentGroup, dIdx]);

    const currentTargetChar = useMemo(() => {
        if (isRandomMode) return randomTarget?.char ?? null;
        return currentGroup?.chars[dIdx] ?? null;
    }, [isRandomMode, randomTarget, currentGroup, dIdx]);

    // 機能キーマップ (変更なし)
    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);


    // ヘッダー文字
    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            return currentGroup?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget, currentGroup]);

    const selectNextRandomTarget = useCallback(() => {
        if (allKigo2CharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allKigo2CharInfos.length);
            const nextTarget = allKigo2CharInfos[randomIndex];
            setRandomTarget(nextTarget);
            setStage('gyouInput'); // 常に gyouInput から
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage]);

    // reset 関数
    const reset = useCallback(() => {
        setStage('gyouInput');
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget]);

    useEffect(() => {
        // isActive が false になった最初のタイミングでリセット
        if (!isActive && prevIsActiveRef.current) {
            // console.log(`[Kigo2 useEffect] Resetting state because isActive became false.`);
            reset();
        }

        if (isActive) {
            // isActive が true になった最初のタイミング、または依存関係の変更時
            if (isActive && !prevIsActiveRef.current) {
                isInitialMount.current = true; // 強制的に初期マウント扱い
            }

            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                // 通常モードやインデックス変更時はステージをリセットし、ランダムターゲットをクリア
                setStage('gyouInput');
                setRandomTarget(null);
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            } else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
                 // console.log(`[Kigo2 useEffect] Random mode. randomModeChangedToTrue=${randomModeChangedToTrue}, isInitialMount=${isInitialMount.current}, !randomTarget=${!randomTarget}`);
                 selectNextRandomTarget();
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }
        }

        // 最後に前回の値を更新
        prevIsActiveRef.current = isActive;
        prevIsRandomModeRef.current = isRandomMode;

    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]);


    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {

        if (!isActive) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (!currentTargetChar) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext = false;

        const layer7 = layers[7] ?? [];

        switch (stage) {
            case 'gyouInput':
                // layers[7] から currentTargetChar (例: '＋') のインデックスを探す
                const targetIndex = layer7.findIndex(key => key === currentTargetChar);
                const expectedPressCode = targetIndex !== -1 ? targetIndex + 1 : -1;

                if (expectedPressCode !== -1 && pressCode === expectedPressCode) {
                    isExpected = true;
                    setStage('kigoInput');
                } else {
                    //console.log(`[Kigo2 handleInput gyouInput] Incorrect. Expected code for '${currentTargetChar}': ${expectedPressCode}, Got: ${pressCode}`);
                    isExpected = false;
                }
                break;

            case 'kigoInput':
                // layers[7] 上の '記号' キーのコードを検索
                const kigoIndex = layer7.findIndex(key => key === '記号');
                const expectedKigoCode = kigoIndex !== -1 ? kigoIndex + 1 : -1;

                if (expectedKigoCode !== -1 && pressCode === expectedKigoCode) {
                    isExpected = true;
                    setStage('gyouInput'); // 次の入力のためにステージを戻す
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                    }
                } else {
                    //console.log(`[Kigo2 handleInput kigoInput] Incorrect. Expected code for '記号': ${expectedKigoCode}, Got: ${pressCode}`);
                    isExpected = false;
                    setStage('gyouInput');
                }
                break;
        }

        return { isExpected, shouldGoToNext };
    }, [
        isActive, stage, layers, currentTargetChar,
        isRandomMode, selectNextRandomTarget, setStage
    ]);

    // ▼▼▼ getHighlightClassName を修正 ▼▼▼
    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive) {
            return noHighlight;
        }

        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

        let expectedKeyDisplayName: string | null = null; // ハイライトすべきキーの「表示名」
        const targetLayoutIndex = 7;

        //if (layoutIndex === targetLayoutIndex) {
        //    console.log(`[getHighlight Kigo2] Called for key: "${keyName}" (Layout ${layoutIndex}). Stage: ${currentStageForHighlight}, TargetChar: ${currentTargetChar}`);
        //}

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyDisplayName = currentTargetChar; // 例: '＋'
                break;
            case 'kigoInput':
                expectedKeyDisplayName = '記号';
                break;
        }

        //if (layoutIndex === targetLayoutIndex) {
        //    console.log(`[getHighlight Kigo2] Expected Display Name: "${expectedKeyDisplayName}"`);
        //}

        // レンダリング中のキーの表示名 (keyName) と、期待される表示名 (expectedKeyDisplayName) を比較
        if (expectedKeyDisplayName !== null && layoutIndex === targetLayoutIndex && keyName.trim() === expectedKeyDisplayName.trim()) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    }, [
        isActive, stage, currentTargetChar,
        isRandomMode, gIdx, dIdx, layers // hid2Gyou は不要
    ]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;
        // 記号2はスタートレイヤー(layoutIndex=2)のみ対象
        const isTarget = layoutIndex === 7 && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
    };
};

export default useKigoPractice2;
