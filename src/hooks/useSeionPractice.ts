// src/hooks/useSeionPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    gyouList,
    danOrder,
    KeyboardModel, // MODIFIED: ESLint Warning 対応のためコメント解除 (実際には未使用だが型定義として必要)
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
} from './usePracticeCommons';
import { gyouChars } from '../data/keymapData';

type SeionStage = "line" | "dan";

export default function useSeionPractice({ gIdx, dIdx, okVisible, isActive, side, kb }: PracticeHookProps): PracticeHookResult {
    const [stage, setStage] = useState<SeionStage>("line");
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
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            if (isInitialMount.current || indicesChanged) {
                setStage("line");
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }
        } else {
             prevGIdxRef.current = -1;
             prevDIdxRef.current = -1;
             isInitialMount.current = true;
        }
    }, [isActive, gIdx, dIdx]);

    const currentGyouKey = useMemo(() => {
        if (!isActive || gIdx < 0 || gIdx >= gyouList.length) return null;
        return gyouList[gIdx];
    }, [isActive, gIdx]);

    const currentDanKey = useMemo(() => {
        if (!isActive || !currentGyouKey || !danOrder[currentGyouKey]) return null;
        const danList = danOrder[currentGyouKey];
        if (dIdx < 0 || dIdx >= danList.length) return null;
        return danList[dIdx];
    }, [isActive, currentGyouKey, dIdx]);

    const handleInput = useCallback((info: PracticeInputInfo): PracticeInputResult => {
        // デバッグログ
        console.log("Seion Input:", info, "Current Stage:", stage, "Gyou:", currentGyouKey, "Dan:", currentDanKey);

        if (!isActive || okVisible || !currentGyouKey || !currentDanKey) {
            console.log("Seion Input Ignored: Inactive, OK visible, or keys invalid");
            return { isExpected: false, shouldGoToNext: false };
        }
        // MODIFIED: 押下イベントも処理するように変更 (ただし判定は離上で行う)
        // if (info.type !== 'release') {
        //     console.log("Seion Input Ignored: Not a release event");
        //     return { isExpected: false, shouldGoToNext: false };
        // }

        const inputGyou = hid2Gyou[info.pressCode] ?? null;
        const inputDan = hid2Dan[info.pressCode] ?? null;
        let isExpected = false;
        let shouldGoToNext = false;

        // MODIFIED: 離上イベントでのみ判定と状態遷移を行う
        if (info.type === 'release') {
            if (stage === "line") {
                // 期待するキーコードを取得 (hid2Gyou の逆引き)
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === currentGyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));

                console.log("Stage: line, Input Gyou:", inputGyou, "Expected Gyou:", currentGyouKey, "Input Code:", info.pressCode, "Expected Codes:", expectedGyouKeyCodes);

                // 押されたキーコードが期待される行キーコードのいずれかと一致するか
                if (expectedGyouKeyCodes.includes(info.pressCode)) {
                    setStage("dan");
                    isExpected = true;
                    console.log("Transition to dan stage");
                } else {
                    console.log("Incorrect gyou input");
                    isExpected = false;
                    // 行入力で間違えた場合もステージはリセットしない（次の入力を待つ）
                    // setStage("line"); // 削除
                }
            } else if (stage === "dan") {
                 // 期待するキーコードを取得 (hid2Dan の逆引き)
                const expectedDanKeyCodes = Object.entries(hid2Dan)
                    .filter(([_, name]) => name === currentDanKey)
                    .map(([codeStr, _]) => parseInt(codeStr));

                console.log("Stage: dan, Input Dan:", inputDan, "Expected Dan:", currentDanKey, "Input Code:", info.pressCode, "Expected Codes:", expectedDanKeyCodes);

                // 押されたキーコードが期待される段キーコードのいずれかと一致するか
                if (expectedDanKeyCodes.includes(info.pressCode)) {
                    isExpected = true;
                    shouldGoToNext = true;
                    // setStage("line"); // 次の問題に行くのでここでリセット不要
                    console.log("Correct dan input, should go next");
                } else {
                    // 段入力で間違えた場合は、行入力からやり直し
                    setStage("line");
                    isExpected = false;
                    console.log("Incorrect dan input, reset to line stage");
                }
            }
        } else { // 押下イベントの場合
            // 押下イベントでは状態遷移や正誤判定は行わない
            // ただし、将来的に押下中のハイライトなどを行う場合はここにロジックを追加可能
            isExpected = false; // 押下だけでは完了ではない
            shouldGoToNext = false;
        }


        console.log("Seion Result:", { isExpected, shouldGoToNext });
        return { isExpected, shouldGoToNext };
    // MODIFIED: ESLint Warning 対応: kb, side は hid2Gyou, hid2Dan の生成に使われているため不要
    }, [isActive, okVisible, stage, currentGyouKey, currentDanKey, hid2Gyou, hid2Dan]);

    const getHighlightClassName = (key: string, layoutIndex: number): string | null => {
        const indicesJustChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
        const isProblemSwitch = indicesJustChanged && !okVisible;

        if (!isActive || okVisible || !currentGyouKey || !currentDanKey) {
            return null;
        }

        // 問題切り替え直後は強制的に "line" として扱う
        const currentStageForHighlight = isProblemSwitch ? "line" : stage;

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === "line") {
            expectedKeyName = currentGyouKey;
            targetLayoutIndex = 2; // スタートレイヤー
        } else { // currentStageForHighlight === "dan"
            expectedKeyName = currentDanKey;
            targetLayoutIndex = 3; // エンドレイヤー
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return 'bg-blue-100';
        }
        return null;
    };

    const headingChars = useMemo(() => {
        if (!currentGyouKey || !gyouChars[currentGyouKey]) return [];
        return gyouChars[currentGyouKey];
    }, [currentGyouKey]);

    const reset = useCallback(() => {
        setStage("line");
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
    }, []);

    const isInvalidInputTarget = useCallback((keyCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        // HIDコードが1始まりと仮定
        const targetKeyIndex = keyCode - 1;

        // MODIFIED: ステージに応じて期待されるレイアウトを判定
        let expectedLayoutIndex: number | null = null;
        if (stage === "line") {
            expectedLayoutIndex = 2; // スタートレイヤー
        } else if (stage === "dan") {
            expectedLayoutIndex = 3; // エンドレイヤー
        }

        // 期待されるレイヤーでの入力か、かつキーインデックスが一致するか
        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    // MODIFIED: stage を依存配列に追加
    }, [isActive, stage]);

    return {
        handleInput,
        getHighlightClassName,
        headingChars,
        reset,
        isInvalidInputTarget,
    };
}
