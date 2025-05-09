// /home/coffee/my-keymap-viewer/src/hooks/useYouonKakuchoPractice.ts
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

const useYouonKakuchoPractice = ({
    gIdx, dIdx, isActive, side, layers, kb, isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<PracticeStage>('line');
    const [pressedKeys, setPressedKeys] = useState<Map<number, number>>(new Map());
    const [randomTarget, setRandomTarget] = useState<{ g: number; d: number } | null>(null);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持
    const prevIsRandomModeRef = useRef(isRandomMode);

    // Log prop values and derived currentGIdx/currentDIdx
    console.log(`[YouonKakuchoPractice] Hook execution. Props: gIdx=${gIdx}, dIdx=${dIdx}, isActive=${isActive}, isRandomMode=${isRandomMode}`);
    const currentGIdx = isRandomMode ? (randomTarget?.g ?? 0) : gIdx;
    // ランダムモード時は randomTarget.d、通常モード時は補正後の dIdx を使用
    const currentDIdx = isRandomMode ? (randomTarget?.d ?? 0) : dIdx; // 通常モードは props.dIdx を直接使用
    console.log(`[YouonKakuchoPractice] Derived: currentGIdx=${currentGIdx}, currentDIdx=${currentDIdx}`);

    const currentGyouKey = useMemo(() => {
        const keyVal = youonGyouList[currentGIdx];
        // console.log(`[YouonKakuchoPractice] Memo currentGyouKey: ${keyVal} (currentGIdx: ${currentGIdx})`);
        return keyVal;
    }, [currentGIdx]);

    // ヘッダ表示用の文字配列 (変更なし、常に5文字)
    const currentChars = useMemo(() => {
        const charsArray = youonKakuchoChars[currentGyouKey] ?? [];
        // console.log(`[YouonKakuchoPractice] Memo currentChars: [${charsArray.join(',')}] (currentGyouKey: ${currentGyouKey})`);
        return charsArray;
    }, [currentGyouKey]);

    // ターゲットの文字 (ぃ or ぇ)
    const targetChar = useMemo(() => {
        const charVal = currentChars[currentDIdx] ?? '';
        // console.log(`[YouonKakuchoPractice] Memo targetChar: "${charVal}" (currentDIdx: ${currentDIdx}, currentChars: [${currentChars.join(',')}])`);
        return charVal;
    }, [currentChars, currentDIdx]);

    const targetDan = useMemo(() => {
        const danMap = ['あ段', 'い段', 'う段', 'え段', 'お段']; // 拗音拡張の段マッピング
        const danVal = danMap[currentDIdx] ?? 'あ段'; // currentDIdx (0-4) に対応する段を返す
        // console.log(`[YouonKakuchoPractice] Memo targetDan: "${danVal}" (currentDIdx: ${currentDIdx})`);
        return danVal;
    }, [currentDIdx]);

    const expectedGyouCodes = useMemo(() => getHidKeyCodes(currentGyouKey, layers, kb, side), [currentGyouKey, layers, kb, side]);
    const expectedYouonCodes = useMemo(() => getHidKeyCodes('拗音', layers, kb, side), [layers, kb, side]);
    const expectedDanCodes = useMemo(() => getHidKeyCodes(targetDan, layers, kb, side), [targetDan, layers, kb, side]);

    // ランダムモード用のターゲット生成 (d を 1 or 3 に)
    const generateRandomTarget = useCallback(() => {
        const randomG = Math.floor(Math.random() * youonGyouList.length); // randomG をここで宣言
        const gyouKeyForRandom = youonGyouList[randomG];
        const charsInGyou = youonKakuchoChars[gyouKeyForRandom] ?? [];
        if (charsInGyou.length === 0) {
            setRandomTarget(null); // Or select a default
            return;
        }
        const randomD = Math.floor(Math.random() * charsInGyou.length); // d は 0 から (文字数-1) の範囲
        setRandomTarget({ g: randomG, d: randomD }); // d は number 型
        setStage('line');
        setPressedKeys(new Map());
    }, [setRandomTarget, setStage, setPressedKeys]);
 
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
                console.log(`[YouonKakucho useEffect] Reset condition met. randomModeChangedToFalse=${randomModeChangedToFalse}, isRandomMode=${isRandomMode}, isInitialMount.current=${isInitialMount.current}, indicesChanged=${indicesChanged}. Setting stage to 'line'. Current gIdx=${gIdx}, dIdx=${dIdx}`);
                setStage('line');
                setPressedKeys(new Map());
                setRandomTarget(null);
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            // --- ランダムターゲット選択条件 (初回のみ or リセット後) ---
            } else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
                console.log(`[YouonKakucho useEffect] Random mode condition met. randomModeChangedToTrue=${randomModeChangedToTrue}, isInitialMount.current=${isInitialMount.current}, !randomTarget=${!randomTarget}. Generating random target.`);
                generateRandomTarget();
                isInitialMount.current = false;
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
            }
        }

        // 最後に前回の値を更新
        prevIsActiveRef.current = isActive;
        prevIsRandomModeRef.current = isRandomMode;

    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, generateRandomTarget]);


    const handleInput = useCallback((info: PracticeInputInfo): PracticeInputResult => {

        let isExpected = false;
        let shouldGoToNext: boolean | undefined = undefined; // Initialize to undefined
        const { type, pressCode } = info;

        // console.log(`[YouonKakuchoPractice handleInput] Start. Stage: ${stage}, pressCode: 0x${pressCode.toString(16)}, type: ${type}, Target: ${targetChar}`);
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
                // shouldGoToNext remains undefined as the character is not complete
            } else {
                nextStage = 'line'; // ミス時はリセット
            }
        } else if (stage === 'youon') {
            if (inputYouon && expectedYouonCodes.includes(pressCode)) {
                nextStage = 'dan';
                isExpected = true;
                // shouldGoToNext remains undefined as the character is not complete
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
                    shouldGoToNext = false; // For random mode, this means "don't advance gIdx/dIdx in App.tsx"
                } else {
                    // 通常モードの場合、現在の dIdx がその行の最後の練習対象か確認
                    const charsInCurrentGyou = youonKakuchoChars[currentGyouKey] ?? [];
                    const isLastCharInGroup = currentDIdx === (charsInCurrentGyou.length - 1);
                    if (isLastCharInGroup) {
                        shouldGoToNext = true; // グループの最後の文字なら App.tsx に進行を伝える
                    } else {
                        shouldGoToNext = false; // グループの途中なら App.tsx には伝えない
                    }
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

        console.log(`[YouonKakuchoPractice handleInput] End. isExpected=${isExpected}, shouldGoToNext=${shouldGoToNext}. Stage was: ${stage}, nextStage determined: ${nextStage ?? stage}. Set new stage to: ${nextStage ?? stage}`);
        return { isExpected, shouldGoToNext };

    }, [stage, currentGyouKey, targetDan, expectedGyouCodes, expectedYouonCodes, expectedDanCodes, kb, side, isRandomMode, generateRandomTarget, currentDIdx, setStage, currentChars.length]);

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
    }, [isActive, isRandomMode, targetChar, currentChars]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };

        // useEffect が stage を適切に 'line' にリセットするため、直接 stage を使用
        console.log(`[YouonKakuchoPractice getHighlight] Stage for highlight: ${stage}, Key: ${key}, Layout: ${layoutIndex}, currentGyouKey: ${currentGyouKey}, targetDan: ${targetDan}`);

        if (stage === 'line' && layoutIndex === 2 && key === currentGyouKey) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        if (stage === 'youon' && layoutIndex === 2 && key === '拗音') {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        if (stage === 'dan' && layoutIndex === 3 && key === targetDan) {
            return { className: 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    }, [stage, currentGyouKey, targetDan]);

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
