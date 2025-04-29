// src/hooks/useYouonKakuchoPractice.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    PracticeHookProps, PracticeHookResult, PracticeInputInfo, PracticeStage,
    getHidKeyCodes, hid2Gyou, hid2Dan, hid2Youon,
} from './usePracticeCommons';
import {
    youonGyouList,
    youonKakuchoChars,
    youonKakuchoDanMapping, // 段キーのマッピング自体は変更なし
} from '../data/keymapData';

// 練習対象のインデックス (1: ぃ, 3: ぇ)
const practiceTargetIndices = [1, 3];

const useYouonKakuchoPractice = ({
    gIdx, dIdx, isActive, okVisible, side, layers, kb, isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<PracticeStage>('line');
    const [pressedKeys, setPressedKeys] = useState<Map<number, number>>(new Map());
    // randomTarget の d は 1 または 3 のみになるように
    const [randomTarget, setRandomTarget] = useState<{ g: number; d: 1 | 3 } | null>(null);

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
        console.log(`Generated random target: g=${randomG}, d=${randomD}`);
    }, []);

    useEffect(() => {
        console.log(`YouonKakucho useEffect run. isActive: ${isActive} isRandomMode: ${isRandomMode} randomTarget:`, randomTarget, `gIdx: ${gIdx}, dIdx: ${dIdx} (fixed: ${currentFixedDIdx})`);
        if (isActive) {
            if (isRandomMode) {
                if (!randomTarget) {
                    console.log("Generating initial random target for YouonKakucho");
                    generateRandomTarget();
                }
            } else {
                console.log("Resetting to normal mode or index changed");
                setStage('line');
                setPressedKeys(new Map());
                setRandomTarget(null);
                // 通常モード開始時やインデックス変更時に dIdx を補正
                if (!practiceTargetIndices.includes(dIdx)) {
                    console.warn(`Invalid dIdx ${dIdx} detected in normal mode. Forcing to 1.`);
                    // ここで App.tsx の setDIdx を呼び出すのは良くないため、
                    // currentFixedDIdx を使うことで対応。nextStage で正しい値に遷移させる。
                }
            }
        } else {
            setStage('line');
            setPressedKeys(new Map());
            setRandomTarget(null);
        }
    // gIdx, dIdx の変更も検知
    }, [isActive, isRandomMode, gIdx, dIdx, generateRandomTarget, randomTarget, currentFixedDIdx]);

    const reset = useCallback(() => {
        console.log("Reset called in useYouonKakuchoPractice");
        setStage('line');
        setPressedKeys(new Map());
        if (isRandomMode && isActive) {
            console.log("Generating new random target on reset");
            generateRandomTarget();
        } else {
            setRandomTarget(null);
            // 通常モードのリセット時も dIdx を 1 に戻す（必要なら App.tsx 側で setDIdx(1) を呼ぶ）
            // ここでは currentFixedDIdx を使うのでフック内での dIdx 変更は不要
        }
    }, [isRandomMode, isActive, generateRandomTarget]);

    const handleInput = useCallback((info: PracticeInputInfo): { isExpected: boolean; shouldGoToNext: boolean } => {
        console.log("YouonKakucho Input:", info, "Stage:", stage, "Expected Gyou:", currentGyouKey, "Expected Dan:", targetDan, `(dIdx: ${currentDIdx})`, "RandomMode:", isRandomMode, "PropOK:", okVisible);

        if (okVisible) return { isExpected: false, shouldGoToNext: false };

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

        if (stage === 'line') {
            console.log("Stage: line, Input Gyou:", inputGyou, "Expected Gyou:", currentGyouKey, "Input Code:", pressCode, "Expected Codes:", expectedGyouCodes);
            if (inputGyou === currentGyouKey && expectedGyouCodes.includes(pressCode)) {
                setStage('youon');
                isExpected = true;
            }
        } else if (stage === 'youon') {
            console.log("Stage: youon, Input Youon:", inputYouon, "Expected Youon: 拗音 or 拗1-4", "Input Code:", pressCode, "Expected Codes:", expectedYouonCodes);
            if (inputYouon && expectedYouonCodes.includes(pressCode)) {
                setStage('dan');
                isExpected = true;
            } else {
                setStage('line');
            }
        } else if (stage === 'dan') {
            console.log("Stage: dan, Input Dan:", inputDan, "Expected Dan:", targetDan, "Input Code:", pressCode, "Expected Codes:", expectedDanCodes);
            // targetDan (い段 or え段) と一致するかチェック
            if (inputDan === targetDan && expectedDanCodes.includes(pressCode)) {
                console.log("Correct dan input for YouonKakucho");
                isExpected = true;
                shouldGoToNext = true;
                setStage('line');
                if (isRandomMode) {
                    generateRandomTarget();
                }
            } else {
                setStage('line');
            }
        }

        console.log("YouonKakucho Result:", { isExpected, shouldGoToNext });
        return { isExpected, shouldGoToNext };

    // currentDIdx も依存配列に追加
    }, [stage, currentGyouKey, targetDan, expectedGyouCodes, expectedYouonCodes, expectedDanCodes, okVisible, kb, side, isRandomMode, generateRandomTarget, currentDIdx]);

    // ヘッダ文字は常に5文字返す
    const headingChars = useMemo(() => {
        console.log("Calculating headingChars for YouonKakucho. isRandomMode:", isRandomMode, "randomTarget:", randomTarget, `currentGIdx: ${currentGIdx}`);
        return currentChars;
    }, [currentChars, isRandomMode, randomTarget, currentGIdx]);

    // ハイライトは現在のターゲット (ぃ or ぇ) のみ
    const getHighlightClassName = useCallback((key: string, layoutIndex: number): string => {
        if (okVisible) return '';

        if (stage === 'line' && layoutIndex === 2 && key === currentGyouKey) {
            return 'bg-blue-100';
        }
        if (stage === 'youon' && layoutIndex === 2 && ['拗音', '拗1', '拗2', '拗3', '拗4'].includes(key)) {
            return 'bg-blue-100';
        }
        // targetDan (い段 or え段) をハイライト
        if (stage === 'dan' && layoutIndex === 3 && key === targetDan) {
            return 'bg-blue-100';
        }
        return '';
    // targetDan も依存配列に追加
    }, [stage, currentGyouKey, targetDan, okVisible]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, idx: number): boolean => {
        if (stage === 'line' && layoutIndex === 2 && expectedGyouCodes.includes(pressCode)) return false;
        if (stage === 'youon' && layoutIndex === 2 && expectedYouonCodes.includes(pressCode)) return false;
        // targetDan (い段 or え段) をチェック
        if (stage === 'dan' && layoutIndex === 3 && expectedDanCodes.includes(pressCode)) return false;

        const targetKeyIndex = pressCode - 1;
        return idx === targetKeyIndex && (layoutIndex === 2 || layoutIndex === 3);
    // expectedDanCodes も依存配列に追加
    }, [stage, expectedGyouCodes, expectedYouonCodes, expectedDanCodes]);


    return {
        handleInput,
        headingChars,
        getHighlightClassName,
        isOkVisible: okVisible,
        reset,
        isInvalidInputTarget,
    };
};

export default useYouonKakuchoPractice;
