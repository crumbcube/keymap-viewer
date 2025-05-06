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
        // 通常モード: inputDef が存在し、gyouKey が未定義（または空）の場合に「=」と判断
        return !!currentInputDef && !currentInputDef.gyouKey;
    }, [isRandomMode, randomTarget, currentInputDef]);

    // ▼▼▼ 追加: 現在のターゲット文字を取得する useMemo ▼▼▼
    const currentTargetChar = useMemo(() => {
        if (isRandomMode) return randomTarget?.char ?? null;
        if (!currentGroup?.chars || dIdx < 0 || dIdx >= currentGroup.chars.length) return null;
        return currentGroup.chars[dIdx];
    }, [isRandomMode, randomTarget, currentGroup, dIdx]);
    // ▲▲▲ 追加完了 ▲▲▲

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

        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
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
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]);

    // ▼▼▼ highlightTargetGyouKeyDisplayName の useMemo を削除 ▼▼▼
    // const highlightTargetGyouKeyDisplayName = useMemo(() => { ... });
    // ▲▲▲ 削除完了 ▲▲▲

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {

        if (!isActive) {
            return { isExpected: false, shouldGoToNext: false };
        }
        // 「=」以外の場合のみ expectedGyouKey をチェック
        if (!isTargetEqualSign && !expectedGyouKey) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext = false;

        // 「記号」キーの期待されるHIDコードを取得
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
            } else {
                isExpected = false;
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
                        } else {
                            // 「=」以外の場合、行入力へ
                            setStage('gyouInput');
                            isExpected = true;
                        }
                    } else {
                        isExpected = false;
                    }
                    break;

                case 'gyouInput': // 「＝」以外の記号の2打目
                    // expectedGyouKey はこの時点で null でないはず (関数の先頭でチェック済み)
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
                    } else {
                        isExpected = false;
                        setStage('kigoInput');
                    }
                    break;

                case 'kigoInputWait': // 2打目待ち中に予期せぬ入力があった場合
                    isExpected = false;
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

        return { isExpected, shouldGoToNext };
    }, [
        isActive, stage, hid2Gyou, isTargetEqualSign, expectedGyouKey,
        isRandomMode, selectNextRandomTarget, setStage, setShowHighlightAfterWait
    ]);

    // ▼▼▼ getHighlightClassName を修正 ▼▼▼
    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive) {
            return noHighlight;
        }
        // 「=」以外の場合のみ expectedGyouKey をチェック
        // ★★★ 修正: expectedGyouKey が null でも isTargetEqualSign が true ならOK ★★★
        if (!isTargetEqualSign && !expectedGyouKey) {
             console.warn("getHighlightClassName: expectedGyouKey is null for non-equal sign target");
             return noHighlight;
        }

        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        // ★★★ 修正: kigoInputWait ステージ中はインデックス変更による強制変更を無視 ★★★
        const currentStageForHighlight = (indicesJustChanged && stage !== 'kigoInputWait') ? 'kigoInput' : stage;

        let expectedKeyDisplayName: string | null = null;
        // ★★★ 修正: targetLayoutIndex を 8 に変更 ★★★
        const targetLayoutIndex = 8;

        // --- 「＝\n記号」キーの実際の表示名を取得するロジック (レイヤー8から) ---
        // const layer8 = layers[targetLayoutIndex] ?? []; // layers[8] を参照 (今回は直接文字列を使うので不要)
        // '＝\n記号' という表示名で直接検索
        const equalSignKeyName = '＝\n記号';
        // --- ここまで ---

        if (currentStageForHighlight === 'kigoInputWait') {
            // 「=」の2打目待ち中は equalSignKeyName をハイライト (点滅制御あり)
            // ★★★ 修正: equalSignKeyName と targetLayoutIndex=8 を使用 ★★★
            if (keyName === equalSignKeyName && layoutIndex === targetLayoutIndex) {
                return { className: showHighlightAfterWait ? 'bg-blue-100' : null, overrideKey: null };
            }
            return noHighlight;
        }

        // ▼▼▼ 修正: ステージごとの expectedKeyDisplayName 設定 ▼▼▼
        if (currentStageForHighlight === 'kigoInput') {
            // 1打目は常に「＝\n記号」キー
            expectedKeyDisplayName = equalSignKeyName;
        } else if (currentStageForHighlight === 'gyouInput') {
            // 2打目 (「=」以外) は行キーに対応する記号
            // ★★★ 修正: expectedGyouKey ではなく currentTargetChar を使用 ★★★
            expectedKeyDisplayName = currentTargetChar; // 例: ' ` '
        }
        // ▲▲▲ 修正完了 ▲▲▲

        // ★★★ 修正: targetLayoutIndex=8 を使用 ★★★
        if (expectedKeyDisplayName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyDisplayName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }

        return noHighlight;
    }, [
        isActive, stage, showHighlightAfterWait, isTargetEqualSign, expectedGyouKey, currentTargetChar, // ★★★ currentTargetChar を追加 ★★★
        isRandomMode, gIdx, dIdx,
        layers, // ★★★ layers を依存配列に追加 ★★★
        // hid2Gyou は不要になったので削除
    ]);
    // ▲▲▲ 修正完了 ▲▲▲

    // isInvalidInputTarget (変更なし)
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;
        // ★★★ 修正: 記号3はレイヤー8のみ対象 ★★★
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
