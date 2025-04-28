// /home/coffee/my-keymap-viewer/src/hooks/useYouhandakuonPractice.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    youhandakuonPracticeData,
    functionKeyMaps,
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
    // KeyboardSide, // 未使用のためコメントアウトまたは削除
    // KeyboardModel, // 未使用のためコメントアウトまたは削除
} from './usePracticeCommons';

// ▼▼▼ ステージから dakuonInput1_wait を削除 ▼▼▼
type YouhandakuonStage = 'gyouInput' | 'youonInput' | 'dakuonInput1' | 'dakuonInput2' | 'danInput';
// ▲▲▲ 削除 ▲▲▲

const useYouhandakuonPractice = ({
    gIdx, // gIdx は常に 0 (ぱ行のみ)
    dIdx,
    isActive,
    okVisible,
    side,
    kb,
    layers,
    isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<YouhandakuonStage>('gyouInput');
    // ▼▼▼ 2回目の濁音キーハイライト制御用ステートを追加 ▼▼▼
    const [showHighlightForSecondDakuon, setShowHighlightForSecondDakuon] = useState(true);
    // ▲▲▲ 追加 ▲▲▲
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);
    const highlightDelayTimerRef = useRef<number | null>(null);

    // ★ ランダムモードは未実装

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

    // 通常モード用
    const currentGroup = useMemo(() => {
        // isRandomMode はこのフックでは未実装なので条件分岐不要
        if (!isActive) return null;
        return youhandakuonPracticeData[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive]); // ★ isRandomMode を削除

    const currentInputDef = useMemo(() => {
        if (isRandomMode || !currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) {
            return null;
        }
        return currentGroup.inputs[dIdx];
    }, [isRandomMode, currentGroup, dIdx]);

    // ヘッダー文字
    const headingChars = useMemo(() => {
        if (!isActive) return [];
        return currentGroup?.chars ?? [];
    }, [isActive, isRandomMode, currentGroup]);

    // reset 関数
    const reset = useCallback(() => {
        setStage('gyouInput');
        // ▼▼▼ ハイライト制御ステートをリセット ▼▼▼
        setShowHighlightForSecondDakuon(true);
        // ▲▲▲ 追加 ▲▲▲
        if (highlightDelayTimerRef.current !== null) {
            console.log(`[reset] Clearing timer: ${highlightDelayTimerRef.current}`);
            clearTimeout(highlightDelayTimerRef.current);
            highlightDelayTimerRef.current = null;
        }
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    // ▼▼▼ 依存配列に setShowHighlightForSecondDakuon を追加 ▼▼▼
    }, [setStage, setShowHighlightForSecondDakuon]);
    // ▲▲▲ 追加 ▲▲▲

    useEffect(() => {
        if (isActive) {
            const indicesChanged = dIdx !== prevDIdxRef.current;
            // const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current; // ★ 削除
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                reset();
                prevGIdxRef.current = 0;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }
            // ★ ランダムモード関連のロジックは未実装なのでコメントアウトまたは削除
            // if (isRandomMode && (randomModeChangedToTrue || (isInitialMount.current && !randomTarget))) {
            //      console.log("Selecting initial/next random target for Youhandakuon");
            //      // selectNextRandomTarget(); // 未実装
            //      isInitialMount.current = false;
            //      prevGIdxRef.current = -1;
            //      prevDIdxRef.current = -1;
            // }
            if (!isRandomMode && isInitialMount.current) {
                 reset(); // 通常モード初期化
                 isInitialMount.current = false;
                 prevGIdxRef.current = 0;
                 prevDIdxRef.current = dIdx;
            }
            prevIsRandomModeRef.current = isRandomMode;
        } else {
            reset(); // 非アクティブ時もリセット
        }
        return () => {
            if (highlightDelayTimerRef.current !== null) {
                console.log(`[useEffect cleanup] Clearing timer: ${highlightDelayTimerRef.current}`);
                clearTimeout(highlightDelayTimerRef.current);
                highlightDelayTimerRef.current = null;
            }
        };
    }, [isActive, isRandomMode, dIdx, reset]); // ★ randomModeChangedToTrue を削除

    const currentOkVisible = okVisible;

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        console.log(`[handleInput] Start - Stage: ${stage}, Input: 0x${inputInfo.pressCode.toString(16)}`);

        if (!isActive || okVisible || !currentInputDef) {
            console.log(`[handleInput] Ignored - isActive: ${isActive}, okVisible: ${okVisible}, currentInputDef: ${!!currentInputDef}`);
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
        const expectedYouonKeyCode = youonKeyCodeEntry ? parseInt(youonKeyCodeEntry[0]) + 1 : -1;
        const expectedDakuonKeyCode = dakuonKeyCodeEntry ? parseInt(dakuonKeyCodeEntry[0]) + 1 : -1;

        // ★ 既存のタイマーがあればクリア (dakuonInput1 以外で)
        if (stage !== 'dakuonInput1' && highlightDelayTimerRef.current !== null) {
            console.log(`[handleInput] Clearing existing timer (not in dakuonInput1): ${highlightDelayTimerRef.current}`);
            clearTimeout(highlightDelayTimerRef.current);
            highlightDelayTimerRef.current = null;
        }
        // ★ 2回目のハイライト表示をデフォルトでONにする（ミスした場合などに備える）
        // ただし、dakuonInput1 で正解した直後は OFF のままにする
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
                    nextStage = 'dakuonInput2'; // ★ dakuonInput2 に直接遷移
                    setShowHighlightForSecondDakuon(false); // ★ ハイライトを一旦消す
                    console.log(`[handleInput] Correct dakuon1 -> Setting timer to show highlight for dakuonInput2`);
                    // ★ 既存のタイマーがあればクリアしてから新しいタイマーをセット
                    if (highlightDelayTimerRef.current !== null) {
                        clearTimeout(highlightDelayTimerRef.current);
                    }
                    highlightDelayTimerRef.current = window.setTimeout(() => {
                        console.log(`[handleInput] Timer fired! Showing highlight for dakuonInput2.`);
                        setShowHighlightForSecondDakuon(true);
                        highlightDelayTimerRef.current = null;
                    }, 500); // ★ 500ms 遅延
                } else {
                    isExpected = false;
                    nextStage = 'gyouInput';
                }
                break;
            // dakuonInput1_wait ケースは削除
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
                    shouldGoToNext = !isRandomMode; // ランダムモード未実装なので常に true
                } else {
                    nextStage = 'gyouInput';
                }
                break;
        }

        if (nextStage) {
             console.log(`[handleInput] Setting stage from ${stage} to ${nextStage}`);
             setStage(nextStage);
        }

        console.log(`[handleInput] End - isExpected: ${isExpected}, shouldGoToNext: ${shouldGoToNext}, Final Stage: ${nextStage ?? stage}`);
        return { isExpected, shouldGoToNext };
    // ▼▼▼ 依存配列に setShowHighlightForSecondDakuon を追加 ▼▼▼
    }, [
        isActive, okVisible, stage, currentInputDef, hid2Gyou, hid2Dan, currentFunctionKeyMap,
        isRandomMode, setStage, setShowHighlightForSecondDakuon // ★ 追加
    ]);
    // ▲▲▲ 追加 ▲▲▲

    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): string | null => {
        // console.log(`[getHighlight] Check - keyName: ${keyName}, layoutIndex: ${layoutIndex}, currentStage: ${stage}, showHighlight2: ${showHighlightForSecondDakuon}`);

        if (!isActive || okVisible || !currentInputDef) {
            return null;
        }

        const indicesJustChanged = !isRandomMode && dIdx !== prevDIdxRef.current;
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        const youonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
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
            // dakuonInput1_wait ケースは削除
            // ▼▼▼ dakuonInput2 のハイライト判定を修正 ▼▼▼
            case 'dakuonInput2':
                // ★ showHighlightForSecondDakuon が true の場合のみハイライト
                if (showHighlightForSecondDakuon) {
                    expectedKeyName = dakuonDisplayName;
                    targetLayoutIndex = 2;
                } else {
                    expectedKeyName = null; // ハイライトしない
                    targetLayoutIndex = null;
                    console.log(`[getHighlight] Stage is dakuonInput2, but highlight is hidden.`);
                }
                break;
            // ▲▲▲ 修正完了 ▲▲▲
            case 'danInput':
                expectedKeyName = currentInputDef.dan;
                targetLayoutIndex = 3;
                break;
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyName) {
            return 'bg-blue-100';
        }

        return null;
    // ▼▼▼ 依存配列に showHighlightForSecondDakuon を追加 ▼▼▼
    }, [
        isActive, okVisible, stage, currentInputDef, isRandomMode, dIdx, currentFunctionKeyMap, showHighlightForSecondDakuon // ★ 追加
    ]);
    // ▲▲▲ 追加 ▲▲▲

    // ▼▼▼ isInvalidInputTarget 関数を修正 ▼▼▼
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        // 現在のステージに応じて、不正入力が起こりうるレイヤーを特定
        switch (stage) {
            case 'gyouInput':
            case 'youonInput':
            case 'dakuonInput1':
            case 'dakuonInput2':
                expectedLayoutIndex = 2; // スタートレイヤー
                break;
            case 'danInput':
                expectedLayoutIndex = 3; // エンドレイヤー
                break;
        }

        // 期待されるレイヤーで、かつキーインデックスが一致する場合のみ true
        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive, stage]); // ★ 依存配列に stage を追加
    // ▲▲▲ 修正完了 ▲▲▲

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        isOkVisible: currentOkVisible, // ランダムモード未実装のため currentOkVisible をそのまま返す
    };
};

export default useYouhandakuonPractice;
