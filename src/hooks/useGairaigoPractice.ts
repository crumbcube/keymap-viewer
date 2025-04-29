// src/hooks/useGairaigoPractice.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    PracticeHookProps, PracticeHookResult, PracticeInputInfo, PracticeInputResult,
    getHidKeyCodes,
    PracticeHighlightResult,
    CharInfoGairaigo,
    allGairaigoCharInfos,
} from './usePracticeCommons';
import { gairaigoPracticeData, GairaigoPracticeTarget } from '../data/keymapData';

type GairaigoStage = 'key1' | 'key2' | 'key3';

const useGairaigoPractice = ({
    gIdx, dIdx, isActive, okVisible, side, layers, kb, isRandomMode // isRandomMode を受け取る
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<GairaigoStage>('key1');
    const [pressedKeys, setPressedKeys] = useState<Map<number, number>>(new Map());
    const [randomTarget, setRandomTarget] = useState<CharInfoGairaigo | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);

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
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setPressedKeys, setRandomTarget]); // setRandomTarget を追加

    useEffect(() => {
        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            // --- リセット条件 ---
            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                reset(); // reset 関数を呼び出す
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }

            // --- ランダムターゲット選択条件 (初回のみ or リセット後) ---
            if (isRandomMode && !randomTarget && (randomModeChangedToTrue || isInitialMount.current)) {
                 selectNextRandomTarget();
                 isInitialMount.current = false;
                 // ランダムモードでは gIdx/dIdx は参照しない
                 prevGIdxRef.current = -1;
                 prevDIdxRef.current = -1;
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
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]);

    const currentTarget = useMemo(() => {
        if (isRandomMode) {
            // ランダムモード時は randomTarget をそのまま GairaigoPracticeTarget 相当として扱う
            // (CharInfoGairaigo は GairaigoPracticeTarget と互換性がある)
            return randomTarget as GairaigoPracticeTarget | null;
        } else {
            // 通常モードのロジック
            if (!isActive || gIdx < 0 || gIdx >= gairaigoPracticeData.length) return null;
            const currentGroup = gairaigoPracticeData[gIdx];
            if (!currentGroup?.targets || dIdx < 0 || dIdx >= currentGroup.targets.length) return null;
            return (currentGroup.targets[dIdx] ?? null) as GairaigoPracticeTarget | null;
        }
    }, [isRandomMode, randomTarget, isActive, gIdx, dIdx]);

    const expectedKey1Codes = useMemo(() => currentTarget ? getHidKeyCodes(currentTarget.keys[0], layers, kb, side) : [], [currentTarget, layers, kb, side]);
    const expectedKey2Codes = useMemo(() => currentTarget ? getHidKeyCodes(currentTarget.actualSecondKey, layers, kb, side) : [], [currentTarget, layers, kb, side]);
    const expectedKey3Codes = useMemo(() => currentTarget ? getHidKeyCodes(currentTarget.keys[2], layers, kb, side) : [], [currentTarget, layers, kb, side]);

    const handleInput = useCallback((info: PracticeInputInfo): PracticeInputResult => { // 戻り値の型を修正

        // currentTarget が null の場合も早期リターン
        if (!isActive || okVisible || !currentTarget) {
            return { isExpected: false, shouldGoToNext: false };
        }

        let isExpected = false;
        let shouldGoToNext = false;
        const { type, pressCode } = info;

        if (type === 'press') {
            setPressedKeys(prev => new Map(prev).set(pressCode, Date.now()));
            return { isExpected: false, shouldGoToNext: false };
        }

        // --- Release Event ---
        let nextStage: GairaigoStage | null = null;

        if (stage === 'key1') {
            if (expectedKey1Codes.includes(pressCode)) {
                nextStage = 'key2';
                isExpected = true;
            } else {
                nextStage = 'key1'; // ミス時はリセット
            }
        } else if (stage === 'key2') {
            if (expectedKey2Codes.includes(pressCode)) {
                nextStage = 'key3';
                isExpected = true;
            } else {
                nextStage = 'key1'; // ミス時はリセット
            }
        } else if (stage === 'key3') {
            if (expectedKey3Codes.includes(pressCode)) {
                nextStage = 'key1'; // 完了して次へ
                isExpected = true;
                if (isRandomMode) {
                    selectNextRandomTarget();
                    shouldGoToNext = false; // ランダムモードでは自動で次に進まない
                } else {
                    shouldGoToNext = true;
                }
            } else {
                nextStage = 'key1'; // ミス時はリセット
            }
        }

        if (nextStage && nextStage !== stage) {
            setStage(nextStage);
        } else if (!isExpected && stage !== 'key1') {
            setStage('key1');
        }

        return { isExpected, shouldGoToNext };

    // isRandomMode, selectNextRandomTarget を依存配列に追加
    }, [stage, currentTarget, expectedKey1Codes, expectedKey2Codes, expectedKey3Codes, okVisible, setStage, isActive, isRandomMode, selectNextRandomTarget]);

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
        if (!isActive || okVisible || !currentTarget) return noHighlight;

        // 問題切り替え直後は強制的に 'key1' として扱う (通常モードのみ)
        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = indicesJustChanged ? 'key1' : stage;

        let expectedKeyName = ''; // 期待される実際のキー名
        let displayKeyName = ''; // 上書き表示するキー名
        let targetLayoutIndex: number | null = null;

        if (currentStageForHighlight === 'key1') {
            expectedKeyName = currentTarget.keys[0]; // あ行, か行, ...
            displayKeyName = expectedKeyName; // 表示はそのまま
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'key2') {
            expectedKeyName = currentTarget.actualSecondKey; // さ行, ま行, ら行, 拗音
            displayKeyName = currentTarget.keys[1]; // 拗音, 拗2, 拗3, 拗4
            targetLayoutIndex = 2;
        } else if (currentStageForHighlight === 'key3') {
            expectedKeyName = currentTarget.keys[2]; // 段キー
            displayKeyName = expectedKeyName; // 表示はそのまま
            if (expectedKeyName.endsWith('段')) {
                targetLayoutIndex = 3;
            } else {
                targetLayoutIndex = 3; // デフォルト
            }
        }

        // 実際のキー (key) が期待されるキー (expectedKeyName) と一致し、
        // かつレイヤーが一致する場合にハイライトと表示上書きを行う
        if (expectedKeyName && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            return {
                className: 'bg-blue-100',
                overrideKey: displayKeyName // 上書き表示するキー名を返す
            };
        }

        return noHighlight;
    // isActive, isRandomMode, gIdx, dIdx を依存配列に追加
    }, [stage, currentTarget, okVisible, isActive, isRandomMode, gIdx, dIdx]);

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
            expectedCodes = expectedKey3Codes;
            const thirdKey = currentTarget.keys[2];
            expectedLayoutIndex = thirdKey.endsWith('段') ? 3 : 3;
        }

        // 期待されるキーコードに含まれていれば不正入力ではない
        if (expectedCodes.includes(pressCode)) return false;

        // 期待されるレイヤーで、かつ押されたキーのインデックスが一致する場合のみ不正入力ターゲット
        const targetKeyIndex = pressCode - 1;
        return layoutIndex === expectedLayoutIndex && idx === targetKeyIndex;
    // isActive を依存配列に追加
    }, [stage, expectedKey1Codes, expectedKey2Codes, expectedKey3Codes, currentTarget, isActive]);
    // ▲▲▲ 修正 ▲▲▲


    return {
        handleInput,
        headingChars,
        getHighlightClassName,
        isOkVisible: okVisible, // isRandomMode で okVisible を強制的に false にする必要はない
        reset,
        isInvalidInputTarget,
    };
};

export default useGairaigoPractice;
