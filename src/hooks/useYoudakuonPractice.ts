// /home/coffee/my-keymap-viewer/src/hooks/useYoudakuonPractice.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    youdakuonPracticeData,
    YoudakuonInputDef,
} from '../data/keymapData';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
    functionKeyMaps,
} from './usePracticeCommons';

// 拗濁音練習の入力ステージ
type YoudakuonStage = 'gyouInput' | 'youonInput' | 'dakuonInput' | 'danInput';

interface YoudakuonCharInfo {
    char: string;
    inputDef: YoudakuonInputDef;
}

const allYoudakuonCharInfos: YoudakuonCharInfo[] = youdakuonPracticeData.flatMap(group =>
    group.chars.map((char, index) => ({
        char: char,
        inputDef: group.inputs[index],
    }))
);


const useYoudakuonPractice = ({
    gIdx,
    dIdx,
    isActive,
    okVisible,
    side,
    kb,
    layers,
    isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<YoudakuonStage>('gyouInput');
    const [randomTarget, setRandomTarget] = useState<YoudakuonCharInfo | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);

    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hid2Dan = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2DanVLeft_Kana : hid2DanVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2DanHLeft_Kana : hid2DanHRight_Kana;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectNextRandomTarget = useCallback(() => {
        if (allYoudakuonCharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allYoudakuonCharInfos.length);
            const nextTarget = allYoudakuonCharInfos[randomIndex];
            console.log(">>> Selecting new random target (Youdakuon):", nextTarget);
            setRandomTarget(nextTarget);
            setStage('gyouInput'); // 常に最初のステージから
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage]);

    const currentInputDef = useMemo(() => {
        if (isRandomMode) {
            // ランダムモード時は randomTarget から取得
            return randomTarget?.inputDef ?? null;
        }
        // 通常モードのロジック
        if (!isActive || gIdx < 0 || gIdx >= youdakuonPracticeData.length) return null;
        const currentGroup = youdakuonPracticeData[gIdx];
        if (!currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) return null;
        return currentGroup.inputs[dIdx];
    }, [isRandomMode, randomTarget, isActive, gIdx, dIdx]);

    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            // ランダムモード時は randomTarget から取得
            return randomTarget ? [randomTarget.char] : [];
        } else {
            // 通常モードのロジック
            if (gIdx < 0 || gIdx >= youdakuonPracticeData.length) return [];
            return youdakuonPracticeData[gIdx]?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget, gIdx]);

    const reset = useCallback(() => {
        setStage('gyouInput');
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget]);

    useEffect(() => {
        console.log("Youdakuon useEffect run. isActive:", isActive, "isRandomMode:", isRandomMode, "randomTarget:", randomTarget?.char);
        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            // 通常モードへの切り替え or 通常モードでのインデックス変更
            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                console.log("Resetting Youdakuon to normal mode or index changed");
                reset();
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }

            // ランダムモードへの切り替え or ランダムモード初期化/ターゲットなし
            if (isRandomMode && (randomModeChangedToTrue || (isInitialMount.current && !randomTarget) || !randomTarget)) {
                 console.log("Selecting initial/next random target for Youdakuon");
                 selectNextRandomTarget();
                 isInitialMount.current = false;
                 // ランダムモードでは gIdx/dIdx は参照しない
                 prevGIdxRef.current = -1; // 念のためリセット
                 prevDIdxRef.current = -1;
            } else if (!isRandomMode && isInitialMount.current) {
                 // 通常モード初期化
                 console.log("Initializing Youdakuon in normal mode");
                 reset();
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }

            prevIsRandomModeRef.current = isRandomMode;

        } else {
            reset(); // 非アクティブになったらリセット
        }
        // クリーンアップは不要
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]);

    const currentOkVisible = okVisible;

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        console.log(`[Youdakuon handleInput] Start - Stage: ${stage}, Input: 0x${inputInfo.pressCode.toString(16)}, Random: ${isRandomMode}`);

        if (!isActive || okVisible || !currentInputDef) {
            console.log(`[Youdakuon handleInput] Ignored`);
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext = false;
        let nextStage: YoudakuonStage = stage;

        // 機能キー「拗音」「濁音」の期待されるキーコードを取得
        const youonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        const expectedYouonKeyCode = youonKeyCodeEntry ? parseInt(youonKeyCodeEntry[0]) + 1 : -1;
        const expectedDakuonKeyCode = dakuonKeyCodeEntry ? parseInt(dakuonKeyCodeEntry[0]) + 1 : -1;

        switch (stage) {
            case 'gyouInput':
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === currentInputDef.gyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedGyouKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    nextStage = 'youonInput';
                } else {
                    nextStage = 'gyouInput'; // ミス時はリセット
                }
                break;
            case 'youonInput':
                 if (pressCode === expectedYouonKeyCode) {
                    isExpected = true;
                    nextStage = 'dakuonInput';
                } else {
                    nextStage = 'gyouInput'; // ミス時はリセット
                }
                break;
            case 'dakuonInput':
                if (pressCode === expectedDakuonKeyCode) {
                    isExpected = true;
                    nextStage = 'danInput';
                } else {
                    nextStage = 'gyouInput'; // ミス時はリセット
                }
                break;
            case 'danInput':
                const expectedDanKeyCodes = Object.entries(hid2Dan)
                    .filter(([_, name]) => name === currentInputDef.dan)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedDanKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    nextStage = 'gyouInput'; // ステージは最初に戻す
                    if (isRandomMode) {
                        console.log("[Youdakuon handleInput] Correct input in random mode, selecting next target.");
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        console.log("[Youdakuon handleInput] Correct input in normal mode, should go to next.");
                        shouldGoToNext = true;
                    }
                } else {
                     nextStage = 'gyouInput'; // ミス時はリセット
                }
                break;
        }

        if (nextStage !== stage) {
            console.log(`[Youdakuon handleInput] Setting stage from ${stage} to ${nextStage}`);
            setStage(nextStage);
        } else if (!isExpected) {
             console.log(`[Youdakuon handleInput] Incorrect input, resetting stage to gyouInput`);
             setStage('gyouInput'); // ミス時は必ず gyouInput に戻す
        }


        console.log(`[Youdakuon handleInput] End - isExpected: ${isExpected}, shouldGoToNext: ${shouldGoToNext}, Final Stage: ${nextStage}`);
        return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, stage, currentInputDef, hid2Gyou, hid2Dan, currentFunctionKeyMap,
        isRandomMode, selectNextRandomTarget, setStage
    ]);

    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): string | null => {
        if (!isActive || okVisible || !currentInputDef) {
            return null;
        }

        const currentStageForHighlight = isRandomMode ? stage : (
            // 通常モードでインデックスが変わった直後なら gyouInput を強制
            (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current) && !isInitialMount.current ? 'gyouInput' : stage
        );
        // console.log(`[Youdakuon getHighlight] Stage for highlight: ${currentStageForHighlight}`);


        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        // 機能キー「拗音」「濁音」の表示名を取得
        const youonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        const youonDisplayName = youonKeyEntry ? currentFunctionKeyMap[parseInt(youonKeyEntry[0])] : '拗音';
        const dakuonDisplayName = dakuonKeyEntry ? currentFunctionKeyMap[parseInt(dakuonKeyEntry[0])] : '濁音';

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = currentInputDef.gyouKey;
                targetLayoutIndex = 2; // スタートレイヤー
                break;
            case 'youonInput':
                expectedKeyName = youonDisplayName;
                targetLayoutIndex = 2; // スタートレイヤーの機能キー
                break;
            case 'dakuonInput':
                expectedKeyName = dakuonDisplayName;
                targetLayoutIndex = 2; // スタートレイヤーの機能キー
                break;
            case 'danInput':
                expectedKeyName = currentInputDef.dan;
                targetLayoutIndex = 3; // エンドレイヤー
                break;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyName) {
            // console.log(`[Youdakuon getHighlight] MATCH! Highlighting ${keyName} on layout ${layoutIndex}`);
            return 'bg-blue-100';
        }

        return null;
    }, [
        isActive, okVisible, stage, currentInputDef, isRandomMode, gIdx, dIdx, currentFunctionKeyMap
    ]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        // 現在のステージに応じて、不正入力が起こりうるレイヤーを特定
        switch (stage) {
            case 'gyouInput':
            case 'youonInput':
            case 'dakuonInput':
                expectedLayoutIndex = 2; // スタートレイヤー
                break;
            case 'danInput':
                expectedLayoutIndex = 3; // エンドレイヤー
                break;
        }

        // 期待されるレイヤーで、かつキーインデックスが一致する場合のみ true
        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive, stage]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        isOkVisible: isRandomMode ? false : currentOkVisible,
    };
};

export default useYoudakuonPractice;
