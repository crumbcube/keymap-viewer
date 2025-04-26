// src/hooks/useKigoPractice2.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { kigoPractice2Data } from '../data/keymapData';
import {
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
} from './usePracticeCommons';

type KigoPractice2Stage = 'gyouInput' | 'kigoInput';

const useKigoPractice2 = ({ gIdx, dIdx, isActive, okVisible, side, kb, isRandomMode }: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<KigoPractice2Stage>('gyouInput');
    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana;
        }
    }, [side, kb]);

    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);

    const [randomTarget, setRandomTarget] = useState<CharInfoKigo2 | null>(null);
    const selectNextRandomTarget = useCallback(() => {
        if (allKigo2CharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allKigo2CharInfos.length);
            const nextTarget = allKigo2CharInfos[randomIndex];
            console.log(">>> Selecting new random target (Kigo2):", nextTarget);
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
        console.log("Kigo2 useEffect run. isActive:", isActive, "isRandomMode:", isRandomMode, "randomTarget:", randomTarget?.char);

        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                console.log("Resetting Kigo2 to normal mode or index changed");
                reset(); // reset 関数を呼び出す
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
                 reset(); // 通常モード初期化
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }

            prevIsRandomModeRef.current = isRandomMode;

        } else {
            reset(); // 非アクティブ時もリセット
        }
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]); // internalOkVisible を削除

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

    // ランダム/通常モード共通
    const expectedGyouKey = useMemo(() => {
        if (isRandomMode) return randomTarget?.gyouKey ?? null;
        return currentInputDef?.gyouKey ?? null;
    }, [isRandomMode, randomTarget, currentInputDef]);

    // ヘッダー文字
    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            return currentGroup?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget, currentGroup]);

    const currentOkVisible = okVisible;

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        console.log("Kigo2 Input:", inputInfo, "Stage:", stage, "Expected Gyou:", expectedGyouKey, "RandomMode:", isRandomMode, "PropOK:", okVisible);

        if (!isActive || okVisible) {
            console.log("Kigo2 Input Ignored: Inactive or Prop OK visible");
            return { isExpected: false, shouldGoToNext: false };
        }
        if (!expectedGyouKey) {
            console.log("Kigo2 Input Ignored: expectedGyouKey is null");
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext = false;

        switch (stage) {
            case 'gyouInput':
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === expectedGyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));

                if (expectedGyouKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    setStage('kigoInput');
                    console.log("Correct gyou input, transition to kigoInput");
                } else {
                    isExpected = false;
                    console.log("Incorrect gyou input");
                }
                break;
            case 'kigoInput':
                const expectedKigoKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === '記号')
                    .map(([codeStr, _]) => parseInt(codeStr));

                if (expectedKigoKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    setStage('gyouInput'); // 次の入力のためにステージを戻す
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                    }
                    console.log("Correct kigo input");
                } else {
                    isExpected = false;
                    console.log("Incorrect kigo input");
                    setStage('gyouInput');
                }
                break;
        }

        console.log("Kigo2 Result:", { isExpected, shouldGoToNext });
        return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, /* reset, */ stage, hid2Gyou, expectedGyouKey,
        isRandomMode, selectNextRandomTarget, setStage // handleCorrectAndGoNextRandom, internalOkVisible を削除
    ]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): string | null => {
        if (!isActive || okVisible) {
            return null;
        }
        if (!expectedGyouKey) {
            return null;
        }

        // 問題切り替え直後は強制的に 'gyouInput' として扱う (通常モードのみ)
        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

        let expectedKeyName: string | null = null;
        const targetLayoutIndex = 2; // 記号2はスタートレイヤーのみ

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = expectedGyouKey;
                break;
            case 'kigoInput':
                expectedKeyName = '記号';
                break;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return 'bg-blue-100';
        }
        return null;
    }, [
        isActive, okVisible, stage, expectedGyouKey, isRandomMode, gIdx, dIdx // internalOkVisible を削除
    ]);

    // isInvalidInputTarget (変更なし)
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;
        // 記号2はスタートレイヤー(layoutIndex=2)のみ対象
        const isTarget = layoutIndex === 2 && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        isOkVisible: currentOkVisible,
    };
};

export default useKigoPractice2;
