// /home/coffee/my-keymap-viewer/src/hooks/useYouonPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    youonGyouList,
    youonGyouChars,
    youonDanMapping,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
    CharInfoYouon,
    allYouonCharInfos,
    PracticeHighlightResult,
} from './usePracticeCommons';

type YouonStage = 'gyouInput' | 'youonInput' | 'danInput';

export default function useYouonPractice({ gIdx, dIdx, isActive, side, kb, isRandomMode }: PracticeHookProps): PracticeHookResult {
    const [stage, setStage] = useState<YouonStage>('gyouInput');
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

    const youonKeyCode = useMemo(() => {
        const gyouMap = kb === 'tw-20v'
            ? (side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana)
            : (side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana);
        // 押下コードのみを対象とする (<= 0x14 or 0x10)
        const maxPressCode = kb === 'tw-20v' ? 0x10 : 0x14; // TW-20V は 0x01-0x10, TW-20H は 0x01-0x14
        const entry = Object.entries(gyouMap).find(([codeStr, name]) => name === '拗音' && parseInt(codeStr) <= maxPressCode);
        return entry ? parseInt(entry[0]) : null;
    }, [side, kb]);

    const [randomTarget, setRandomTarget] = useState<CharInfoYouon | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持
    const prevIsRandomModeRef = useRef(isRandomMode);

    const selectNextRandomTarget = useCallback(() => {
        if (allYouonCharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allYouonCharInfos.length);
            setRandomTarget(allYouonCharInfos[randomIndex]);
            setStage('gyouInput'); // ステージもリセット
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
        prevIsRandomModeRef.current = false; // reset 時は false に
    }, [setStage, setRandomTarget]);

    useEffect(() => {
        // isActive が false になった最初のタイミングでリセット
        if (!isActive && prevIsActiveRef.current) {
            // console.log(`[Youon useEffect] Resetting state because isActive became false.`);
            reset(); // reset 関数内で必要なリセット処理を行う
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
                // console.log(`[Youon useEffect] Normal mode. isInitialMount=${isInitialMount.current}, indicesChanged=${indicesChanged}`);
                setStage('gyouInput'); // 通常モードやインデックス変更時はステージをリセット
                setRandomTarget(null); // ランダムターゲットはクリア
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }
            // --- ランダムターゲット選択条件 (初回のみ or リセット後) ---
            else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
                 // console.log(`[Youon useEffect] Random mode. randomModeChangedToTrue=${randomModeChangedToTrue}, isInitialMount=${isInitialMount.current}, !randomTarget=${!randomTarget}`);
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


    // 通常モード用の現在行・段キー
    const currentGyouKey = useMemo(() => {
        if (!isActive || isRandomMode || gIdx < 0 || gIdx >= youonGyouList.length) return null;
        return youonGyouList[gIdx];
    }, [isActive, isRandomMode, gIdx]);

    const currentDanKey = useMemo(() => {
        if (!isActive || isRandomMode || !currentGyouKey || !youonDanMapping[currentGyouKey]) return null;
        const danList = youonDanMapping[currentGyouKey];
        if (!danList || dIdx < 0 || dIdx >= danList.length) return null;
        return danList[dIdx];
    }, [isActive, isRandomMode, currentGyouKey, dIdx]);

    // ヘッダー文字
    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            if (!currentGyouKey || !youonGyouChars[currentGyouKey]) return [];
            return youonGyouChars[currentGyouKey] || [];
        }
    }, [isActive, isRandomMode, randomTarget, currentGyouKey]);

    // 期待キー
    const expectedGyouKey = useMemo(() => (isRandomMode ? randomTarget?.gyouKey : currentGyouKey) ?? null, [isRandomMode, randomTarget, currentGyouKey]);
    const expectedDanKey = useMemo(() => (isRandomMode ? randomTarget?.danKey : currentDanKey) ?? null, [isRandomMode, randomTarget, currentDanKey]);

    // handleInput
    const handleInput = useCallback((info: PracticeInputInfo): PracticeInputResult => {
        if (!isActive || !expectedGyouKey || !expectedDanKey || youonKeyCode === null || info.type !== 'release') {
            return { isExpected: false, shouldGoToNext: undefined };
        }

        let isExpected = false;
        let shouldGoToNext_final: boolean | undefined = undefined;

        if (stage === 'gyouInput') {
            const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                .filter(([_, name]) => name === expectedGyouKey)
                .map(([codeStr, _]) => parseInt(codeStr));
            if (expectedGyouKeyCodes.includes(info.pressCode)) {
                setStage('youonInput');
                isExpected = true;
                shouldGoToNext_final = undefined; // 文字入力はまだ完了していない
            } else {
                isExpected = false;
                shouldGoToNext_final = undefined; // 不正解、文字入力は完了していない
            }
        } else if (stage === 'youonInput') {
            if (info.pressCode === youonKeyCode) {
                setStage('danInput');
                isExpected = true;
                shouldGoToNext_final = undefined; // 文字入力はまだ完了していない
            } else {
                isExpected = false;
                setStage('gyouInput'); // 不正解なら行入力からやり直し
                shouldGoToNext_final = undefined; // 不正解、文字入力は完了していない
            }
        } else if (stage === 'danInput') {
            const expectedDanKeyCodes = Object.entries(hid2Dan)
                .filter(([_, name]) => name === expectedDanKey)
                .map(([codeStr, _]) => parseInt(codeStr));
            if (expectedDanKeyCodes.includes(info.pressCode)) {
                isExpected = true;
                setStage('gyouInput'); // 次の文字/ターゲットのためにステージをリセット
                if (isRandomMode) {
                    selectNextRandomTarget();
                    shouldGoToNext_final = false; // App.tsx は gIdx/dIdx を進めない
                } else {
                    // 通常モード: 現在の文字がその行の最後かどうかを判定
                    const currentGyouKeyFromProps = youonGyouList[gIdx]; // props の gIdx を使用
                    const charsInCurrentGyou = youonGyouChars[currentGyouKeyFromProps];
                    if (charsInCurrentGyou && dIdx >= charsInCurrentGyou.length - 1) {
                        shouldGoToNext_final = true; // 行の最後の文字なら App.tsx は gIdx を進める
                    } else {
                        shouldGoToNext_final = false; // 行の途中の文字なら App.tsx は dIdx を進める
                    }
                }
            } else {
                isExpected = false;
                setStage('gyouInput'); // 不正解なら行入力からやり直し
                shouldGoToNext_final = undefined; // 不正解、文字入力は完了していない
            }
        }

        // 不正解で、かつ現在のステージが最初の入力ステージでない場合、最初の入力ステージに戻す
        if (!isExpected && stage !== 'gyouInput') {
             setStage('gyouInput');
        }
        // console.log(`[YouonPractice handleInput] Returning: isExpected=${isExpected}, shouldGoToNext=${shouldGoToNext_final}, currentStage=${stage}`);
        return { isExpected, shouldGoToNext: shouldGoToNext_final };
    }, [
        isActive, stage, expectedGyouKey, expectedDanKey, youonKeyCode,
        hid2Gyou, hid2Dan, isRandomMode, selectNextRandomTarget, setStage,
        gIdx, dIdx // props の gIdx, dIdx を依存配列に追加
    ]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive) {
            return noHighlight;
        }
        if (!expectedGyouKey || !expectedDanKey) {
            return noHighlight;
        }

        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === 'gyouInput') {
            expectedKeyName = expectedGyouKey;
            targetLayoutIndex = 2; // スタートレイヤー
        } else if (currentStageForHighlight === 'youonInput') {
            expectedKeyName = '拗音';
            targetLayoutIndex = 2; // スタートレイヤー
        } else if (currentStageForHighlight === 'danInput') {
            expectedKeyName = expectedDanKey;
            targetLayoutIndex = 3; // エンドレイヤー
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    }, [isActive, stage, expectedGyouKey, expectedDanKey, isRandomMode, gIdx, dIdx]);

    // isInvalidInputTarget
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        if (stage === 'gyouInput' || stage === 'youonInput') {
            expectedLayoutIndex = 2;
        } else if (stage === 'danInput') {
            expectedLayoutIndex = 3;
        }

        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive, stage]);

    return {
        handleInput,
        getHighlightClassName,
        headingChars,
        reset,
        isInvalidInputTarget,
    };
}
