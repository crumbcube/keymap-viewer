// src/hooks/useKanaChallengePractice.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    PracticeHighlightResult,
    CharInfoSeion,
    allSeionCharInfos,
    CharInfoYouon, // 拗音の型
    allYouonCharInfos, // 拗音のデータ
    CharInfoDakuon, // 濁音の型
    allDakuonCharInfos, // 濁音のデータ
    CharInfoSokuonKomoji, // 促音・小文字の型
    allSokuonKomojiCharInfos, // 促音・小文字のデータ
    hid2Gyou,
    hid2Dan,
    functionKeyMaps, // 機能キーのマッピング
    getHidKeyCodes, // ← これを追加
    ChallengeResult, // 結果の型をインポート
} from './usePracticeCommons';

type ChallengeStatus = 'idle' | 'countdown' | 'running' | 'finished';
type KanaTarget = CharInfoSeion | CharInfoYouon | CharInfoDakuon | CharInfoSokuonKomoji; // | CharInfoHandakuon;
type ChallengeStage = 'gyouInput' | 'danInput' | 'youonInput' | 'dakuonInput' | 'tsuInput'; // 促音用ステージ追加

const COUNTDOWN_SECONDS = 5;
const TRAINING_DURATION_MS = 60 * 1000; // 1分
const CHALLENGE_DURATION_SECONDS = 60; // チャレンジ時間（秒）

// --- ランクメッセージ判定関数 ---
const getRankMessage = (score: number): string => {
  if (score >= 1500) return "Godlike! タイピングの神！";
  if (score >= 1000) return "Excellent! 正確さバッチリ！";
  if (score >= 500) return "Great! なかなかやりますね！";
  if (score >= 200) return "Good! その調子！";
  return "Keep Trying! 練習あるのみ！";
};

const useKanaChallengePractice = ({
    isActive,
    okVisible,
    side,
    kb,
    layers,
}: PracticeHookProps): PracticeHookResult => {
    const [status, setStatus] = useState<ChallengeStatus>('idle');
    const [countdownValue, setCountdownValue] = useState<number>(COUNTDOWN_SECONDS);
    const [remainingTime, setRemainingTime] = useState<number>(TRAINING_DURATION_MS);
    const [currentTarget, setCurrentTarget] = useState<KanaTarget | null>(null);
    const [challengeStage, setChallengeStage] = useState<ChallengeStage>('gyouInput');
    const [headingChars, setHeadingChars] = useState<string[]>([]); // ヘッダー表示用 state
    const [isFinished, setIsFinished] = useState(false); // 終了状態 state

    const countdownTimerRef = useRef<number | null>(null);
    const trainingTimerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const correctCountRef = useRef(0); // 正解タイプ数
    const missCountRef = useRef(0); // ミスタイプ数
    const totalCharsTypedRef = useRef(0); // 総入力文字数（正解・不正解問わず）
    const questionsCompletedRef = useRef(0); // クリアした問題数（文字単位ではなく問題単位）
    const totalAttemptedRef = useRef(0); // 総試行回数（文字単位）
    const [challengeResults, setChallengeResults] = useState<ChallengeResult | null>(null);


    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    const allKanaTargets = useMemo(() => {
        // 促音「っ」のみをフィルタリングして追加
        const tsuTargets = allSokuonKomojiCharInfos.filter(info => info.isTsu);
        // TODO: 将来的には半濁音も結合
        return [...allSeionCharInfos, ...allYouonCharInfos, ...allDakuonCharInfos, ...tsuTargets];
    }, []);

    // 次のランダムターゲットを選択
    const selectNextTarget = useCallback(() => {
        if (allKanaTargets.length > 0) {
            const randomIndex = Math.floor(Math.random() * allKanaTargets.length);
            const nextTarget = allKanaTargets[randomIndex];
            console.log(">>> Selecting new Kana Challenge target:", nextTarget);
            setCurrentTarget(nextTarget);
            if (nextTarget.type === 'sokuonKomoji' && nextTarget.isTsu) {
                setChallengeStage('tsuInput');
            } else {
                setChallengeStage('gyouInput');
            }
        } else {
            setCurrentTarget(null);
        }
    }, [allKanaTargets]);

    // カウントダウン処理
    useEffect(() => {
        if (isActive && status === 'countdown') {
            if (countdownValue > 0) {
                countdownTimerRef.current = window.setTimeout(() => {
                    setCountdownValue(prev => prev - 1);
                }, 1000);
            } else {
                setStatus('running');
                setRemainingTime(TRAINING_DURATION_MS);
                startTimeRef.current = Date.now();
                selectNextTarget();
            }
        }
        return () => {
            if (countdownTimerRef.current !== null) {
                clearTimeout(countdownTimerRef.current);
            }
        };
    }, [isActive, status, countdownValue, selectNextTarget]);

    // トレーニング時間計測 & 終了処理
    useEffect(() => {
        if (isActive && status === 'running') {
            trainingTimerRef.current = window.setInterval(() => {
                const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
                const newRemaining = Math.max(0, TRAINING_DURATION_MS - elapsed);
                setRemainingTime(newRemaining);
                if (newRemaining === 0) {
                    setStatus('finished');
                    setIsFinished(true); // 終了状態をセット
                    console.log('[KanaChallenge] Timer finished. Setting status to finished.'); // ★追加
                    if (trainingTimerRef.current) clearInterval(trainingTimerRef.current); // タイマー停止

                    const correct = correctCountRef.current;
                    const miss = missCountRef.current;
                    const totalTyped = correct + miss; // 正誤合わせた総タイプ数
                    const accuracy = totalTyped > 0 ? correct / totalTyped : 0;
                    const missRate = 1 - accuracy;
                    const cps = correct / CHALLENGE_DURATION_SECONDS;
                    const score = Math.round(cps * Math.pow(1 - missRate, 2) * 1000);
                    const rankMessage = getRankMessage(score);

                    const results: ChallengeResult = {
                        totalQuestions: totalAttemptedRef.current, // 問題数 -> 総試行回数に変更
                        totalCharsTyped: totalCharsTypedRef.current, // 実際にタイプした総文字数
                        correctCount: correct,
                        missCount: miss,
                        accuracy: accuracy,
                        score: score,
                        rankMessage: rankMessage,
                    };
                    console.log('[KanaChallenge] Calculated results:', results); // ★追加
                    setChallengeResults(results); // 計算結果を state にセット
                    setHeadingChars([]); // ヘッダーはクリア（結果は App.tsx で表示するため）
                }
            }, 100);
        } else if (status === 'finished' && trainingTimerRef.current) {
             clearInterval(trainingTimerRef.current); // 終了したら確実に止める
        }
        return () => {
            if (trainingTimerRef.current !== null) {
                clearInterval(trainingTimerRef.current);
            }
        };
    // isFinished を依存配列に追加
    }, [isActive, status, isFinished]);

    // ヘッダー表示
    useEffect(() => {
        if (status === 'countdown') {
            setHeadingChars([`${countdownValue}秒`]);
        } else if (status === 'running' && currentTarget) {
            setHeadingChars([currentTarget.char]);
        } else if (status === 'finished') {
            // 結果計算後にヘッダーはクリアされるので、ここでは何もしない
            // setHeadingChars([]); // 以前のロジックは削除
        } else if (status === 'idle') {
            setHeadingChars([]);
        }
    }, [status, countdownValue, currentTarget]);


    // リセット処理
    const reset = useCallback(() => {
        setStatus('idle');
        setIsFinished(false); // 終了状態もリセット
        setCountdownValue(COUNTDOWN_SECONDS);
        setRemainingTime(TRAINING_DURATION_MS);
        setCurrentTarget(null);
        setChallengeStage('gyouInput');
        setHeadingChars([]); // ヘッダーもクリア
        setChallengeResults(null); // 結果もリセット
        startTimeRef.current = null;
        correctCountRef.current = 0;
        missCountRef.current = 0;
        totalCharsTypedRef.current = 0;
        questionsCompletedRef.current = 0; // 使っていないが一応リセット
        totalAttemptedRef.current = 0;
        if (countdownTimerRef.current !== null) clearTimeout(countdownTimerRef.current);
        if (trainingTimerRef.current !== null) clearInterval(trainingTimerRef.current);
        console.log("Resetting Kana Challenge Practice");
    }, [setChallengeResults, setHeadingChars]);

    // アクティブになったらカウントダウン開始
    useEffect(() => {
        if (isActive && status === 'idle') {
            setStatus('countdown');
            setCountdownValue(COUNTDOWN_SECONDS);
        } else if (!isActive) {
            reset();
        }
    }, [isActive, status, reset]);


    // 入力処理
    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        // isFinished をチェック
        if (status !== 'running' || !currentTarget || isFinished) {
            return { isExpected: false, shouldGoToNext: false };
        }
        if (inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let nextStage: ChallengeStage | null = null;
        let shouldIncrementAttempt = false;

        console.log(`[KanaChallenge] Input: 0x${pressCode.toString(16)} for target: ${currentTarget.char} (${currentTarget.type}), Stage: ${challengeStage}`);
        totalCharsTypedRef.current += 1; // タイプ数をカウント

        if (currentTarget.type === 'seion') {
            // --- 清音の入力判定 ---
            const expectedGyouKey = currentTarget.gyouKey;
            const expectedDanKey = currentTarget.danKey;
            const actualGyouKey = hid2Gyou(pressCode, kb, side);
            const actualDanKey = hid2Dan(pressCode, kb, side);

            if (challengeStage === 'gyouInput') {
                if (actualGyouKey === expectedGyouKey) {
                    isExpected = true;
                    nextStage = 'danInput';
                } else {
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'danInput') {
                shouldIncrementAttempt = true; // danInput で試行回数をカウント
                if (actualDanKey === expectedDanKey) {
                    isExpected = true;
                    correctCountRef.current += 1;
                    selectNextTarget();
                    nextStage = null;
                } else {
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            }
        } else if (currentTarget.type === 'youon') {
            // --- 拗音の入力判定 ---
            const expectedGyouKey = currentTarget.gyouKey;
            const expectedDanKey = currentTarget.danKey;
            const actualGyouKey = hid2Gyou(pressCode, kb, side);
            const actualDanKey = hid2Dan(pressCode, kb, side);
            const youonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
            const expectedYouonKeyCode = youonKeyCodeEntry ? parseInt(youonKeyCodeEntry[0]) + 1 : -1;

            if (challengeStage === 'gyouInput') {
                if (actualGyouKey === expectedGyouKey) {
                    isExpected = true;
                    nextStage = 'youonInput';
                } else {
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'youonInput') {
                if (pressCode === expectedYouonKeyCode) {
                    isExpected = true;
                    nextStage = 'danInput';
                } else {
                    shouldIncrementAttempt = true; // youonInput でミス
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'danInput') {
                shouldIncrementAttempt = true; // danInput で試行回数をカウント
                if (actualDanKey === expectedDanKey) {
                    isExpected = true;
                    correctCountRef.current += 1;
                    selectNextTarget();
                    nextStage = null;
                } else {
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            }
        } else if (currentTarget.type === 'dakuon') {
            // --- 濁音の入力判定 ---
            const expectedGyouKey = currentTarget.gyouKey;
            const expectedDanKey = currentTarget.danKey;
            const actualGyouKey = hid2Gyou(pressCode, kb, side);
            const actualDanKey = hid2Dan(pressCode, kb, side);
            const dakuonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
            const expectedDakuonKeyCode = dakuonKeyCodeEntry ? parseInt(dakuonKeyCodeEntry[0]) + 1 : -1;

            if (challengeStage === 'gyouInput') {
                if (actualGyouKey === expectedGyouKey) {
                    isExpected = true;
                    nextStage = 'dakuonInput'; // 次は濁音ステージへ
                } else {
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'dakuonInput') {
                if (pressCode === expectedDakuonKeyCode) {
                    isExpected = true;
                    nextStage = 'danInput'; // 次は段ステージへ
                } else {
                    shouldIncrementAttempt = true; // dakuonInput でミス
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'danInput') {
                shouldIncrementAttempt = true; // danInput で試行回数をカウント
                if (actualDanKey === expectedDanKey) {
                    isExpected = true;
                    correctCountRef.current += 1;
                    selectNextTarget();
                    nextStage = null;
                } else {
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            }
        } else if (currentTarget.type === 'sokuonKomoji' && currentTarget.isTsu) {
            // --- 促音「っ」の入力判定 ---
            const tsuKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '促音');
            const expectedTsuKeyCode = tsuKeyCodeEntry ? parseInt(tsuKeyCodeEntry[0]) + 1 : -1;

            if (challengeStage === 'tsuInput') {
                shouldIncrementAttempt = true; // 1タイプで試行回数をカウント
                if (pressCode === expectedTsuKeyCode) {
                    isExpected = true;
                    correctCountRef.current += 1;
                    selectNextTarget();
                    nextStage = null; // ステージは selectNextTarget でリセットされる
                } else {
                    missCountRef.current += 1;
                    nextStage = 'tsuInput'; // ステージはそのまま
                }
            }
        }

        // 共通処理
        // setTotalTyped(prev => prev + 1); // ref に変更
        if (shouldIncrementAttempt) {
            // setTotalAttempted(prev => prev + 1); // ref に変更
            totalAttemptedRef.current += 1;
        }

        if (nextStage && nextStage !== challengeStage) {
            console.log(`[KanaChallenge] Setting stage from ${challengeStage} to ${nextStage}`);
            setChallengeStage(nextStage);
        } else if (!isExpected && challengeStage !== 'gyouInput' && challengeStage !== 'tsuInput' && nextStage !== null) { // 促音以外で不正解の場合
             console.log(`[KanaChallenge] Incorrect input, resetting stage to gyouInput`);
             setChallengeStage('gyouInput');
        } else if (!isExpected && challengeStage === 'tsuInput') {
             // 促音で不正解の場合はステージをリセットしない（再度 tsuInput を待つ）
             console.log(`[KanaChallenge] Incorrect input for tsu, staying in tsuInput stage`);
        }


        console.log(`[KanaChallenge] End - isExpected: ${isExpected}, Final Stage: ${nextStage ?? challengeStage}`);
        return { isExpected, shouldGoToNext: false };
    // isFinished を依存配列に追加
    }, [status, currentTarget, challengeStage, kb, side, selectNextTarget, currentFunctionKeyMap, isFinished, setChallengeStage]);

    // ハイライト処理
    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        // isFinished をチェック
        if (status !== 'running' || !currentTarget || isFinished) {
            return noHighlight;
        }

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        if (currentTarget.type === 'seion') {
            // --- 清音のハイライト ---
            if (challengeStage === 'gyouInput') {
                expectedKeyName = currentTarget.gyouKey;
                targetLayoutIndex = 2;
            } else if (challengeStage === 'danInput') {
                expectedKeyName = currentTarget.danKey;
                targetLayoutIndex = 3;
            }
        } else if (currentTarget.type === 'youon') {
            // --- 拗音のハイライト ---
            const youonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
            const youonDisplayName = youonKeyEntry ? currentFunctionKeyMap[parseInt(youonKeyEntry[0])] : '拗音';

            if (challengeStage === 'gyouInput') {
                expectedKeyName = currentTarget.gyouKey;
                targetLayoutIndex = 2;
            } else if (challengeStage === 'youonInput') {
                expectedKeyName = youonDisplayName;
                targetLayoutIndex = 2;
            } else if (challengeStage === 'danInput') {
                expectedKeyName = currentTarget.danKey;
                targetLayoutIndex = 3;
            }
        } else if (currentTarget.type === 'dakuon') {
            // --- 濁音のハイライト ---
            const dakuonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
            const dakuonDisplayName = dakuonKeyEntry ? currentFunctionKeyMap[parseInt(dakuonKeyEntry[0])] : '濁音';

            if (challengeStage === 'gyouInput') {
                expectedKeyName = currentTarget.gyouKey;
                targetLayoutIndex = 2;
            } else if (challengeStage === 'dakuonInput') {
                expectedKeyName = dakuonDisplayName; // 濁音キーの表示名
                targetLayoutIndex = 2; // かなスタートレイヤーにあると仮定
            } else if (challengeStage === 'danInput') {
                expectedKeyName = currentTarget.danKey;
                targetLayoutIndex = 3;
            }
        } else if (currentTarget.type === 'sokuonKomoji' && currentTarget.isTsu) {
            // --- 促音「っ」のハイライト ---
            if (challengeStage === 'tsuInput') {
                const tsuKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '促音');
                expectedKeyName = tsuKeyEntry ? currentFunctionKeyMap[parseInt(tsuKeyEntry[0])] : '促音';
                targetLayoutIndex = 2; // かなスタートレイヤーにあると仮定
            }
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }

        return noHighlight;
    // isFinished を依存配列に追加
    }, [status, currentTarget, challengeStage, currentFunctionKeyMap, isFinished]);

    // 不正入力ターゲット判定
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        // isFinished をチェック
        if (status !== 'running' || !currentTarget || isFinished) return false;

        let expectedKeyName: string | null = null;
        let expectedLayoutIndex: number | null = null;

        if (currentTarget.type === 'seion') {
             // --- 清音の判定 ---
            if (challengeStage === 'gyouInput') {
                expectedKeyName = currentTarget.gyouKey;
                expectedLayoutIndex = 2;
            } else if (challengeStage === 'danInput') {
                expectedKeyName = currentTarget.danKey;
                expectedLayoutIndex = 3;
            }
        } else if (currentTarget.type === 'youon') {
             // --- 拗音の判定 ---
            const youonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
            const youonDisplayName = youonKeyEntry ? currentFunctionKeyMap[parseInt(youonKeyEntry[0])] : '拗音';

            if (challengeStage === 'gyouInput') {
                expectedKeyName = currentTarget.gyouKey;
                expectedLayoutIndex = 2;
            } else if (challengeStage === 'youonInput') {
                expectedKeyName = youonDisplayName;
                expectedLayoutIndex = 2;
            } else if (challengeStage === 'danInput') {
                expectedKeyName = currentTarget.danKey;
                expectedLayoutIndex = 3;
            }
        } else if (currentTarget.type === 'dakuon') {
             // --- 濁音の判定 ---
            const dakuonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
            const dakuonDisplayName = dakuonKeyEntry ? currentFunctionKeyMap[parseInt(dakuonKeyEntry[0])] : '濁音';

            if (challengeStage === 'gyouInput') {
                expectedKeyName = currentTarget.gyouKey;
                expectedLayoutIndex = 2;
            } else if (challengeStage === 'dakuonInput') {
                expectedKeyName = dakuonDisplayName;
                expectedLayoutIndex = 2;
            } else if (challengeStage === 'danInput') {
                expectedKeyName = currentTarget.danKey;
                expectedLayoutIndex = 3;
            }
        } else if (currentTarget.type === 'sokuonKomoji' && currentTarget.isTsu) {
             // --- 促音「っ」の判定 ---
             if (challengeStage === 'tsuInput') {
                 const tsuKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '促音');
                 expectedKeyName = tsuKeyEntry ? currentFunctionKeyMap[parseInt(tsuKeyEntry[0])] : '促音';
                 expectedLayoutIndex = 2;
             }
        }

        if (expectedKeyName !== null && expectedLayoutIndex !== null) {
            const targetKeyIndex = pressCode - 1;
            // 期待されるキーコードを取得
            const expectedCodes = getHidKeyCodes(expectedKeyName, layers, kb, side);
            // 期待されるキーコードに含まれていれば不正入力ではない
            if (expectedCodes.includes(pressCode)) return false;
            // 期待されるレイヤーで、かつ押されたキーのインデックスが一致する場合のみ不正入力ターゲット
            return layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        }

        return false;
    // isFinished, layers を依存配列に追加
    }, [status, currentTarget, challengeStage, currentFunctionKeyMap, isFinished, layers, kb, side]);

    return {
        targetChar: currentTarget?.char ?? '', // 現在のターゲット文字
        getHighlight: () => ({ start: null, end: null }), // チャレンジモードではハイライト不要なので仮実装
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        isOkVisible: false, // チャレンジ中はOK表示しない
        challengeResults, // 計算結果を返す
    };
};

export default useKanaChallengePractice;
