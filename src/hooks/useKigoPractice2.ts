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
            return { isExpected: false, shouldGoToNext: undefined };
        }
        if (!currentTargetChar) {
            return { isExpected: false, shouldGoToNext: undefined };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: undefined };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext_final: boolean | undefined = undefined;
        let nextStage: KigoPractice2Stage = stage;

        const layer7 = layers[7] ?? [];

        switch (stage) {
            case 'gyouInput':
                const targetIndex = layer7.findIndex(key => key === currentTargetChar);
                const expectedPressCode = targetIndex !== -1 ? targetIndex + 1 : -1;

                if (expectedPressCode !== -1 && pressCode === expectedPressCode) {
                    isExpected = true;
                    nextStage = 'kigoInput';
                    shouldGoToNext_final = undefined; // 記号入力はまだ完了していない
                } else {
                    isExpected = false;
                    shouldGoToNext_final = undefined; // 不正解、記号入力は完了していない
                }
                break;

            case 'kigoInput':
                const kigoIndex = layer7.findIndex(key => key === '記号');
                const expectedKigoCode = kigoIndex !== -1 ? kigoIndex + 1 : -1;
                nextStage = 'gyouInput'; // 次の入力のためにステージを戻す (正誤に関わらず)

                if (expectedKigoCode !== -1 && pressCode === expectedKigoCode) {
                    isExpected = true;
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext_final = false; // App.tsx は gIdx/dIdx を進めない
                    } else {
                        // 通常モード: 現在の文字がそのグループの最後かどうかを判定
                        const currentGroupData = kigoPractice2Data[gIdx]; // props の gIdx を使用
                        const isLastInGroup = currentGroupData ? dIdx === currentGroupData.chars.length - 1 : false;
                        shouldGoToNext_final = isLastInGroup; // グループの最後の文字なら App.tsx は gIdx を進める
                    }
                } else {
                    isExpected = false;
                    // shouldGoToNext_final は undefined のまま (不正解、記号入力は完了していない)
                }
                break;
        }
        
        if (nextStage !== stage) {
            setStage(nextStage);
        } else if (!isExpected && stage !== 'gyouInput') {
            // 不正解で、かつ現在のステージが最初の入力ステージでない場合、最初の入力ステージに戻す
            setStage('gyouInput');
        }

        return { isExpected, shouldGoToNext: shouldGoToNext_final };
    }, [
        isActive, stage, layers, currentTargetChar,
        isRandomMode, selectNextRandomTarget, setStage, gIdx, dIdx
    ]);

    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive) {
            return noHighlight;
        }

        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

        let expectedKeyDisplayName: string | null = null; 
        const targetLayoutIndex = 7;

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyDisplayName = currentTargetChar; 
                break;
            case 'kigoInput':
                expectedKeyDisplayName = '記号';
                break;
        }

        if (expectedKeyDisplayName !== null && layoutIndex === targetLayoutIndex && keyName.trim() === expectedKeyDisplayName.trim()) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    }, [
        isActive, stage, currentTargetChar,
        isRandomMode, gIdx, dIdx
    ]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;
        // 記号2はレイヤー7のみ対象
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
