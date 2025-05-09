// /home/coffee/my-keymap-viewer/src/hooks/useKigoPractice3.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { kigoPractice3Data, functionKeyMaps, kigoMapping3 } from '../data/keymapData';
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
    CharInfoKigo3,
    allKigo3CharInfos,
    PracticeHighlightResult,
} from './usePracticeCommons';

type KigoPractice3Stage = 'kigoInput' | 'kigoInputWait' | 'gyouInput';

const useKigoPractice3 = ({ gIdx, dIdx, isActive, side, kb, isRandomMode, layers }: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<KigoPractice3Stage>('kigoInput');
    const [showHighlightAfterWait, setShowHighlightAfterWait] = useState(true);
    const isWaitingForSecondKigo = useRef(false);
    const highlightTimeoutRef = useRef<number | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持
    const prevIsRandomModeRef = useRef(isRandomMode);

    const [randomTarget, setRandomTarget] = useState<CharInfoKigo3 | null>(null);

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
        return !!currentInputDef && !currentInputDef.gyouKey;
    }, [isRandomMode, randomTarget, currentInputDef]);

    const currentTargetChar = useMemo(() => {
        if (isRandomMode) return randomTarget?.char ?? null;
        if (!currentGroup?.chars || dIdx < 0 || dIdx >= currentGroup.chars.length) return null;
        return currentGroup.chars[dIdx];
    }, [isRandomMode, randomTarget, currentGroup, dIdx]);

    const expectedGyouKey = useMemo(() => {
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
            setRandomTarget(nextTarget);
            setStage('kigoInput');
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
                setStage('kigoInput');
                isWaitingForSecondKigo.current = false;
                setShowHighlightAfterWait(true);
                if (highlightTimeoutRef.current !== null) {
                    clearTimeout(highlightTimeoutRef.current);
                    highlightTimeoutRef.current = null;
                }
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

        return () => {
            if (highlightTimeoutRef.current !== null) {
                clearTimeout(highlightTimeoutRef.current);
                highlightTimeoutRef.current = null;
            }
        };
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]);


    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        console.log(`[Kigo3 handleInput] Start. Stage: ${stage}, Input pressCode: 0x${inputInfo.pressCode.toString(16)}, TargetChar: ${currentTargetChar}, isTargetEqualSign: ${isTargetEqualSign}, expectedGyouKey: ${expectedGyouKey}`);

        if (!isActive) {
            console.log("[Kigo3 handleInput] Not active.");
            return { isExpected: false, shouldGoToNext: undefined };
        }
        if (!currentTargetChar) {
             console.log("[Kigo3 handleInput] No currentTargetChar.");
            return { isExpected: false, shouldGoToNext: undefined };
        }
        // 「=」以外の場合のみ expectedGyouKey をチェック (currentTargetChar があれば expectedGyouKey も計算されているはずだが念のため)
        if (!isTargetEqualSign && !expectedGyouKey) {
             console.log("[Kigo3 handleInput] Not target '=' and no expectedGyouKey.");
            return { isExpected: false, shouldGoToNext: undefined };
        }
        if (inputInfo.type !== 'release') {
             console.log("[Kigo3 handleInput] Not release event.");
            return { isExpected: false, shouldGoToNext: undefined };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext_final: boolean | undefined = undefined;
        let nextStage: KigoPractice3Stage = stage;

        const layer8 = layers[8] ?? [];
        const getLayer8KeyCode = (keyName: string | null): number => {
            if (!keyName) return -1;
            const index = layer8.findIndex(key => key.trim() === keyName.trim());
            return index !== -1 ? index + 1 : -1;
        };
        const expectedKigoKeyStartCode = getLayer8KeyCode('＝\n記号');
        console.log(`[Kigo3 handleInput] Expected '＝\\n記号' code: ${expectedKigoKeyStartCode}`);


        if (isWaitingForSecondKigo.current) { // 2打目待ち状態の場合 (「=」入力)
            console.log("[Kigo3 handleInput] isWaitingForSecondKigo.current is true (Target is '=').");
            if (pressCode === expectedKigoKeyStartCode) { // 「=」の2打目も「＝\n記号」キー
                console.log("[Kigo3 handleInput] Correct second key for '='.");
                if (highlightTimeoutRef.current !== null) {
                    clearTimeout(highlightTimeoutRef.current);
                    highlightTimeoutRef.current = null;
                }
                isWaitingForSecondKigo.current = false;
                setShowHighlightAfterWait(true);
                nextStage = 'kigoInput';
                isExpected = true;
                if (isRandomMode) {
                    selectNextRandomTarget();
                    shouldGoToNext_final = false;
                } else {
                    const currentGroupData = kigoPractice3Data[gIdx];
                    const isLastInGroup = currentGroupData ? dIdx === currentGroupData.chars.length - 1 : false;
                    shouldGoToNext_final = isLastInGroup;
                }
            } else {
                console.log("[Kigo3 handleInput] Incorrect second key for '='.");
                isExpected = false;
                nextStage = 'kigoInput';
                isWaitingForSecondKigo.current = false;
                setShowHighlightAfterWait(true);
                if (highlightTimeoutRef.current !== null) {
                    clearTimeout(highlightTimeoutRef.current);
                    highlightTimeoutRef.current = null;
                }
                shouldGoToNext_final = undefined;
            }
        } else { // 1打目または通常入力
            console.log(`[Kigo3 handleInput] isWaitingForSecondKigo.current is false. Current stage: ${stage}`);
            switch (stage) {
                case 'kigoInput': // 1打目待ち (「＝\n記号」キーを待つ)
                    console.log(`[Kigo3 handleInput kigoInput] Waiting for '＝\\n記号'. pressCode: ${pressCode}, expected: ${expectedKigoKeyStartCode}`);
                    if (pressCode === expectedKigoKeyStartCode) { // 1打目は「＝\n記号」キー
                        console.log("[Kigo3 handleInput kigoInput] Correct first key '＝\\n記号'.");
                        if (isTargetEqualSign) {
                            console.log("[Kigo3 handleInput kigoInput] Target is '='. Transitioning to kigoInputWait.");
                            isWaitingForSecondKigo.current = true;
                            setShowHighlightAfterWait(false);
                            nextStage = 'kigoInputWait';
                            if (highlightTimeoutRef.current !== null) clearTimeout(highlightTimeoutRef.current);
                            highlightTimeoutRef.current = window.setTimeout(() => {
                                setShowHighlightAfterWait(true);
                                highlightTimeoutRef.current = null;
                            }, 500);
                            isExpected = true;
                            shouldGoToNext_final = undefined; // 「=」の入力はまだ完了していない
                        } else {
                            console.log("[Kigo3 handleInput kigoInput] Target is NOT '='. Transitioning to gyouInput.");
                            nextStage = 'gyouInput';
                            isExpected = true;
                            shouldGoToNext_final = undefined; // 記号入力はまだ完了していない
                        }
                    } else {
                        console.log("[Kigo3 handleInput kigoInput] Incorrect first key.");
                        isExpected = false;
                        nextStage = 'kigoInput'; // Stay in kigoInput stage on error
                        shouldGoToNext_final = undefined;
                    }
                    break;

                case 'gyouInput': // 「＝」以外の記号の2打目 (ターゲット記号そのものを待つ)
                    // expectedGyouKey はターゲット記号そのものではなく、その記号に対応する「行」の名前 ('あ行'など)
                    // 2打目で待つのはレイヤー8上のターゲット記号そのもの
                    const expectedSymbolKeyCode = getLayer8KeyCode(currentTargetChar); // ターゲット記号そのものでキーコードを探す
                    console.log(`[Kigo3 handleInput gyouInput] Waiting for target symbol '${currentTargetChar}'. pressCode: ${pressCode}, expected: ${expectedSymbolKeyCode}`);

                    if (expectedSymbolKeyCode !== -1 && pressCode === expectedSymbolKeyCode) {
                        console.log("[Kigo3 handleInput gyouInput] Correct second key (target symbol).");
                        isExpected = true;
                        nextStage = 'kigoInput'; // 完了して次へ (次の文字の1打目待ちへ)
                        if (isRandomMode) {
                            selectNextRandomTarget();
                            shouldGoToNext_final = false; // App.tsx は gIdx/dIdx を進めない
                        } else {
                            const currentGroupData = kigoPractice3Data[gIdx];
                            const isLastInGroup = currentGroupData ? dIdx === currentGroupData.chars.length - 1 : false;
                            shouldGoToNext_final = isLastInGroup; // グループの最後の文字なら App.tsx は gIdx を進める
                        }
                    } else {
                        console.log("[Kigo3 handleInput gyouInput] Incorrect second key.");
                        isExpected = false;
                        nextStage = 'kigoInput'; // Reset to the beginning of the sequence on error
                        shouldGoToNext_final = undefined;
                    }
                    break;

                case 'kigoInputWait': // 2打目待ち中に予期せぬ入力があった場合 (「=」の2打目待ち中に別のキーを押した場合)
                    console.log("[Kigo3 handleInput kigoInputWait] Unexpected input during wait.");
                    isExpected = false;
                    nextStage = 'kigoInput'; // Reset
                    isWaitingForSecondKigo.current = false;
                    setShowHighlightAfterWait(true);
                    if (highlightTimeoutRef.current !== null) {
                        clearTimeout(highlightTimeoutRef.current);
                        highlightTimeoutRef.current = null;
                    }
                    shouldGoToNext_final = undefined;
                    break;
            }
        }

        console.log(`[Kigo3 handleInput] End of logic. isExpected=${isExpected}, shouldGoToNext_final=${shouldGoToNext_final}, nextStage=${nextStage}, currentStage=${stage}`);

        if (nextStage !== stage) {
            setStage(nextStage);
        } else if (!isExpected && stage !== 'kigoInput') {
            // 不正解で、かつ現在のステージが最初の入力ステージでない場合、最初の入力ステージに戻す
            // (gyouInput や kigoInputWait で間違えた場合)
            console.log(`[Kigo3 handleInput] Incorrect input in stage ${stage}, resetting to kigoInput.`);
            setStage('kigoInput');
            if (isWaitingForSecondKigo.current) { // 「=」の2打目待ちだった場合のリセット処理
                isWaitingForSecondKigo.current = false;
                setShowHighlightAfterWait(true);
                if (highlightTimeoutRef.current !== null) {
                    clearTimeout(highlightTimeoutRef.current);
                    highlightTimeoutRef.current = null;
                }
            }
        }

        console.log(`[Kigo3 handleInput] Returning: isExpected=${isExpected}, shouldGoToNext=${shouldGoToNext_final}`);
        return { isExpected, shouldGoToNext: shouldGoToNext_final };
    }, [
        isActive, stage, layers, isTargetEqualSign, expectedGyouKey, currentTargetChar,
        isRandomMode, selectNextRandomTarget, setStage, setShowHighlightAfterWait,
        gIdx, dIdx
    ]);

    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        // console.log(`[Kigo3 getHighlight] Start. keyName: ${keyName}, layoutIndex: ${layoutIndex}, stage: ${stage}, targetChar: ${currentTargetChar}, isTargetEqualSign: ${isTargetEqualSign}, showHighlightAfterWait: ${showHighlightAfterWait}`);

        if (!isActive) {
            // console.log("[Kigo3 getHighlight] Not active.");
            return noHighlight;
        }
        if (!currentTargetChar) {
             // console.log("[Kigo3 getHighlight] No currentTargetChar.");
             return noHighlight;
        }
        // 「=」以外の場合のみ expectedGyouKey をチェック (currentTargetChar があれば expectedGyouKey も計算されているはずだが念のため)
        if (!isTargetEqualSign && !expectedGyouKey) {
             // console.log("[Kigo3 getHighlight] Not target '=' and no expectedGyouKey.");
             return noHighlight;
        }


        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        // ステージ判定ロジックをシンプルに。useEffect がステージを正しく管理するはず。
        // ただし、kigoInputWait ステージのハイライトは showHighlightAfterWait に依存する。
        const currentStageForHighlight = stage; // indicesJustChanged の判定は不要に

        let expectedKeyDisplayName: string | null = null;
        const targetLayoutIndex = 8; // 記号3はレイヤー8のみ

        const equalSignKeyName = '＝\n記号';

        if (currentStageForHighlight === 'kigoInputWait') {
            // 「=」の2打目待ち。期待されるのは「＝\n記号」キー。
            // showHighlightAfterWait が false の間はハイライトしない。
            if (keyName === equalSignKeyName && layoutIndex === targetLayoutIndex) {
                // console.log(`[Kigo3 getHighlight] Stage kigoInputWait. Key: ${keyName}, Layout: ${layoutIndex}. showHighlightAfterWait: ${showHighlightAfterWait}`);
                return { className: showHighlightAfterWait ? 'bg-blue-100' : null, overrideKey: null };
            }
            return noHighlight;
        }

        // kigoInputWait 以外のステージ
        if (currentStageForHighlight === 'kigoInput') {
            // 1打目待ち。期待されるのは「＝\n記号」キー。
            expectedKeyDisplayName = equalSignKeyName;
        } else if (currentStageForHighlight === 'gyouInput') {
            // 2打目待ち (「=」以外)。期待されるのはターゲット記号そのもの。
            expectedKeyDisplayName = currentTargetChar;
        }

        // console.log(`[Kigo3 getHighlight] Stage ${currentStageForHighlight}. Expected key: ${expectedKeyDisplayName}, Target layout: ${targetLayoutIndex}. Received key: ${keyName}, Received layout: ${layoutIndex}`);

        if (expectedKeyDisplayName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyDisplayName) {
            // console.log(`[Kigo3 getHighlight] Match! Highlighting key: ${keyName}`);
            return { className: 'bg-blue-100', overrideKey: null };
        }

        return noHighlight;
    }, [
        isActive, stage, showHighlightAfterWait, isTargetEqualSign, expectedGyouKey, currentTargetChar,
        // gIdx, dIdx, isRandomMode は不要に
    ]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;
        // 記号3はレイヤー8のみ対象
        const isTarget = layoutIndex === 8 && keyIndex === targetKeyIndex;
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

export default useKigoPractice3;
