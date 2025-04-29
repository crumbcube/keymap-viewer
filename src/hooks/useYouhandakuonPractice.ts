// /home/coffee/my-keymap-viewer/src/hooks/useYouhandakuonPractice.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    youhandakuonPracticeData,
    functionKeyMaps,
    YouhandakuonInputDef,
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
    PracticeHighlightResult,
    CharInfoYouhandakuon, // CharInfoHandakuon -> CharInfoYouhandakuon
    allYouhandakuonCharInfos, // allHandakuonCharInfos -> allYouhandakuonCharInfos
} from './usePracticeCommons';

type YouhandakuonStage = 'gyouInput' | 'youonInput' | 'dakuonInput1' | 'dakuonInput2' | 'danInput';

const useYouhandakuonPractice = ({
    gIdx, // gIdx は常に 0
    dIdx,
    isActive,
    okVisible,
    side,
    kb,
    layers, // layers は使わないが props として受け取る
    isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<YouhandakuonStage>('gyouInput');
    const [showHighlightForSecondDakuon, setShowHighlightForSecondDakuon] = useState(true);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);
    const highlightDelayTimerRef = useRef<number | null>(null);
    const [randomTarget, setRandomTarget] = useState<CharInfoYouhandakuon | null>(null);

    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana;
        }
    }, [side, kb]);

    const hid2Dan = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2DanVLeft_Kana : hid2DanVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2DanHLeft_Kana : hid2DanHRight_Kana;
        }
    }, [side, kb]);

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    const selectNextRandomTarget = useCallback(() => {
        // allHandakuonCharInfos -> allYouhandakuonCharInfos
        if (allYouhandakuonCharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allYouhandakuonCharInfos.length);
            // allHandakuonCharInfos -> allYouhandakuonCharInfos
            const nextTarget = allYouhandakuonCharInfos[randomIndex];
            setRandomTarget(nextTarget);
            setStage('gyouInput'); // 常に最初のステージから
            setShowHighlightForSecondDakuon(true); // ハイライト状態もリセット
            if (highlightDelayTimerRef.current !== null) {
                clearTimeout(highlightDelayTimerRef.current);
                highlightDelayTimerRef.current = null;
            }
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage, setShowHighlightForSecondDakuon]);

    const currentInputDef = useMemo((): YouhandakuonInputDef | null => { // 型注釈を追加
        if (isRandomMode) {
            // CharInfoYouhandakuon に inputDef を含めたので、それを直接使う
            return randomTarget?.inputDef ?? null;
        }
        // 通常モードのロジック (変更なし)
        if (!isActive) return null;
        const currentGroup = youhandakuonPracticeData[0]; // 常に最初のグループ
        if (!currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) return null;
        return currentGroup.inputs[dIdx];
    // randomTarget.inputDef を依存配列に追加
    }, [isRandomMode, randomTarget, isActive, dIdx]);

    // headingChars (変更なし、前回の修正でOK)
    const headingChars = useMemo(() => {
        if (!isActive) return []; // 非アクティブ時は空配列

        if (isRandomMode) {
            // ランダムモード時はターゲット文字のみ表示
            return randomTarget ? [randomTarget.char] : [];
        } else {
            // 通常モード時は行全体の文字を表示 (ぱ行のみ)
            const currentGroup = youhandakuonPracticeData[0];
            return currentGroup?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget]);

    // reset (変更なし)
    const reset = useCallback(() => {
        setStage('gyouInput');
        setShowHighlightForSecondDakuon(true);
        if (highlightDelayTimerRef.current !== null) {
            clearTimeout(highlightDelayTimerRef.current);
            highlightDelayTimerRef.current = null;
        }
        setRandomTarget(null); // ランダムターゲットもリセット
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setShowHighlightForSecondDakuon, setRandomTarget]);

    // useEffect (変更なし)
    useEffect(() => {
        if (isActive) {
            const indicesChanged = dIdx !== prevDIdxRef.current; // gIdx は常に 0 なので dIdx のみチェック
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            // 通常モードへの切り替え or 通常モードでのインデックス変更
            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                reset();
                prevGIdxRef.current = 0; // gIdx は 0 固定
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }

            // ランダムモードへの切り替え or ランダムモード初期化/ターゲットなし
            if (isRandomMode && (randomModeChangedToTrue || (isInitialMount.current && !randomTarget) || !randomTarget)) {
                 selectNextRandomTarget();
                 isInitialMount.current = false;
                 prevGIdxRef.current = -1; // ランダムモードでは参照しない
                 prevDIdxRef.current = -1;
            } else if (!isRandomMode && isInitialMount.current) {
                 // 通常モード初期化
                 reset();
                 isInitialMount.current = false;
                 prevGIdxRef.current = 0; // gIdx は 0 固定
                 prevDIdxRef.current = dIdx;
            }

            prevIsRandomModeRef.current = isRandomMode;

        } else {
            reset(); // 非アクティブになったらリセット
        }
        return () => {
            if (highlightDelayTimerRef.current !== null) {
                clearTimeout(highlightDelayTimerRef.current);
                highlightDelayTimerRef.current = null;
            }
        };
    }, [isActive, isRandomMode, dIdx, randomTarget, reset, selectNextRandomTarget]);

    const currentOkVisible = okVisible;

    // handleInput (変更なし)
    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {

        // currentInputDef が null の場合のエラーハンドリングを追加
        if (!isActive || okVisible || !currentInputDef) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext = false;

        const youonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        // +1 して押下コードに変換
        const expectedYouonKeyCode = youonKeyCodeEntry ? parseInt(youonKeyCodeEntry[0]) + 1 : -1;
        const expectedDakuonKeyCode = dakuonKeyCodeEntry ? parseInt(dakuonKeyCodeEntry[0]) + 1 : -1;

        // 濁音/拗音キーコードが見つからない場合のエラー処理
        if (expectedYouonKeyCode === -1 || expectedDakuonKeyCode === -1) {
            console.error("Could not find key codes for '拗音' or '濁音'");
            return { isExpected: false, shouldGoToNext: false };
        }


        if (stage !== 'dakuonInput1' && highlightDelayTimerRef.current !== null) {
            clearTimeout(highlightDelayTimerRef.current);
            highlightDelayTimerRef.current = null;
        }
        if (stage !== 'dakuonInput1') {
            setShowHighlightForSecondDakuon(true);
        }

        let nextStage: YouhandakuonStage | null = null;

        switch (stage) {
            case 'gyouInput':
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === currentInputDef.gyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedGyouKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    nextStage = 'youonInput';
                } else {
                    nextStage = 'gyouInput';
                }
                break;
            case 'youonInput':
                if (pressCode === expectedYouonKeyCode) {
                    isExpected = true;
                    nextStage = 'dakuonInput1';
                } else {
                    nextStage = 'gyouInput';
                }
                break;
            case 'dakuonInput1':
                if (pressCode === expectedDakuonKeyCode) {
                    isExpected = true;
                    nextStage = 'dakuonInput2';
                    setShowHighlightForSecondDakuon(false);
                    if (highlightDelayTimerRef.current !== null) {
                        clearTimeout(highlightDelayTimerRef.current);
                    }
                    highlightDelayTimerRef.current = window.setTimeout(() => {
                        setShowHighlightForSecondDakuon(true);
                        highlightDelayTimerRef.current = null;
                    }, 500);
                } else {
                    isExpected = false;
                    nextStage = 'gyouInput';
                }
                break;
            case 'dakuonInput2':
                if (pressCode === expectedDakuonKeyCode) {
                    isExpected = true;
                    nextStage = 'danInput';
                } else {
                    nextStage = 'gyouInput';
                }
                break;
            case 'danInput':
                const expectedDanKeyCodes = Object.entries(hid2Dan)
                    .filter(([_, name]) => name === currentInputDef.dan)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedDanKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    nextStage = 'gyouInput'; // 完了して次へ
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                    }
                } else {
                    nextStage = 'gyouInput';
                }
                break;
        }

        // ステージ遷移がある場合、または不正解でリセットする場合
        if (nextStage && nextStage !== stage) {
             setStage(nextStage);
        } else if (!isExpected && stage !== 'gyouInput') {
             // 不正解で、かつ最初のステージでなければリセット
             setStage('gyouInput');
        }


        return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, stage, currentInputDef, hid2Gyou, hid2Dan, currentFunctionKeyMap,
        isRandomMode, setStage, setShowHighlightForSecondDakuon, selectNextRandomTarget
    ]);

    // getHighlightClassName (変更なし)
    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };

        // currentInputDef が null の場合のエラーハンドリングを追加
        if (!isActive || okVisible || !currentInputDef) {
            return noHighlight;
        }

        const indicesJustChanged = !isRandomMode && dIdx !== prevDIdxRef.current;
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        const youonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        // 機能キーの表示名を取得（存在しない場合はデフォルト名）
        const youonDisplayName = youonKeyEntry ? currentFunctionKeyMap[parseInt(youonKeyEntry[0])] : '拗音';
        const dakuonDisplayName = dakuonKeyEntry ? currentFunctionKeyMap[parseInt(dakuonKeyEntry[0])] : '濁音';


        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = currentInputDef.gyouKey;
                targetLayoutIndex = 2;
                break;
            case 'youonInput':
                expectedKeyName = youonDisplayName;
                targetLayoutIndex = 2;
                break;
            case 'dakuonInput1':
                expectedKeyName = dakuonDisplayName;
                targetLayoutIndex = 2;
                break;
            case 'dakuonInput2':
                if (showHighlightForSecondDakuon) {
                    expectedKeyName = dakuonDisplayName;
                    targetLayoutIndex = 2;
                } else {
                    expectedKeyName = null;
                    targetLayoutIndex = null;
                }
                break;
            case 'danInput':
                expectedKeyName = currentInputDef.dan;
                targetLayoutIndex = 3;
                break;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }

        return noHighlight;
    }, [
        isActive, okVisible, stage, currentInputDef, isRandomMode, dIdx, currentFunctionKeyMap, showHighlightForSecondDakuon
    ]);

    // isInvalidInputTarget (変更なし)
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        switch (stage) {
            case 'gyouInput':
            case 'youonInput':
            case 'dakuonInput1':
            case 'dakuonInput2':
                expectedLayoutIndex = 2;
                break;
            case 'danInput':
                expectedLayoutIndex = 3;
                break;
        }
        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive, stage]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        isOkVisible: currentOkVisible,
    };
};

export default useYouhandakuonPractice;
