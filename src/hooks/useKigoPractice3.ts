// src/hooks/useKigoPractice3.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { kigoPractice3Data } from '../data/keymapData';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    CharInfoKigo3,
    allKigo3CharInfos,
} from './usePracticeCommons';

type KigoPractice3Stage = 'kigoInput' | 'kigoInputWait' | 'gyouInput';

const useKigoPractice3 = ({ gIdx, dIdx, isActive, okVisible, side, kb, isRandomMode }: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<KigoPractice3Stage>('kigoInput');
    const [showHighlightAfterWait, setShowHighlightAfterWait] = useState(true);
    const isWaitingForSecondKigo = useRef(false);
    const highlightTimeoutRef = useRef<number | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);

    const [randomTarget, setRandomTarget] = useState<CharInfoKigo3 | null>(null);
    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana;
        }
    }, [side, kb]);

    // 通常モード用
    const currentGroup = useMemo(() => {
        if (isRandomMode || !isActive || gIdx < 0 || gIdx >= kigoPractice3Data.length) return null;
        return kigoPractice3Data[gIdx];
    }, [isActive, isRandomMode, gIdx]);

    const currentInputDef = useMemo(() => {
        if (isRandomMode || !currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) {
            return null;
        }
        return currentGroup.inputs[dIdx];
    }, [isRandomMode, currentGroup, dIdx]);

    // ランダム/通常モード共通
    const isTargetEqualSign = useMemo(() => {
        if (isRandomMode) return randomTarget?.isEqualSign ?? false;
        return currentInputDef?.gyouKey === '記号';
    }, [isRandomMode, randomTarget, currentInputDef]);

    const expectedGyouKey = useMemo(() => {
        // 「=」の場合は2打目がないので null
        if (isTargetEqualSign) return null;
        if (isRandomMode) return randomTarget?.gyouKey ?? null;
        return currentInputDef?.gyouKey ?? null;
    }, [isRandomMode, randomTarget, currentInputDef, isTargetEqualSign]);

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
        if (allKigo3CharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allKigo3CharInfos.length);
            const nextTarget = allKigo3CharInfos[randomIndex];
            console.log(">>> Selecting new random target (Kigo3):", nextTarget);
            setRandomTarget(nextTarget);
            setStage('kigoInput'); // 常に記号キーから
            isWaitingForSecondKigo.current = false;
            setShowHighlightAfterWait(true);
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage]);

    // reset 関数
    const reset = useCallback(() => {
        setStage('kigoInput');
        isWaitingForSecondKigo.current = false;
        setShowHighlightAfterWait(true);
        if (highlightTimeoutRef.current !== null) {
            clearTimeout(highlightTimeoutRef.current);
            highlightTimeoutRef.current = null;
        }
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget]);

    useEffect(() => {
        console.log("Kigo3 useEffect run. isActive:", isActive, "isRandomMode:", isRandomMode, "randomTarget:", randomTarget?.char);

        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                console.log("Resetting Kigo3 to normal mode or index changed");
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
        return () => {
            if (highlightTimeoutRef.current !== null) {
                clearTimeout(highlightTimeoutRef.current);
                highlightTimeoutRef.current = null;
            }
        };
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]); // internalOkVisible を削除

    const currentOkVisible = okVisible;

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        console.log("Kigo3 Input:", inputInfo, "Stage:", stage, "IsTargetEqual:", isTargetEqualSign, "IsWaiting:", isWaitingForSecondKigo.current, "RandomMode:", isRandomMode, "PropOK:", okVisible);

        if (!isActive || okVisible) {
            console.log("Kigo3 Input Ignored: Inactive or Prop OK visible");
            return { isExpected: false, shouldGoToNext: false };
        }
        if (!isTargetEqualSign && !expectedGyouKey) {
            console.log("Kigo3 Input Ignored: expectedGyouKey is null for non-equal sign target");
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext = false;

        const expectedKigoKeyCodes = Object.entries(hid2Gyou)
            .filter(([_, name]) => name === '記号')
            .map(([codeStr, _]) => parseInt(codeStr));

        if (isWaitingForSecondKigo.current) { // 2打目待ち状態の場合 (「=」入力)
            if (expectedKigoKeyCodes.includes(pressCode)) {
                if (highlightTimeoutRef.current !== null) {
                    clearTimeout(highlightTimeoutRef.current);
                    highlightTimeoutRef.current = null;
                }
                isWaitingForSecondKigo.current = false;
                setShowHighlightAfterWait(true);
                setStage('kigoInput'); // 次の入力のためにステージを戻す
                isExpected = true;
                if (isRandomMode) {
                    selectNextRandomTarget();
                    shouldGoToNext = false;
                } else {
                    shouldGoToNext = true;
                }
                console.log("Correct second kigo input for '='");
            } else {
                isExpected = false;
                console.log("Incorrect second kigo input for '='");
                setStage('kigoInput');
                isWaitingForSecondKigo.current = false;
                setShowHighlightAfterWait(true);
                if (highlightTimeoutRef.current !== null) {
                    clearTimeout(highlightTimeoutRef.current);
                    highlightTimeoutRef.current = null;
                }
            }
        } else { // 1打目または通常入力
            switch (stage) {
                case 'kigoInput':
                    if (expectedKigoKeyCodes.includes(pressCode)) {
                        if (isTargetEqualSign) {
                            // 「=」の場合、2打目待ちへ
                            isWaitingForSecondKigo.current = true;
                            setShowHighlightAfterWait(false);
                            setStage('kigoInputWait');

                            if (highlightTimeoutRef.current !== null) {
                                clearTimeout(highlightTimeoutRef.current);
                            }
                            highlightTimeoutRef.current = window.setTimeout(() => {
                                setShowHighlightAfterWait(true);
                                highlightTimeoutRef.current = null;
                            }, 500);
                            isExpected = true;
                            console.log("First kigo input for '=', waiting for second");
                        } else {
                            // 「=」以外の場合、行入力へ
                            setStage('gyouInput');
                            isExpected = true;
                            console.log("First kigo input for other symbol, transition to gyouInput");
                        }
                    } else {
                        isExpected = false;
                        console.log("Incorrect first kigo input");
                    }
                    break;

                case 'gyouInput': // 「＝」以外の記号の2打目
                    if (!expectedGyouKey) {
                         console.log("Kigo3 Input Ignored: expectedGyouKey is null");
                         return { isExpected: false, shouldGoToNext: false };
                    }
                    const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                        .filter(([_, name]) => name === expectedGyouKey)
                        .map(([codeStr, _]) => parseInt(codeStr));

                    if (expectedGyouKeyCodes.includes(pressCode)) {
                        isExpected = true;
                        setStage('kigoInput'); // 次の入力のためにステージを戻す
                        if (isRandomMode) {
                            selectNextRandomTarget();
                            shouldGoToNext = false;
                        } else {
                            shouldGoToNext = true;
                        }
                        console.log("Correct gyou input for other symbol");
                    } else {
                        isExpected = false;
                        console.log("Incorrect gyou input for other symbol");
                        setStage('kigoInput');
                    }
                    break;

                case 'kigoInputWait': // 2打目待ち中に予期せぬ入力があった場合
                    isExpected = false;
                    console.log("Unexpected input during kigoInputWait");
                    setStage('kigoInput');
                    isWaitingForSecondKigo.current = false;
                    setShowHighlightAfterWait(true);
                    if (highlightTimeoutRef.current !== null) {
                        clearTimeout(highlightTimeoutRef.current);
                        highlightTimeoutRef.current = null;
                    }
                    break;
            }
        }

        console.log("Kigo3 Result:", { isExpected, shouldGoToNext });
        return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, stage, hid2Gyou, isTargetEqualSign, expectedGyouKey,
        isRandomMode, selectNextRandomTarget, setStage, setShowHighlightAfterWait // handleCorrectAndGoNextRandom, internalOkVisible を削除
    ]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): string | null => {
        if (!isActive || okVisible) {
            return null;
        }
        if (!isTargetEqualSign && !expectedGyouKey) {
            return null;
        }

        // 問題切り替え直後は強制的に 'kigoInput' として扱う (通常モードのみ)
        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = indicesJustChanged ? 'kigoInput' : stage;

        let expectedKeyName: string | null = null;
        const targetLayoutIndex = 2; // 記号3はスタートレイヤーのみ

        if (currentStageForHighlight === 'kigoInputWait') {
            if (key === '記号' && layoutIndex === targetLayoutIndex) {
                return showHighlightAfterWait ? 'bg-blue-100' : null;
            }
            return null;
        }

        switch (currentStageForHighlight) {
            case 'kigoInput':
                expectedKeyName = '記号';
                break;
            case 'gyouInput':
                expectedKeyName = expectedGyouKey;
                break;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return 'bg-blue-100';
        }

        return null;
    }, [
        isActive, okVisible, stage, showHighlightAfterWait, isTargetEqualSign, expectedGyouKey,
        isRandomMode, gIdx, dIdx // internalOkVisible を削除
    ]);

    // isInvalidInputTarget (変更なし)
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;
        // 記号3はスタートレイヤー(layoutIndex=2)のみ対象
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

export default useKigoPractice3;
