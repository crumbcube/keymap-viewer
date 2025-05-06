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

import { stat } from 'fs';

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
    const prevIsActive = useRef(isActive); // isActive の変更を追跡

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
        prevIsActive.current = false; // reset 時は false に
    }, [setStage, setPressedKeys, setRandomTarget]); // setRandomTarget を追加

    // Make it a standalone function accepting props
    const calculateCurrentTarget = useCallback((
        currentGIdx: number,
        currentDIdx: number,
        currentIsRandomMode: boolean,
        currentIsActive: boolean,
        currentRandomTarget: CharInfoGairaigo | null
    ): GairaigoPracticeTarget | null => {
        if (currentIsRandomMode) {
            // ランダムモード時は randomTarget をそのまま GairaigoPracticeTarget 相当として扱う
            // (CharInfoGairaigo は GairaigoPracticeTarget と互換性がある)
            return currentRandomTarget as GairaigoPracticeTarget | null;
        } else {
            // 通常モードのロジック
            if (!currentIsActive || currentGIdx < 0 || currentGIdx >= gairaigoPracticeData.length) return null;
            const currentGroup = gairaigoPracticeData[currentGIdx]; // Use passed gIdx
            let targetIndex = currentDIdx; // Use passed dIdx

            // ★★★ 「いぁ」グループ (gIdx=0) の特別処理 ★★★
            if (currentGIdx === 0) {
                // gIdx=0 のターゲットは常に "いぇ" (targets[0]) とする
                // App.tsx 側で dIdx=3 になるはずだが、開始時(dIdx=0)も考慮
                targetIndex = 0;
            }
            // ★★★ 「うぁ」グループ (gIdx=1) の特別処理 ★★★
            else if (currentGIdx === 1) {
                // targets 配列のインデックス (0, 1, 2) に合わせる
               if (currentDIdx === 0 || currentDIdx === 1) targetIndex = 0; // うぃ (targets[0])
               else if (currentDIdx === 2 || currentDIdx === 3) targetIndex = 1; // うぇ (targets[1])
               else if (currentDIdx === 4) targetIndex = 2; // うぉ (targets[2])
               else targetIndex = -1; // 範囲外はターゲットなし
            }
            // ★★★ 「くぁ」グループ (gIdx=2) の targetIndex マッピングを修正 ★★★
            else if (currentGIdx === 2) {
                if (currentDIdx === 0) targetIndex = 0; // くぁ -> targets[0]
                else if (currentDIdx === 1) targetIndex = 1; // くぃ -> targets[1]
                else if (currentDIdx === 2) { // くぅ -> targets[2] (くぇのデータ) - 練習対象外だが便宜上
                    targetIndex = 2;
                    console.log(`[Gairaigo currentTarget] Ku group (gIdx=2), dIdx=2 (Ku), setting targetIndex to 2 (Ke)`);
                } else if (currentDIdx === 3) targetIndex = 2; // くぇ -> targets[2]
                else if (currentDIdx === 4) targetIndex = 3; // くぉ -> targets[3] // ★★★ 修正: dIdx=4 の場合 targetIndex=3 ★★★
                else targetIndex = -1; // 範囲外
            }
            // ★★★ 「つぁ」グループ (gIdx=4) の targetIndex マッピングを追加 ★★★
            else if (currentGIdx === 4) {
                if (currentDIdx === 0) targetIndex = 0; // つぁ -> targets[0]
                else if (currentDIdx === 1) targetIndex = 1; // つぃ -> targets[1]
                else if (currentDIdx === 2) { // つぅ -> targets[2] (つぇのデータ)
                    targetIndex = 2;
                    console.log(`[Gairaigo currentTarget] Tsu group (gIdx=4), dIdx=2 (Tsuu), setting targetIndex to 2 (Tse)`);
                } else if (currentDIdx === 3) targetIndex = 2; // つぇ -> targets[2]
                else if (currentDIdx === 4) targetIndex = 3; // つぉ -> targets[3]
                else targetIndex = -1; // 範囲外
            }
            // ★★★ 「すぁ」グループ (gIdx=3) の targetIndex マッピングを追加 ★★★
            else if (currentGIdx === 3) {
                if (currentDIdx === 1) targetIndex = 0; // すぃ -> targets[0]
                else targetIndex = -1; // それ以外はターゲットなし
            }
            // ★★★ 「てぁ」グループ (gIdx=5) の targetIndex マッピングを追加 ★★★
            else if (currentGIdx === 5) {
                if (currentDIdx === 1) targetIndex = 0; // てぃ -> targets[0]
                else targetIndex = -1; // それ以外はターゲットなし
            }
            // ★★★ 「とぁ」グループ (gIdx=6) の targetIndex マッピングを追加 ★★★
            else if (currentGIdx === 6) {
                if (currentDIdx === 2) targetIndex = 0; // とぅ -> targets[0]
                else targetIndex = -1; // それ以外はターゲットなし
            }
            // ★★★ 「ふぁ」グループ (gIdx=7) の targetIndex マッピングを追加 ★★★
            else if (currentGIdx === 7) {
                if (currentDIdx === 0) targetIndex = 0; // ふぁ -> targets[0]
                else if (currentDIdx === 1) targetIndex = 1; // ふぃ -> targets[1]
                // dIdx === 2 is skipped
                else if (currentDIdx === 3) targetIndex = 2; // ふぇ -> targets[2]
                else if (currentDIdx === 4) targetIndex = 3; // ふぉ -> targets[3]
                else targetIndex = -1; // 範囲外
            }
            // ★★★ 「ヴぁ」グループ (gIdx=8) の targetIndex マッピングを追加 ★★★
            else if (currentGIdx === 8) {
                // For gIdx=8, dIdx 0, 1, 3, 4 map to targetIndex 0, 1, 3, 4
                // dIdx 2 (ヴ) is skipped, so map it to -1 or a placeholder if needed
                if (currentDIdx === 2) targetIndex = -1; // Skip ヴ
                else if (currentDIdx >= 0 && currentDIdx <= 4) targetIndex = currentDIdx;
                else targetIndex = -1;
            }
            // ★★★ ここまで ★★★

            // targetIndex を使ってターゲットを取得
            if (targetIndex === -1) return null; // ターゲットなしの場合
            if (!currentGroup?.targets || targetIndex < 0 || targetIndex >= currentGroup.targets.length) return null;
            // ★★★ この行があるか確認 ★★★
            console.log(`[Gairaigo currentTarget] Final targetIndex: ${targetIndex}, Target:`, currentGroup.targets[targetIndex]);
            return (currentGroup.targets[targetIndex] ?? null) as GairaigoPracticeTarget | null;
        }
    }, []); // No dependencies, it's a pure function based on arguments

    useEffect(() => {
        // --- Inactive: Reset everything ---
        if (!isActive) {
            if (prevIsActive.current) { // Only reset if it *was* active
                console.log('[Gairaigo useEffect] Resetting because isActive became false.');
                reset();
            }
            prevIsActive.current = isActive;
            prevIsRandomModeRef.current = isRandomMode; // Keep track even when inactive
            prevGIdxRef.current = gIdx;
            prevDIdxRef.current = dIdx;
            return;
        }

        // --- Active: Handle changes ---
        const gIdxChanged = prevGIdxRef.current !== gIdx;
        const dIdxChanged = prevDIdxRef.current !== dIdx; // Check dIdx change
        const randomModeChanged = prevIsRandomModeRef.current !== isRandomMode;
        const justActivated = !prevIsActive.current && isActive;

        // Calculate potential new target based on current props
         const potentialNewTarget = calculateCurrentTarget(gIdx, dIdx, isRandomMode ?? false, isActive, randomTarget); // Pass props directly, handle undefined isRandomMode
        const targetCharChanged = potentialNewTarget?.char !== prevTargetCharRef.current;

        // Log comparison details
        console.log(`[Gairaigo useEffect] Comparing: prevGIdx=${prevGIdxRef.current}, gIdx=${gIdx}, prevDIdx=${prevDIdxRef.current}, dIdx=${dIdx}, prevRandom=${prevIsRandomModeRef.current}, isRandomMode=${isRandomMode}`);
        console.log(`[Gairaigo useEffect] Target Check: prevTarget='${prevTargetCharRef.current}', potentialNewTarget='${potentialNewTarget?.char}', targetCharChanged=${targetCharChanged}`);

        console.log(`[Gairaigo useEffect] Checking conditions. isActive=${isActive}, justActivated=${justActivated}, gIdxChanged=${gIdxChanged}, dIdxChanged=${dIdxChanged}, randomModeChanged=${randomModeChanged}`);

        // --- Mode Switch ---
        if (randomModeChanged) {
            console.log(`[Gairaigo useEffect] Resetting due to randomMode change (to ${isRandomMode}).`);
            reset(); // Reset state completely on mode switch
            if (isRandomMode) {
                console.log('[Gairaigo useEffect] Selecting initial random target after mode switch.');
                selectNextRandomTarget();
            }
            // No need to calculate normal target here, reset handles it implicitly if needed later
        }
        // --- Activation or Index Change (Normal Mode) ---
        // ★★★ Modify condition to check if target character actually changed ★★★
        else if (!isRandomMode && (justActivated || targetCharChanged)) {
             console.log(`[Gairaigo useEffect] Resetting stage for Normal Mode (justActivated=${justActivated}, targetCharChanged=${targetCharChanged}).`);
             console.log(`[Gairaigo useEffect] --> Calling setStage('key1')`); // ★★★ Add log here ★★★
             // Only reset the stage, keep the target calculation logic separate
             setStage('key1');
             setPressedKeys(new Map()); // Also reset pressed keys
             // Target calculation happens naturally due to gIdx/dIdx props changing
        }
        // --- Initial Random Target Selection ---
        else if (isRandomMode && (justActivated || !randomTarget)) {
             console.log(`[Gairaigo useEffect] Selecting random target (justActivated=${justActivated}, no target=${!randomTarget}).`);
            selectNextRandomTarget();
        }

        // Save current state for next comparison
        prevTargetCharRef.current = potentialNewTarget?.char ?? null; // Update previous target char
        prevIsActive.current = isActive;
        prevGIdxRef.current = gIdx;
        prevDIdxRef.current = dIdx;
        prevIsRandomModeRef.current = isRandomMode;

    // Add dIdx to dependency array as its change needs to be detected
    }, [isActive, gIdx, dIdx, isRandomMode, reset, selectNextRandomTarget, randomTarget, calculateCurrentTarget]);


    // Calculate currentTarget based on current props for use in other hooks/callbacks - handle undefined isRandomMode
    const currentTarget = useMemo(() => calculateCurrentTarget(gIdx, dIdx, isRandomMode ?? false, isActive, randomTarget), [gIdx, dIdx, isRandomMode, isActive, randomTarget, calculateCurrentTarget]);

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


    const handleInput = useCallback((info: PracticeInputInfo): PracticeInputResult => { // 戻り値の型を修正

        // currentTarget が null の場合も早期リターン
        if (!isActive || !currentTarget) {
            console.log(`[Gairaigo handleInput] Return early. isActive=${isActive}, currentTarget=`, currentTarget);
            return { isExpected: false, shouldGoToNext: false };
        }

        let isExpected = false;
        let shouldGoToNext = false;
        const { type, pressCode } = info;

        if (type === 'press') {
            console.log(`[Gairaigo handleInput] Press event, code: 0x${pressCode.toString(16)}`);
            setPressedKeys(prev => new Map(prev).set(pressCode, Date.now()));
            return { isExpected: false, shouldGoToNext: false };
        }

        // --- Release Event ---
        let nextStage: PracticeStage | null = null;

        console.log(`[Gairaigo handleInput] Release event, code: 0x${pressCode.toString(16)}, currentStage: ${stage}, target: ${currentTarget.char} (gIdx=${gIdx}, dIdx=${dIdx})`); // Add gIdx/dIdx

        if (stage === 'key1') {
            if (expectedKey1Codes.includes(pressCode)) {
                nextStage = 'key2';
                isExpected = true;
            } else {
                nextStage = 'key1'; // ミス時はリセット
            }
            shouldGoToNext = false; // Never advance after key1
            console.log(`[Gairaigo handleInput key1] ExpectedCodes: [${expectedKey1Codes.map(c => `0x${c.toString(16)}`).join(', ')}], Got: 0x${pressCode.toString(16)}, Result: isExpected=${isExpected}, nextStage=${nextStage}, shouldGoToNext=${shouldGoToNext}`); // Improve log
        } else if (stage === 'key2') {
            if (expectedKey2Codes.includes(pressCode)) {
                // Check if there's a 3rd key defined for this target
                if (currentTarget.keys.length > 2) { // Check if keys[2] exists
                    nextStage = 'key3'; // Go to key3
                } else {
                    nextStage = 'key1'; // Finish 2-key sequence (unlikely for gairaigo)
                    // shouldGoToNext will be determined later based on nextStage === 'key1'
                }
                isExpected = true;
            } else {
                nextStage = 'key1'; // ミス時はリセット
            }
            shouldGoToNext = false; // Never advance after key2 unless it's the end (handled below)
            console.log(`[Gairaigo handleInput key2] ExpectedCodes: [${expectedKey2Codes.map(c => `0x${c.toString(16)}`).join(', ')}], Got: 0x${pressCode.toString(16)}, Result: isExpected=${isExpected}, nextStage=${nextStage}, shouldGoToNext=${shouldGoToNext}`); // Improve log
        } else if (stage === 'key3') {
            if (expectedKey3Codes.includes(pressCode)) {
                // Check if this was the *actual* 3rd key of a 4-key sequence
                if (currentTarget.keys.length > 3) {
                    nextStage = 'key4'; // Go to key4
                } else {
                    nextStage = 'key1'; // Finish (3-key sequence)
                    // shouldGoToNext will be determined later based on nextStage === 'key1'
                }
                isExpected = true;
            } else {
                nextStage = 'key1'; // ミス時はリセット
            }
            shouldGoToNext = false; // Never advance after key3 unless it's the end (handled below)
            console.log(`[Gairaigo handleInput key3] ExpectedCodes: [${expectedKey3Codes.map(c => `0x${c.toString(16)}`).join(', ')}], Got: 0x${pressCode.toString(16)}, Result: isExpected=${isExpected}, nextStage=${nextStage}, shouldGoToNext=${shouldGoToNext}`); // Improve log
        } else if (stage === 'key4') { // Handle key4 stage
            if (expectedKey4Codes.includes(pressCode)) {
                nextStage = 'key1'; // Finish and go to next char
                isExpected = true;
                // shouldGoToNext will be determined later based on nextStage === 'key1'
            } else {
                nextStage = 'key1'; // Reset on miss
            }
            shouldGoToNext = false; // Never advance after key4 unless it's the end (handled below)
            console.log(`[Gairaigo handleInput key4] ExpectedCodes: [${expectedKey4Codes.map(c => `0x${c.toString(16)}`).join(', ')}], Got: 0x${pressCode.toString(16)}, Result: isExpected=${isExpected}, nextStage=${nextStage}, shouldGoToNext=${shouldGoToNext}`);
        }


        // Determine if App.tsx should advance based on finishing the sequence
        shouldGoToNext = isExpected && nextStage === 'key1' && !isRandomMode;

        if (nextStage === 'key1' && isExpected && shouldGoToNext) { // Only advance if finished and shouldGoToNext is true
            if (isRandomMode) {
                selectNextRandomTarget();
                shouldGoToNext = false; // Prevent App.tsx from advancing
            }
            // For normal mode, shouldGoToNext remains true
        }

        if (nextStage && nextStage !== stage) {
            console.log(`[Gairaigo handleInput] Setting stage from ${stage} to ${nextStage}`);
            setStage(nextStage);
        } else if (!isExpected && stage !== 'key1') {
            console.log(`[Gairaigo handleInput] Incorrect input, resetting stage to key1`);
            setStage('key1');
        }

        // ★★★ Return the final result ★★★
        return { isExpected, shouldGoToNext };

    // isRandomMode, selectNextRandomTarget を依存配列に追加
    }, [stage, currentTarget, expectedKey1Codes, expectedKey2Codes, expectedKey3Codes, expectedKey4Codes, setStage, isActive, isRandomMode, selectNextRandomTarget, gIdx, dIdx]); // Add expectedKey4Codes


    const headingChars = useMemo(() => {
        if (!isActive) return [];

        if (isRandomMode) {
            // ランダムモード時はターゲット文字のみ表示
            return currentTarget ? [currentTarget.char] : [];
        } else {
            // 通常モード時はグループのヘッダー文字を表示
            const currentGroup = gairaigoPracticeData[gIdx] ?? null;
            return currentGroup?.headerChars ?? [];
        }
    }, [isActive, isRandomMode, currentTarget, gIdx]); // currentTarget, gIdx を依存配列に追加

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        // currentTarget が null の場合も早期リターン
        if (!isActive || !currentTarget) { console.log(`[Gairaigo getHighlight] Return early. isActive=${isActive}, currentTarget=`, currentTarget); return noHighlight; } // Add log
        console.log(`[Gairaigo getHighlight] Inside callback. currentTarget:`, currentTarget, `stage: ${stage}`); // ★★★ デバッグログ追加 ★★★

        const currentStageForHighlight = stage; // <<< 常に現在のステージを見る

        let expectedKeyName = ''; // 期待される実際のキー名
        let displayKeyName = ''; // 上書き表示するキー名
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === 'key1') {
            expectedKeyName = currentTarget.keys[0]; // あ行, か行, ...
            console.log(`[Gairaigo getHighlight] Stage key1, expectedKey from currentTarget.keys[0]: "${expectedKeyName}"`); // ★★★ デバッグログ追加 ★★★
            displayKeyName = expectedKeyName; // 表示はそのまま
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'key2') {
            expectedKeyName = currentTarget.actualSecondKey; // さ行, ま行, ら行, 拗音
            displayKeyName = currentTarget.keys[1]; // 拗音, 拗2, 拗3, 拗4
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'key3') {
            // If 4 keys, key3 expects actualThirdKey, displays keys[2]
            // If 3 keys, key3 expects keys[2] (段キー), displays keys[2]
            expectedKeyName = currentTarget.keys.length > 3 ? (currentTarget.actualThirdKey ?? '') : currentTarget.keys[2];
            displayKeyName = currentTarget.keys[2]; // Display name is always keys[2]
            // Determine layout based on the *expected* key
            if (expectedKeyName === '濁音') {
                targetLayoutIndex = 2; // 濁音 is on layout 2
            } else if (expectedKeyName.endsWith('段')) {
                targetLayoutIndex = 3;
            } else {
                targetLayoutIndex = 2; // Default for other 3rd keys if any (shouldn't happen often)
            }
        } else if (currentStageForHighlight === 'key4') {
            // Ensure keys[3] exists and is a string
            const fourthKey = currentTarget.keys.length > 3 ? currentTarget.keys[3] : undefined;
            if (typeof fourthKey === 'string') {
                expectedKeyName = fourthKey; // Always the 4th key (段キー)
            }
            displayKeyName = expectedKeyName;
            targetLayoutIndex = 3; // 段キー is on layout 3
        }

        console.log(`[Gairaigo getHighlight] Target: ${currentTarget.char}, Stage: ${currentStageForHighlight}, Layout: ${layoutIndex}, Key: "${key}", ExpectedKey: "${expectedKeyName}", DisplayKey: "${displayKeyName}", TargetLayout: ${targetLayoutIndex}`); // Add target char
        // ★★★ デバッグログ追加 ★★★
        // 実際のキー (key) が期待されるキー (expectedKeyName) と一致し、
        // ★★★ 追加ログ: 比較直前の値を確認 ★★★
        console.log(`[Gairaigo getHighlight] Checking condition: expectedKeyName="${expectedKeyName}", layoutIndex=${layoutIndex}, targetLayoutIndex=${targetLayoutIndex}, key="${key}"`);
        // かつレイヤーが一致する場合にハイライトと表示上書きを行う
        if (expectedKeyName && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            console.log(`[Gairaigo getHighlight] ---> MATCH FOUND! Highlighting key "${key}"`); // ★★★ Move log inside condition ★★★
            return {
                className: 'bg-blue-100',
                overrideKey: displayKeyName // 上書き表示するキー名を返す
            };
        }

        return noHighlight;
    // ★★★ 依存配列から isRandomMode, gIdx, dIdx を削除 (currentTarget がこれらに依存しているため) ★★★
    }, [stage, currentTarget, isActive]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, idx: number): boolean => {
        // currentTarget が null の場合は常に false
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
            // Use actualThirdKey if it exists for expected codes
            expectedCodes = currentTarget.actualThirdKey ? getHidKeyCodes(currentTarget.actualThirdKey, layers, kb, side) : expectedKey3Codes;
            const thirdKey = currentTarget.actualThirdKey ?? currentTarget.keys[2]; // Check actual key for layout
            expectedLayoutIndex = thirdKey === '濁音' ? 2 : (thirdKey.endsWith('段') ? 3 : 2);
        } else if (stage === 'key4') {
            expectedCodes = expectedKey4Codes;
            // Assuming 4th key is always a Dan key
            expectedLayoutIndex = 3;
        }


        // 期待されるキーコードに含まれていれば不正入力ではない
        if (expectedCodes.includes(pressCode)) return false;

        // 期待されるレイヤーで、かつ押されたキーのインデックスが一致する場合のみ不正入力ターゲット
        const targetKeyIndex = pressCode - 1;
        return layoutIndex === expectedLayoutIndex && idx === targetKeyIndex;
    // Add expectedKey4Codes
    }, [stage, expectedKey1Codes, expectedKey2Codes, expectedKey3Codes, expectedKey4Codes, currentTarget, isActive, layers, kb, side]);


    return {
        handleInput,
        headingChars,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
    };
};

export default useGairaigoPractice;
