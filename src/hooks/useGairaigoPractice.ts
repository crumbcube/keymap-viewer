// /home/coffee/my-keymap-viewer/src/hooks/useGairaigoPractice.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    PracticeHookProps, PracticeHookResult, PracticeInputInfo, PracticeInputResult,
    getHidKeyCodes,
    PracticeHighlightResult,
    CharInfoGairaigo,
    allGairaigoCharInfos,
    PracticeStage, // <<< PracticeStage をインポート
} from './usePracticeCommons';
import { gairaigoPracticeData, GairaigoPracticeTarget } from '../data/keymapData';

// import { stat } from 'fs'; // fsモジュールはブラウザ環境では使えないためコメントアウトまたは削除

const useGairaigoPractice = ({
    gIdx, dIdx, isActive, side, layers, kb, isRandomMode // isRandomMode を受け取る
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<PracticeStage>('key1'); // Use common PracticeStage
    const [pressedKeys, setPressedKeys] = useState<Map<number, number>>(new Map());
    const [randomTarget, setRandomTarget] = useState<CharInfoGairaigo | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevTargetCharRef = useRef<string | null>(null); // Ref to store previous target char
    const prevIsRandomModeRef = useRef(isRandomMode);
    const prevIndicesRef = useRef({ gIdx, dIdx }); // Store previous gIdx and dIdx
    const prevIsActiveRef = useRef(isActive); // isActive の変更を追跡 (命名変更)

    const selectNextRandomTarget = useCallback(() => {
        if (allGairaigoCharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allGairaigoCharInfos.length);
            const nextTarget = allGairaigoCharInfos[randomIndex];
            setRandomTarget(nextTarget);
            setStage('key1'); // 常に最初のステージから
            setPressedKeys(new Map()); // キー押下状態もリセット
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage, setPressedKeys]);

    const reset = useCallback(() => {
        setStage('key1');
        setPressedKeys(new Map());
        setRandomTarget(null); // ランダムターゲットもリセット
        prevTargetCharRef.current = null; // Reset previous target char
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
        // prevIsActiveRef.current は useEffect の最後で更新されるのでここでは不要
    }, [setStage, setPressedKeys, setRandomTarget]); // setRandomTarget を追加

    // Make it a standalone function accepting props
    const calculateCurrentTarget = useCallback((
        currentGIdx: number,
        currentDIdx: number,
        currentIsRandomMode: boolean,
        currentIsActive: boolean,
        currentRandomTarget: CharInfoGairaigo | null
    ): CharInfoGairaigo | null => { // Changed return type
        if (currentIsRandomMode) {
            return currentRandomTarget; // This is already CharInfoGairaigo | null
        } else {
            // 通常モードのロジック
            if (!currentIsActive || currentGIdx < 0 || currentGIdx >= gairaigoPracticeData.length) return null;
            const currentGroup = gairaigoPracticeData[currentGIdx]; // Use passed gIdx
            // App.tsx から渡される dIdx は、このグループの targets 配列のインデックスとして直接使用する
            if (!currentGroup || !currentGroup.targets || currentDIdx < 0 || currentDIdx >= currentGroup.targets.length) {
                // console.warn(`[Gairaigo calculateCurrentTarget] No target found for gIdx=${currentGIdx}, dIdx=${currentDIdx}`);
                return null;
            }

            const gptTarget = currentGroup.targets[currentDIdx];
            // console.log(`[Gairaigo calculateCurrentTarget] Found target for gIdx=${currentGIdx}, dIdx=${currentDIdx}: ${gptTarget?.char}`);

            if (!gptTarget) return null;
            return { ...gptTarget, type: 'gairaigo' }; // Convert to CharInfoGairaigo
        }
    }, []); // No dependencies, it's a pure function based on arguments

    useEffect(() => {
        if (!isActive && prevIsActiveRef.current) {
            reset();
        } else if (isActive) {
            const gIdxChanged = prevGIdxRef.current !== gIdx;
            const dIdxChanged = prevDIdxRef.current !== dIdx;
            const randomModeChanged = prevIsRandomModeRef.current !== isRandomMode;
            const justActivated = !prevIsActiveRef.current && isActive;

            if (randomModeChanged) {
                reset();
                if (isRandomMode) {
                    selectNextRandomTarget();
                }
            } else if (justActivated) { // 練習モードがアクティブになった直後 (isActive が false -> true に変わった)
                if (isRandomMode) {
                    selectNextRandomTarget(); // ランダムモードなら新しいターゲットを選択
                } else {
                    // 通常モードの場合、App.tsx から渡される gIdx, dIdx に基づいて最初のターゲットが決まる
                    // (「いぇ」から始めるには App.tsx 側で gIdx=0, dIdx=0 が渡される想定)
                    console.log(`[Gairaigo useEffect justActivated] Normal mode. gIdx=${gIdx}, dIdx=${dIdx}. Current target will be:`, calculateCurrentTarget(gIdx, dIdx, false, true, null));
                    setStage('key1');
                    setPressedKeys(new Map());
                }
                isInitialMount.current = false; // 初期マウントフラグを解除
            } else if (!isRandomMode && (gIdxChanged || dIdxChanged)) { // 通常モードで、かつ gIdx または dIdx が変更された場合
                setStage('key1'); // ステージをリセット
                setPressedKeys(new Map()); // 押下キーもリセット
                // isInitialMount は変更しない (既に false のはず)
            }
        }

        prevIsActiveRef.current = isActive;
        prevGIdxRef.current = gIdx;
        prevDIdxRef.current = dIdx;
        prevIndicesRef.current = { gIdx, dIdx }; // Update prevIndicesRef here
        prevIsRandomModeRef.current = isRandomMode;
    }, [isActive, gIdx, dIdx, isRandomMode, reset, selectNextRandomTarget, randomTarget, calculateCurrentTarget]);

    // This useEffect for prevGIdxRef/prevDIdxRef might be redundant now with prevIndicesRef
    useEffect(() => {
        prevGIdxRef.current = gIdx;
        prevDIdxRef.current = dIdx;
    }, [isActive, gIdx, dIdx, isRandomMode, reset, selectNextRandomTarget, randomTarget, calculateCurrentTarget]);


    // Calculate currentTarget based on current props for use in other hooks/callbacks - handle undefined isRandomMode
    // This currentTarget will now be CharInfoGairaigo | null
    const currentTarget: CharInfoGairaigo | null = useMemo(() => calculateCurrentTarget(gIdx, dIdx, isRandomMode ?? false, isActive, randomTarget), [gIdx, dIdx, isRandomMode, isActive, randomTarget, calculateCurrentTarget]);

    const expectedKey1Codes = useMemo(() => currentTarget ? getHidKeyCodes(currentTarget.keys[0], layers, kb, side) : [], [currentTarget, layers, kb, side]);
    const expectedKey2Codes = useMemo(() => currentTarget ? getHidKeyCodes(currentTarget.actualSecondKey, layers, kb, side) : [], [currentTarget, layers, kb, side]);
    // Adjust expectedKey3Codes to use actualThirdKey if available
    const expectedKey3Codes = useMemo(() => {
        if (!currentTarget) return [];
        const keyToUse = currentTarget.actualThirdKey ?? currentTarget.keys[2]; // Use actualThirdKey if present
        return getHidKeyCodes(keyToUse, layers, kb, side);
    }, [currentTarget, layers, kb, side]);
    const expectedKey4Codes = useMemo(() => {
        if (currentTarget && currentTarget.keys.length > 3 && currentTarget.keys[3]) {
            return getHidKeyCodes(currentTarget.keys[3], layers, kb, side);
        }
        return [];
    }, [currentTarget, layers, kb, side]);


    const handleInput = useCallback((info: PracticeInputInfo): PracticeInputResult => {
        if (!isActive || !currentTarget) {
            return { isExpected: false, shouldGoToNext: undefined };
        }

        let isExpected = false;
        let shouldGoToNext_final: boolean | undefined = undefined;
        const { type, pressCode } = info;

        if (type === 'press') {
            setPressedKeys(prev => new Map(prev).set(pressCode, Date.now()));
            return { isExpected: false, shouldGoToNext: undefined };
        }

        // --- Release Event ---
        let nextInternalStage: PracticeStage = stage;

        if (stage === 'key1') {
            console.log(`[Gairaigo handleInput key1] Target: ${currentTarget.char}, Expected key1: ${currentTarget.keys[0]}, Expected codes: [${expectedKey1Codes.join(', ')}], pressCode: 0x${pressCode.toString(16)}`);
            if (expectedKey1Codes.includes(pressCode)) {
                console.log(`[Gairaigo handleInput key1] Key1 MATCH!`);
                nextInternalStage = 'key2';
                isExpected = true;
            } else {
                console.log(`[Gairaigo handleInput key1] Key1 NO MATCH.`);
                nextInternalStage = 'key1';
            }
        } else if (stage === 'key2') {
            if (expectedKey2Codes.includes(pressCode)) {
                isExpected = true;
                if (currentTarget.keys.length > 2) {
                    nextInternalStage = 'key3';
                } else {
                    nextInternalStage = 'key1';
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext_final = false;
                    } else {
                        const currentGroupData = gairaigoPracticeData[gIdx];
                        const isLastPracticeItemInGroup = currentGroupData ? dIdx === currentGroupData.targets.length - 1 : false;
                        shouldGoToNext_final = isLastPracticeItemInGroup;
                    }
                }
            } else {
                nextInternalStage = 'key1';
            }
        } else if (stage === 'key3') {
            if (expectedKey3Codes.includes(pressCode)) {
                isExpected = true;
                if (currentTarget.keys.length > 3) {
                    nextInternalStage = 'key4';
                } else {
                    nextInternalStage = 'key1';
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext_final = false;
                    } else {
                        const currentGroupData = gairaigoPracticeData[gIdx];
                        const isLastPracticeItemInGroup = currentGroupData ? dIdx === currentGroupData.targets.length - 1 : false;
                        shouldGoToNext_final = isLastPracticeItemInGroup;
                    }
                }
            } else {
                nextInternalStage = 'key1';
            }
        } else if (stage === 'key4') {
            if (expectedKey4Codes.includes(pressCode)) {
                isExpected = true;
                nextInternalStage = 'key1';
                if (isRandomMode) {
                    selectNextRandomTarget();
                    shouldGoToNext_final = false;
                } else {
                    const currentGroupData = gairaigoPracticeData[gIdx];
                    const isLastPracticeItemInGroup = currentGroupData ? dIdx === currentGroupData.targets.length - 1 : false;
                    shouldGoToNext_final = isLastPracticeItemInGroup;
                }
            } else {
                nextInternalStage = 'key1';
            }
        }

        if (nextInternalStage !== stage) {
            setStage(nextInternalStage);
        } else if (!isExpected && stage !== 'key1') {
            setStage('key1');
        }

        return { isExpected, shouldGoToNext: shouldGoToNext_final };
    }, [
        isActive, stage, currentTarget,
        expectedKey1Codes, expectedKey2Codes, expectedKey3Codes, expectedKey4Codes,
        setStage, isRandomMode, selectNextRandomTarget, gIdx, dIdx
    ]);


    const headingChars = useMemo(() => {
        if (!isActive) return [];

        if (isRandomMode) {
            return currentTarget ? [currentTarget.char] : [];
        } else {
            const currentGroup = gairaigoPracticeData[gIdx] ?? null;
            return currentGroup?.headerChars ?? [];
        }
    }, [isActive, isRandomMode, currentTarget, gIdx]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        // console.log(`[Gairaigo getHighlightClassName ENTRY] key: ${key}, layoutIndex: ${layoutIndex}, currentTarget: ${currentTarget?.char}, stage: ${stage}, isActive: ${isActive}, gIdx: ${gIdx}, dIdx: ${dIdx}`);
        if (!isActive || !currentTarget) {
            // console.log(`[Gairaigo getHighlightClassName] Early exit: isActive=${isActive}, currentTarget=${currentTarget?.char}`);
            return noHighlight;
        }

         // Determine the stage for highlighting, considering if indices just changed
         const gIdxChanged = prevIndicesRef.current.gIdx !== gIdx;
         const dIdxChanged = prevIndicesRef.current.dIdx !== dIdx;
         // console.log(`[Gairaigo getHighlightClassName STAGE_CHECK] gIdx=${gIdx}, prevGIdx=${prevIndicesRef.current.gIdx}, gIdxChanged=${gIdxChanged}, dIdx=${dIdx}, prevDIdx=${prevIndicesRef.current.dIdx}, dIdxChanged=${dIdxChanged}, isInitialMount=${isInitialMount.current}, isActive=${isActive}, stage=${stage}`);
 
         // If in normal mode and indices just changed (and not initial mount),
         // highlight as if it's the first key input stage.
         // isInitialMount.current is handled by useEffect setting stage to 'key1' on activation.
         const currentStageForHighlight = (!isRandomMode && (gIdxChanged || dIdxChanged) && !isInitialMount.current && isActive) // isActiveもチェック
             ? 'key1' // Indices changed, force key1 stage for highlight
              : stage; // stage が undefined の可能性を考慮 (初期状態など)
         // console.log(`[Gairaigo getHighlightClassName STAGE_RESULT] currentStageForHighlight=${currentStageForHighlight}`);

        let expectedKeyName = '';
        let displayKeyName = '';
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === 'key1') {
            expectedKeyName = currentTarget.keys[0];
            // currentTarget.keys[0] が undefined の場合、空文字列を displayKeyName に設定
            displayKeyName = currentTarget.keys[0] ?? '';
            targetLayoutIndex = 2;
            console.log(`[Gairaigo getHighlightClassName Key1] currentTarget: ${currentTarget.char}, expectedKeyName: ${expectedKeyName}, displayKeyName: ${displayKeyName}, targetLayoutIndex: ${targetLayoutIndex}, received key: ${key}, received layoutIndex: ${layoutIndex}`);
        } else if (currentStageForHighlight === 'key2') {
            expectedKeyName = currentTarget.actualSecondKey;
            displayKeyName = currentTarget.keys[1];
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'key3') {
            expectedKeyName = currentTarget.keys.length > 3 ? (currentTarget.actualThirdKey ?? '') : currentTarget.keys[2];
            displayKeyName = currentTarget.keys[2];
            if (expectedKeyName === '濁音') {
                targetLayoutIndex = 2;
            } else if (expectedKeyName.endsWith('段')) {
                targetLayoutIndex = 3;
            } else {
                targetLayoutIndex = 2;
            }
        } else if (currentStageForHighlight === 'key4') {
            const fourthKey = currentTarget.keys.length > 3 ? currentTarget.keys[3] : undefined;
            if (typeof fourthKey === 'string') {
                expectedKeyName = fourthKey;
            }
            displayKeyName = expectedKeyName;
            targetLayoutIndex = 3;
        }

        if (expectedKeyName && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return {
                className: 'bg-blue-100',
                overrideKey: displayKeyName
            };
        }

        return noHighlight;
    }, [stage, currentTarget, isActive, gIdx, dIdx, isRandomMode, prevIndicesRef, isInitialMount]); // Add prevIndicesRef and isInitialMount

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, idx: number): boolean => {
        if (!isActive || !currentTarget) return false;

        let expectedCodes: number[] = [];
        let expectedLayoutIndex: number | null = null;

        if (stage === 'key1') {
            expectedCodes = expectedKey1Codes;
            expectedLayoutIndex = 2;
        } else if (stage === 'key2') {
            expectedCodes = expectedKey2Codes;
            expectedLayoutIndex = 2;
        } else if (stage === 'key3') {
            expectedCodes = currentTarget.actualThirdKey ? getHidKeyCodes(currentTarget.actualThirdKey, layers, kb, side) : expectedKey3Codes;
            const thirdKey = currentTarget.actualThirdKey ?? currentTarget.keys[2];
            expectedLayoutIndex = thirdKey === '濁音' ? 2 : (thirdKey.endsWith('段') ? 3 : 2);
        } else if (stage === 'key4') {
            expectedCodes = expectedKey4Codes;
            expectedLayoutIndex = 3;
        }

        if (expectedCodes.includes(pressCode)) return false;

        const targetKeyIndex = pressCode - 1;
        return layoutIndex === expectedLayoutIndex && idx === targetKeyIndex;
    }, [stage, expectedKey1Codes, expectedKey2Codes, expectedKey3Codes, expectedKey4Codes, currentTarget, isActive, layers, kb, side]);

    const currentTargetChar = useMemo(() => {
        return currentTarget?.char ?? null;
    }, [currentTarget]);

    return { // currentTargetChar を削除し、currentTarget を含める
        handleInput,
        headingChars,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        currentTarget: currentTarget ?? undefined, // This should now be compatible
    };
};

export default useGairaigoPractice;
