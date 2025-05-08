// src/hooks/useYouonKakuchoPractice.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    PracticeHookProps, PracticeHookResult, PracticeInputInfo, PracticeInputResult,
    getHidKeyCodes, hid2Gyou, hid2Dan, hid2Youon,
    PracticeHighlightResult,
    PracticeStage,
} from './usePracticeCommons';
import {
    youonGyouList,
    youonKakuchoChars,
} from '../data/keymapData';

// 練習対象のインデックス (1: ぃ, 3: ぇ)
const practiceTargetIndices = [1, 3];

const useYouonKakuchoPractice = ({
    gIdx, dIdx, isActive, side, layers, kb, isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<PracticeStage>('line');
    const [pressedKeys, setPressedKeys] = useState<Map<number, number>>(new Map());
    // randomTarget の d は 1 または 3 のみになるように
    const [randomTarget, setRandomTarget] = useState<{ g: number; d: 1 | 3 } | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持
    const prevIsRandomModeRef = useRef(isRandomMode);

    // dIdx が 1 か 3 以外の場合、強制的に 1 にする (通常モード用)
    const currentFixedDIdx = useMemo(() => {
        return practiceTargetIndices.includes(dIdx) ? dIdx as (1 | 3) : 1;
    }, [dIdx]);

    const currentGIdx = isRandomMode ? (randomTarget?.g ?? 0) : gIdx;
    // ランダムモード時は randomTarget.d、通常モード時は補正後の dIdx を使用
    const currentDIdx = isRandomMode ? (randomTarget?.d ?? 1) : currentFixedDIdx;

    const currentGyouKey = useMemo(() => youonGyouList[currentGIdx], [currentGIdx]);
    // ヘッダ表示用の文字配列 (変更なし、常に5文字)
    const currentChars = useMemo(() => youonKakuchoChars[currentGyouKey] ?? [], [currentGyouKey]);
    // ターゲットの文字 (ぃ or ぇ)
    const targetChar = useMemo(() => currentChars[currentDIdx] ?? '', [currentChars, currentDIdx]);
    // ターゲットの段キー (い段 or え段)
    const targetDan = useMemo(() => {
        return currentDIdx === 1 ? 'い段' : 'え段';
    }, [currentDIdx]);

    const expectedGyouCodes = useMemo(() => getHidKeyCodes(currentGyouKey, layers, kb, side), [currentGyouKey, layers, kb, side]);
    const expectedYouonCodes = useMemo(() => getHidKeyCodes('拗音', layers, kb, side), [layers, kb, side]);
    const expectedDanCodes = useMemo(() => getHidKeyCodes(targetDan, layers, kb, side), [targetDan, layers, kb, side]);

    // ランダムモード用のターゲット生成 (d を 1 or 3 に)
    const generateRandomTarget = useCallback(() => {
        const randomG = Math.floor(Math.random() * youonGyouList.length);
        const randomDIndex = Math.floor(Math.random() * practiceTargetIndices.length);
        const randomD = practiceTargetIndices[randomDIndex] as (1 | 3); // 1 または 3 をランダムに選択
        setRandomTarget({ g: randomG, d: randomD });
        setStage('line');
        setPressedKeys(new Map());
    }, []);

    // reset 関数
    const reset = useCallback(() => {
        setStage('line');
        setPressedKeys(new Map());
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setRandomTarget]);

    useEffect(() => {
        // isActive が false になった最初のタイミングでリセット
        if (!isActive && prevIsActiveRef.current) {
            // console.log(`[YouonKakucho useEffect] Resetting state because isActive became false.`);
            reset();
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
                // 通常モードやインデックス変更時はステージなどをリセット
                setStage('line');
                setPressedKeys(new Map());
                setRandomTarget(null);
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            // --- ランダムターゲット選択条件 (初回のみ or リセット後) ---
            } else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
                 // console.log(`[YouonKakucho useEffect] Random mode. randomModeChangedToTrue=${randomModeChangedToTrue}, isInitialMount=${isInitialMount.current}, !randomTarget=${!randomTarget}`);
                 generateRandomTarget();
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }
        }

        // 最後に前回の値を更新
        prevIsActiveRef.current = isActive;
        prevIsRandomModeRef.current = isRandomMode;

    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, generateRandomTarget, currentFixedDIdx]);


    const handleInput = useCallback((info: PracticeInputInfo): { isExpected: boolean; shouldGoToNext: boolean } => {

        let isExpected = false;
        let shouldGoToNext = false;
        const { type, pressCode } = info;

        if (type === 'press') {
            setPressedKeys(prev => new Map(prev).set(pressCode, Date.now()));
            return { isExpected: false, shouldGoToNext: false };
        }

        // --- Release Event ---
        const inputGyou = hid2Gyou(pressCode, kb, side);
        const inputDan = hid2Dan(pressCode, kb, side);
        const inputYouon = hid2Youon(pressCode, kb, side);

        let nextStage: PracticeStage | null = null;

        if (stage === 'line') {
            if (inputGyou === currentGyouKey && expectedGyouCodes.includes(pressCode)) {
                nextStage = 'youon';
                isExpected = true;
            } else {
                nextStage = 'line'; // ミス時はリセット
            }
        } else if (stage === 'youon') {
            if (inputYouon && expectedYouonCodes.includes(pressCode)) {
                nextStage = 'dan';
                isExpected = true;
            } else {
                nextStage = 'line'; // ミス時はリセット
            }
        } else if (stage === 'dan') {
            // targetDan (い段 or え段) と一致するかチェック
            if (inputDan === targetDan && expectedDanCodes.includes(pressCode)) {
                isExpected = true;
                nextStage = 'line'; // 完了して次へ
                if (isRandomMode) {
                    generateRandomTarget();
                    shouldGoToNext = false; // ランダムモードでは自動で次に進まない
                } else {
                    shouldGoToNext = true;
                }
            } else {
                nextStage = 'line'; // ミス時はリセット
            }
        }

        if (nextStage && nextStage !== stage) {
            setStage(nextStage);
        } else if (!isExpected && stage !== 'line') {
            // ミスした場合、ステージを line に戻す
            setStage('line');
        }

        return { isExpected, shouldGoToNext };

    // currentDIdx も依存配列に追加
    }, [stage, currentGyouKey, targetDan, expectedGyouCodes, expectedYouonCodes, expectedDanCodes, kb, side, isRandomMode, generateRandomTarget, currentDIdx, setStage]);

    // ヘッダー文字
    const headingChars = useMemo(() => {
        if (!isActive) return []; // 非アクティブ時は空配列

        if (isRandomMode) {
            // ランダムモード時はターゲット文字のみ表示
            return targetChar ? [targetChar] : [];
        } else {
            // 通常モード時は行全体の文字を表示
            return currentChars;
        }
    // 依存配列に isActive と targetChar を追加し、不要なものを削除
    }, [isActive, isRandomMode, targetChar, currentChars]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };

        // 問題切り替え直後は強制的に 'line' として扱う (通常モードのみ)
        const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
        const currentStageForHighlight = indicesJustChanged ? 'line' : stage;

        if (currentStageForHighlight === 'line' && layoutIndex === 2 && key === currentGyouKey) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        if (currentStageForHighlight === 'youon' && layoutIndex === 2 && key === '拗音') {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        // targetDan (い段 or え段) をハイライト
        if (currentStageForHighlight === 'dan' && layoutIndex === 3 && key === targetDan) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    // targetDan も依存配列に追加
    }, [stage, currentGyouKey, targetDan, isRandomMode, gIdx, dIdx]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, idx: number): boolean => {
        if (!isActive) return false; // 非アクティブ時は常に false

        let expectedCodes: number[] = [];
        let expectedLayoutIndex: number | null = null;

        if (stage === 'line') {
            expectedCodes = expectedGyouCodes;
            expectedLayoutIndex = 2;
        } else if (stage === 'youon') {
            expectedCodes = expectedYouonCodes;
            expectedLayoutIndex = 2;
        } else if (stage === 'dan') {
            expectedCodes = expectedDanCodes;
            expectedLayoutIndex = 3;
        }

        // 期待されるキーコードに含まれていれば不正入力ではない
        if (expectedCodes.includes(pressCode)) return false;

        // 期待されるレイヤーで、かつ押されたキーのインデックスが一致する場合のみ不正入力ターゲット
        const targetKeyIndex = pressCode - 1;
        return layoutIndex === expectedLayoutIndex && idx === targetKeyIndex;
    // expectedDanCodes も依存配列に追加
    }, [isActive, stage, expectedGyouCodes, expectedYouonCodes, expectedDanCodes]);


    return {
        handleInput,
        headingChars,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
    };
};

export default useYouonKakuchoPractice;
