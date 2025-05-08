// /home/coffee/my-keymap-viewer/src/hooks/useSeionPractice.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    PracticeHookProps,
    PracticeHookResult,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHighlightResult,
    hid2Gyou,
    hid2Dan,
} from './usePracticeCommons';
import { gyouList, danOrder, gyouChars, danList } from '../data/keymapData';

type SeionStage = 'gyouInput' | 'danInput';

const useSeionPractice = ({
    gIdx: initialGIdx,
    dIdx: initialDIdx,
    isActive,
    side,
    layers, // layers は handleInput で使うので必要
    kb,
    isRandomMode,
}: PracticeHookProps): PracticeHookResult => {
    // gIdx, dIdx は props から受け取った値を初期値として内部状態を持つ
    const [gIdx, setGIdx] = useState(initialGIdx);
    const [dIdx, setDIdx] = useState(initialDIdx);
    const [targetChar, setTargetChar] = useState<string | null>(null);
    const [stage, setStage] = useState<SeionStage>('gyouInput');
    const [randomTarget, setRandomTarget] = useState<{ char: string; gyouKey: string; danKey: string } | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持
    const prevIsRandomModeRef = useRef(isRandomMode);

    // --- 期待されるキー名の計算 ---
    const expectedGyouKey = useMemo(() => {
        if (!isActive) return null;
        if (isRandomMode) return randomTarget?.gyouKey ?? null;
        // 通常モード: 内部状態の gIdx を使用
        if (gIdx < 0 || gIdx >= gyouList.length) return null;
        return gyouList[gIdx];
    }, [isActive, isRandomMode, randomTarget, gIdx]); // 内部状態の gIdx に依存

    const expectedDanKey = useMemo(() => {
        if (!isActive) return null;
        if (isRandomMode) return randomTarget?.danKey ?? null;
        // 通常モード: 内部状態の gIdx, dIdx を使用
        if (gIdx < 0 || gIdx >= gyouList.length) return null;
        const currentGyouKey = gyouList[gIdx];
        // ▼▼▼ や行の特別処理 ▼▼▼
        if (currentGyouKey === 'や行') {
            if (dIdx === 0) return 'あ段'; // や
            if (dIdx === 1) return 'う段'; // ゆ
            if (dIdx === 2) return 'お段'; // よ
            return null; // や行にはこれ以外の dIdx はないはず
        }
        // ▲▲▲ や行の特別処理 ▲▲▲
        const list = danOrder[currentGyouKey]; // ['あ', 'い', 'う', 'え', 'お'] など
        const charsForGyou = gyouChars[currentGyouKey]; // ['あ', 'い', 'う', 'え', 'お'] など
        if (!list || !charsForGyou || dIdx < 0 || dIdx >= list.length || dIdx >= charsForGyou.length) return null;
        const char = charsForGyou[dIdx]; // dIdxから文字を取得
        const charIndex = list.findIndex(c => c === char); // danOrderで文字のindexを探す
        if (charIndex === -1 || charIndex >= danList.length) return null;
        return danList[charIndex]; // indexからdanListで段名を取得
    }, [isActive, isRandomMode, randomTarget, gIdx, dIdx]); // 内部状態の gIdx, dIdx に依存


    // --- ターゲット文字と対応キーの計算ロジック ---
    const calculateTarget = useCallback(() => {
        if (!isActive) return;

        if (isRandomMode) {
            const allSeion: { char: string; gyouKey: string; danKey: string }[] = [];
            gyouList.forEach((gyouKey) => {
                const actualCharsInGyou = gyouChars[gyouKey]; // 実際の文字リストを取得 (例: や行なら ['や', 'ゆ', 'よ'])
                if (actualCharsInGyou) {
                    actualCharsInGyou.forEach((char) => { // 実際の文字でループ
                        let determinedDanKey: string | null = null;
                        if (gyouKey === 'や行') {
                            // や行の特殊マッピング
                            if (char === 'や') determinedDanKey = 'あ段';
                            else if (char === 'ゆ') determinedDanKey = 'う段';
                            else if (char === 'よ') determinedDanKey = 'お段';
                        } else {
                            // や行以外：danOrderでの文字の位置からdanListのインデックスを取得して段キーを決定
                            const charDisplayIndex = danOrder[gyouKey]?.indexOf(char);
                            if (charDisplayIndex !== -1 && charDisplayIndex !== undefined && charDisplayIndex < danList.length) {
                                determinedDanKey = danList[charDisplayIndex];
                            }
                        }

                        if (determinedDanKey) {
                            allSeion.push({ char, gyouKey, danKey: determinedDanKey });
                        }
                    }
                );
            }
        });

            if (allSeion.length > 0) {
                const randomIndex = Math.floor(Math.random() * allSeion.length);
                const newTarget = allSeion[randomIndex];
                setRandomTarget(newTarget);
                setTargetChar(newTarget.char);
                setStage('gyouInput');
                // console.log(`[Seion Random] New target: ${newTarget.char} (Gyou: ${newTarget.gyouKey}, Dan: ${newTarget.danKey})`);
            } else {
                console.error("[Seion Random] No seion characters found.");
                setRandomTarget(null);
                setTargetChar(null);
            }
        } else {
            // 通常モード: 内部状態の gIdx, dIdx を使用
            if (gIdx < 0 || gIdx >= gyouList.length) {
                // console.error(`[Seion Normal] Invalid gIdx: ${gIdx}`);
                setTargetChar(null);
                setRandomTarget(null);
                return;
            }
            const currentGyouKey = gyouList[gIdx];
            const list = danOrder[currentGyouKey];
            const charsForGyou = gyouChars[currentGyouKey];

            if (!list || !charsForGyou || dIdx < 0 || dIdx >= list.length || dIdx >= charsForGyou.length) {
                // console.error(`[Seion Normal] Invalid dIdx: ${dIdx} for gIdx: ${gIdx}`);
                setTargetChar(null);
                setRandomTarget(null);
                return;
            }
            const char = charsForGyou[dIdx];
            const charIndex = list.findIndex(c => c === char);
            const danKey = (charIndex !== -1 && charIndex < danList.length) ? danList[charIndex] : null;

            if (char && danKey) {
                setTargetChar(char);
                setRandomTarget(null); // 通常モードではクリア
                setStage('gyouInput');
                // console.log(`[Seion Normal] Target: ${char} (Gyou: ${currentGyouKey}, Dan: ${danKey}) for gIdx=${gIdx}, dIdx=${dIdx}`);
            } else {
                //  console.error(`[Seion Normal] Could not determine char or danKey for gIdx=${gIdx}, dIdx=${dIdx}`);
                 setTargetChar(null);
                 setRandomTarget(null);
            }
        }
    // 内部状態の gIdx, dIdx に依存
    }, [isActive, gIdx, dIdx, isRandomMode]);

    // --- ターゲット更新 ---
    useEffect(() => {
        // Props から渡されたインデックスが内部状態と異なる場合、内部状態を更新
        // これにより、App.tsx 側でのインデックス変更がフック内部に反映される
        if (initialGIdx !== gIdx) setGIdx(initialGIdx);
        if (initialDIdx !== dIdx) setDIdx(initialDIdx);

        // console.log(`[Seion useEffect] Start. isActive=${isActive}, isRandomMode=${isRandomMode}, gIdx=${gIdx}, dIdx=${dIdx}, initialGIdx=${initialGIdx}, initialDIdx=${initialDIdx}`);

        // isActive が false の場合は、以降の処理を行わずにリセット処理のみ確認
        if (!isActive) {
            if (prevIsActiveRef.current) { // false になった瞬間だけリセット
                // console.log(`[Seion useEffect] Resetting state because isActive became false (early return).`);
                resetPracticeState(); // 内部的なリセット関数を呼ぶ (calculateTarget を含まない)
            }
            prevIsActiveRef.current = isActive;
            prevIsRandomModeRef.current = isRandomMode; // isRandomMode の状態も追従
            return;
        }

        // isActive が false になった最初のタイミングでリセット
        if (!isActive && prevIsActiveRef.current) {
            // console.log(`[Seion useEffect] Resetting state because isActive became false.`);
            setTargetChar(null);
            setStage('gyouInput');
            setRandomTarget(null);
            prevGIdxRef.current = -1; // gIdx, dIdx の前回値をリセット
            prevDIdxRef.current = -1;
            isInitialMount.current = true; // 次回 active になったときに初期マウントとして扱う
        }

        if (isActive) {
            // isActive が true になった最初のタイミング、または依存関係の変更時
            if (isActive && !prevIsActiveRef.current) {
                isInitialMount.current = true; // 強制的に初期マウント扱い
            }

            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            // --- リセット条件 ---
            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                // console.log(`[Seion useEffect] Normal mode. isInitialMount=${isInitialMount.current}, indicesChanged=${indicesChanged}`);
                setStage('gyouInput');
                setRandomTarget(null);
                calculateTarget();
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }
            // --- ランダムターゲット選択条件 ---
            else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
                //  console.log(`[Seion useEffect] Random mode. randomModeChangedToTrue=${randomModeChangedToTrue}, isInitialMount=${isInitialMount.current}, !randomTarget=${!randomTarget}`);
                 calculateTarget();
                 prevGIdxRef.current = gIdx; // ランダムモードでは使わないが記録
                 prevDIdxRef.current = dIdx;
                 isInitialMount.current = false;
            }
        }

        // 最後に前回の値を更新
        prevIsActiveRef.current = isActive;
        prevIsRandomModeRef.current = isRandomMode;

    // initialGIdx, initialDIdx も依存配列に追加し、内部状態 gIdx, dIdx も含める
    }, [initialGIdx, initialDIdx, isActive, isRandomMode, gIdx, dIdx, calculateTarget, randomTarget]);

    // useEffect内で呼び出すための、calculateTargetを含まないリセット関数
    const resetPracticeState = useCallback(() => {
        setTargetChar(null);
        setStage('gyouInput');
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
    }, []);
    
    // --- 入力処理 ---
    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        if (!isActive || !targetChar || !expectedGyouKey || !expectedDanKey || inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const { pressCode } = inputInfo;
        let isExpected = false;
        let shouldGoToNext = false;
        let nextStage: SeionStage | null = null;

        const actualGyouKey = hid2Gyou(pressCode, kb, side);
        const actualDanKey = hid2Dan(pressCode, kb, side);

        // console.log(`[Seion handleInput] Stage: ${stage}, Input: 0x${pressCode.toString(16)} (Gyou:${actualGyouKey}, Dan:${actualDanKey}), Expected: (Gyou:${expectedGyouKey}, Dan:${expectedDanKey})`);

        if (stage === 'gyouInput') {
            if (actualGyouKey === expectedGyouKey) {
                isExpected = true;
                nextStage = 'danInput';
            } else {
                isExpected = false;
                nextStage = 'gyouInput'; // 不正解でもステージは維持
            }
        } else if (stage === 'danInput') {
            if (actualDanKey === expectedDanKey) {
                isExpected = true;
                shouldGoToNext = !isRandomMode; // 通常モードのみ自動で次へ
                nextStage = 'gyouInput';
                if (isRandomMode) {
                    calculateTarget(); // 次のランダムターゲットを計算
                }
            } else {
                isExpected = false;
                nextStage = 'gyouInput'; // 不正解なら行入力からやり直し
            }
        }

        if (nextStage && nextStage !== stage) {
            // console.log(`[Seion handleInput] Setting stage to ${nextStage}`);
            setStage(nextStage);
        } else if (!isExpected && stage === 'danInput') {
             // console.log(`[Seion handleInput] Incorrect input in danInput, explicitly resetting to gyouInput`);
             setStage('gyouInput');
        }

        // console.log(`[Seion handleInput] Result: isExpected=${isExpected}, shouldGoToNext=${shouldGoToNext}, Final Stage=${stage}`);
        return { isExpected, shouldGoToNext };
    // calculateTarget を依存配列に追加
    }, [isActive, targetChar, stage, expectedGyouKey, expectedDanKey, kb, side, isRandomMode, calculateTarget]);

    // --- リセット処理 ---
    const reset = useCallback(() => {
        // console.log(`[Seion reset] Called. isActive=${isActive}, isRandomMode=${isRandomMode}`);
        setStage('gyouInput');
        // reset が呼ばれたら、現在のモードとインデックスに基づいてターゲットを再計算
        if (isActive) {
            // console.log("[Seion reset] Recalculating target...");
            calculateTarget();
        }
        // isInitialMount は useEffect で管理
    }, [isActive, isRandomMode, calculateTarget]); // calculateTarget を依存配列に追加

    // --- headingChars ---
    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return targetChar ? [targetChar] : [];
        } else {
            // 通常モード: 内部状態の gIdx を使用
            if (gIdx < 0 || gIdx >= gyouList.length) {
                return [];
            }
            const currentGyouKey = gyouList[gIdx];
            const charsForGyou = gyouChars[currentGyouKey];
            return charsForGyou ?? [];
        }
    // 内部状態の gIdx に依存
    }, [isActive, isRandomMode, targetChar, gIdx]);

    // --- ハイライト処理 ---
    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };

        if (!isActive || !targetChar) {
            return noHighlight;
        }

        // 問題切り替え直後は強制的に 'gyouInput' として扱う (通常モードのみ)
        // isInitialMount.current も考慮
        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = (indicesJustChanged && !isInitialMount.current) ? 'gyouInput' : stage;

        if (currentStageForHighlight === 'gyouInput') {
            if (keyName === expectedGyouKey && layoutIndex === 2) {
                return { className: 'bg-blue-100', overrideKey: null };
            }
        } else if (currentStageForHighlight === 'danInput') {
            // ▼▼▼ や行の特別処理 ▼▼▼
            if (expectedGyouKey === 'や行') {
                // や行の場合、期待される段キー（あ段、う段、お段）のみハイライト
                if (keyName === expectedDanKey && layoutIndex === 3) {
                    return { className: 'bg-blue-100', overrideKey: null };
                }
                // や行の danInput ステージでは、い段キーはハイライトしない
            } else {
                // や行以外は通常通り、期待される段キーをハイライト
                if (keyName === expectedDanKey && layoutIndex === 3) {
                     return { className: 'bg-blue-100', overrideKey: null };
                }
            }
            // ▲▲▲ や行の特別処理 ▲▲▲
        }

        return noHighlight;
    // expectedGyouKey, expectedDanKey を依存配列に追加
    }, [isActive, targetChar, stage, expectedGyouKey, expectedDanKey, isRandomMode, gIdx, dIdx]);

    // --- 不正入力ターゲット判定 ---
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false; // 非アクティブ時は常に false

        const targetKeyIndex = pressCode - 1;
        let expectedLayoutIndex: number | null = null;

        // 現在のステージに応じて、不正入力が起こりうるレイヤーを特定
        if (stage === 'gyouInput') {
            expectedLayoutIndex = 2; // スタートレイヤー
        } else if (stage === 'danInput') {
            expectedLayoutIndex = 3; // エンドレイヤー
        }

        // 期待されるレイヤーで、かつキーインデックスが一致する場合のみ true
        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    // stage と isActive を依存配列に追加
    }, [isActive, stage]);


    // --- フックの戻り値 ---
    return useMemo(() => ({
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        targetChar: targetChar ?? '',
        getHighlight: () => { // 基本的な実装
            let start: string | null = null;
            let end: string | null = null;
            if (stage === 'gyouInput') start = expectedGyouKey;
            else if (stage === 'danInput') end = expectedDanKey;
            return { start, end };
        },
    }), [
        headingChars,
        handleInput, getHighlightClassName, reset, isInvalidInputTarget,
        targetChar, stage, expectedGyouKey, expectedDanKey // getHighlight 用の依存関係を追加
    ]);
};

export default useSeionPractice;
