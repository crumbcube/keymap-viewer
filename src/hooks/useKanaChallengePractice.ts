// /home/coffee/my-keymap-viewer/src/hooks/useKanaChallengePractice.ts
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
    getHidKeyCodes,
    ChallengeResult, // 結果の型をインポート
} from './usePracticeCommons';

type ChallengeStatus = 'idle' | 'countdown' | 'running' | 'finished';
type KanaTarget = CharInfoSeion | CharInfoYouon | CharInfoDakuon | CharInfoSokuonKomoji; // | CharInfoHandakuon;
type ChallengeStage = 'gyouInput' | 'danInput' | 'youonInput' | 'dakuonInput' | 'tsuInput';

const COUNTDOWN_SECONDS = 5;
const TRAINING_DURATION_MS = 60 * 1000; // 1分

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
    side,
    kb,
    layers,
}: PracticeHookProps): PracticeHookResult => {
    const [status, setStatus] = useState<ChallengeStatus>('idle');
    const [countdownValue, setCountdownValue] = useState<number>(COUNTDOWN_SECONDS);
    const [remainingTime, setRemainingTime] = useState<number>(TRAINING_DURATION_MS);
    const [currentTarget, setCurrentTarget] = useState<KanaTarget | null>(null);
    const [challengeStage, setChallengeStage] = useState<ChallengeStage>('gyouInput');
    const [headingChars, setHeadingChars] = useState<string[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    const countdownTimerRef = useRef<number | null>(null);
    const trainingTimerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const correctCountRef = useRef(0);
    const missCountRef = useRef(0);
    const totalCharsTypedRef = useRef(0);
    const completedCharsCountRef = useRef(0);
    const totalAttemptedRef = useRef(0);
    const [challengeResults, setChallengeResults] = useState<ChallengeResult | null>(null);
    const prevIsActiveRef = useRef(isActive);


    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    const allKanaTargets = useMemo(() => {
        const tsuTargets = allSokuonKomojiCharInfos.filter(info => info.isTsu);
        return [...allSeionCharInfos, ...allYouonCharInfos, ...allDakuonCharInfos, ...tsuTargets];
    }, []);

    const selectNextTarget = useCallback(() => {
        if (allKanaTargets.length > 0) {
            const randomIndex = Math.floor(Math.random() * allKanaTargets.length);
            const nextTarget = allKanaTargets[randomIndex];
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

    const reset = useCallback(() => {
        console.log('[KanaChallengePractice reset] Resetting state.');
        setStatus('idle');
        setIsFinished(false);
        setCountdownValue(COUNTDOWN_SECONDS); // countdownValue をリセット
        setRemainingTime(TRAINING_DURATION_MS);
        setCurrentTarget(null);
        setChallengeStage('gyouInput');
        setHeadingChars([]);
        setChallengeResults(null);
        startTimeRef.current = null;
        correctCountRef.current = 0;
        missCountRef.current = 0;
        completedCharsCountRef.current = 0;
        totalCharsTypedRef.current = 0;
        totalAttemptedRef.current = 0;
        if (countdownTimerRef.current !== null) clearTimeout(countdownTimerRef.current);
        if (trainingTimerRef.current !== null) clearInterval(trainingTimerRef.current);
    }, [setChallengeResults, setHeadingChars]);

    // isActive の変更を監視し、練習の開始/終了を処理
    useEffect(() => {
        const wasActive = prevIsActiveRef.current;
        console.log(`[KanaChallengePractice isActive Effect] isActive: ${isActive}, wasActive: ${wasActive}, currentStatus: ${status}`);

        if (isActive && !wasActive) { // 練習がアクティブになった瞬間
            console.log('[KanaChallengePractice isActive Effect] Practice activated. Current status:', status);
            // 外部 (usePracticeManagement) から reset が呼ばれ、status が 'idle' になっていることを期待。
            // カウントダウン開始は、status と countdownValue を監視する別の useEffect に任せる。
            // この時点では、status が 'idle' であることを確認するだけで、直接 'countdown' にはしない。
            if (status !== 'idle') {
                // 予期せず idle でない場合、強制的に reset を呼んで初期化する
                // (通常は usePracticeManagement の reset で idle になっているはず)
                console.warn(`[KanaChallengePractice isActive Effect] Activated but status is not idle (${status}). Forcing reset.`);
                reset();
            }
        } else if (!isActive && wasActive) { // 練習が非アクティブになった瞬間
            console.log('[KanaChallengePractice isActive Effect] Practice deactivated. Calling reset.');
            reset();
        }
        prevIsActiveRef.current = isActive;
    }, [isActive, status, reset]); // status を依存配列に追加して、活性化時に status が 'idle' でない場合の対処を可能にする

    // カウントダウンおよび練習実行のメインロジック
    useEffect(() => {
        console.log(`[KanaChallengePractice MainLogic Effect] isActive: ${isActive}, status: ${status}, countdownValue: ${countdownValue}`);

        if (!isActive) {
            // 非アクティブなら何もしない (タイマーのクリアは reset や useEffect のクリーンアップで行う)
            return;
        }

        if (status === 'idle') {
            // アクティブで、かつステータスが 'idle' の場合、カウントダウンを開始する
            console.log(`[KanaChallengePractice MainLogic Effect] Status is idle and active. Setting status to 'countdown'.`);
            setCountdownValue(COUNTDOWN_SECONDS); // countdownValue を確実に初期値に
            setStatus('countdown');
        } else if (status === 'countdown') {
            // カウントダウン中の処理
            if (countdownValue > 0) {
                console.log(`[KanaChallengePractice MainLogic Effect] Countdown running. Value: ${countdownValue}`);
                countdownTimerRef.current = window.setTimeout(() => {
                    setCountdownValue(prev => prev - 1);
                }, 1000);
            } else if (countdownValue === 0) {
                // カウントダウン終了
                console.log(`[KanaChallengePractice MainLogic Effect] Countdown finished. Setting status to 'running'.`);
                if (countdownTimerRef.current !== null) { // 念のためタイマーをクリア
                    clearTimeout(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                }
                setStatus('running');
                setRemainingTime(TRAINING_DURATION_MS);
                startTimeRef.current = Date.now();
                if (!currentTarget) { // 最初のターゲットを選択
                    selectNextTarget();
                }
            }
        }
        // status === 'running' や 'finished' の場合のタイマー処理は別の useEffect で行う

        return () => {
            if (countdownTimerRef.current !== null) clearTimeout(countdownTimerRef.current);
        };
    }, [isActive, status, countdownValue, currentTarget, selectNextTarget, setStatus, setCountdownValue, setRemainingTime]);


    // トレーニング時間計測 & 終了処理
    useEffect(() => {
        if (isActive && status === 'running') {
            trainingTimerRef.current = window.setInterval(() => {
                const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
                const newRemaining = Math.max(0, TRAINING_DURATION_MS - elapsed);
                setRemainingTime(newRemaining);
                if (newRemaining === 0) {
                    setStatus('finished');
                    setIsFinished(true);
                    if (trainingTimerRef.current) clearInterval(trainingTimerRef.current);

                    const correct = correctCountRef.current;
                    const miss = missCountRef.current;
                    const totalTypedChars = totalCharsTypedRef.current;
                    const accuracy = totalTypedChars > 0 ? Math.max(0, (totalTypedChars - miss) / totalTypedChars) : 0;
                    const score = Math.round(correct * accuracy * 20);
                    const rankMessage = totalTypedChars > 0 ? getRankMessage(score) : '';
                    const results: ChallengeResult = {
                        totalQuestions: correct,
                        correctCharsCount: completedCharsCountRef.current,
                        totalCharsTyped: totalTypedChars,
                        correctCount: correct,
                        missCount: miss,
                        accuracy: accuracy,
                        score: score,
                        rankMessage: rankMessage,
                    };
                    setChallengeResults(results);
                    setHeadingChars([]);
                }
            }, 100);
        } else if (status === 'finished' && trainingTimerRef.current) {
             clearInterval(trainingTimerRef.current);
        }
        return () => {
            if (trainingTimerRef.current !== null) {
                clearInterval(trainingTimerRef.current);
            }
        };
    }, [isActive, status, isFinished]);

    // ヘッダー表示
    useEffect(() => {
        if (status === 'countdown') {
            setHeadingChars([`${countdownValue}秒`]);
        } else if (status === 'running' && currentTarget) {
            setHeadingChars([currentTarget.char]);
        } else if (status === 'finished') {
            setHeadingChars(['終了！']);
        } else if (status === 'idle') {
            setHeadingChars([]);
        }
    }, [status, countdownValue, currentTarget]);


    // 入力処理
    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
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

        totalCharsTypedRef.current += 1;

        if (currentTarget.type === 'seion') {
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
                shouldIncrementAttempt = true;
                if (actualDanKey === expectedDanKey) {
                    isExpected = true;
                    correctCountRef.current += 1;
                    completedCharsCountRef.current += currentTarget.char.length;
                    selectNextTarget();
                    nextStage = null; // ターゲット選択後にステージはリセットされる
                } else {
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            }
        } else if (currentTarget.type === 'youon') {
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
                    shouldIncrementAttempt = true;
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'danInput') {
                shouldIncrementAttempt = true;
                if (actualDanKey === expectedDanKey) {
                    isExpected = true;
                    correctCountRef.current += 1;
                    completedCharsCountRef.current += currentTarget.char.length;
                    selectNextTarget();
                    nextStage = null;
                } else {
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            }
        } else if (currentTarget.type === 'dakuon') {
            const expectedGyouKey = currentTarget.gyouKey;
            const expectedDanKey = currentTarget.danKey;
            const actualGyouKey = hid2Gyou(pressCode, kb, side);
            const actualDanKey = hid2Dan(pressCode, kb, side);
            const dakuonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
            const expectedDakuonKeyCode = dakuonKeyCodeEntry ? parseInt(dakuonKeyCodeEntry[0]) + 1 : -1;

            if (challengeStage === 'gyouInput') {
                if (actualGyouKey === expectedGyouKey) {
                    isExpected = true;
                    nextStage = 'dakuonInput';
                } else {
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'dakuonInput') {
                if (pressCode === expectedDakuonKeyCode) {
                    isExpected = true;
                    nextStage = 'danInput';
                } else {
                    shouldIncrementAttempt = true;
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'danInput') {
                shouldIncrementAttempt = true;
                if (actualDanKey === expectedDanKey) {
                    isExpected = true;
                    correctCountRef.current += 1;
                    completedCharsCountRef.current += currentTarget.char.length;
                    selectNextTarget();
                    nextStage = null;
                } else {
                    missCountRef.current += 1;
                    nextStage = 'gyouInput';
                }
            }
        } else if (currentTarget.type === 'sokuonKomoji' && currentTarget.isTsu) {
            const tsuKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '促音');
            const expectedTsuKeyCode = tsuKeyCodeEntry ? parseInt(tsuKeyCodeEntry[0]) + 1 : -1;

            if (challengeStage === 'tsuInput') {
                shouldIncrementAttempt = true;
                if (pressCode === expectedTsuKeyCode) {
                    isExpected = true;
                    correctCountRef.current += 1;
                    completedCharsCountRef.current += currentTarget.char.length;
                    selectNextTarget();
                    nextStage = null;
                } else {
                    missCountRef.current += 1;
                    nextStage = 'tsuInput';
                }
            }
        }

        if (shouldIncrementAttempt) {
            totalAttemptedRef.current += 1;
        }

        if (nextStage && nextStage !== challengeStage) {
            setChallengeStage(nextStage);
        } else if (!isExpected && challengeStage !== 'gyouInput' && challengeStage !== 'tsuInput' && nextStage !== null) {
             setChallengeStage('gyouInput');
        } else if (!isExpected && challengeStage === 'tsuInput') {
            // No stage change
        }

        return { isExpected, shouldGoToNext: false };
    }, [status, currentTarget, challengeStage, kb, side, selectNextTarget, currentFunctionKeyMap, isFinished, setChallengeStage]);

    // ハイライト処理
    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (status !== 'running' || !currentTarget || isFinished) {
            return noHighlight;
        }

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        if (currentTarget.type === 'seion') {
            if (challengeStage === 'gyouInput') {
                expectedKeyName = currentTarget.gyouKey;
                targetLayoutIndex = 2;
            } else if (challengeStage === 'danInput') {
                expectedKeyName = currentTarget.danKey;
                targetLayoutIndex = 3;
            }
        } else if (currentTarget.type === 'youon') {
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
            const dakuonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
            const dakuonDisplayName = dakuonKeyEntry ? currentFunctionKeyMap[parseInt(dakuonKeyEntry[0])] : '濁音';

            if (challengeStage === 'gyouInput') {
                expectedKeyName = currentTarget.gyouKey;
                targetLayoutIndex = 2;
            } else if (challengeStage === 'dakuonInput') {
                expectedKeyName = dakuonDisplayName;
                targetLayoutIndex = 2;
            } else if (challengeStage === 'danInput') {
                expectedKeyName = currentTarget.danKey;
                targetLayoutIndex = 3;
            }
        } else if (currentTarget.type === 'sokuonKomoji' && currentTarget.isTsu) {
            if (challengeStage === 'tsuInput') {
                const tsuKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '促音');
                expectedKeyName = tsuKeyEntry ? currentFunctionKeyMap[parseInt(tsuKeyEntry[0])] : '促音';
                targetLayoutIndex = 2;
            }
        }

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }

        return noHighlight;
    }, [status, currentTarget, challengeStage, currentFunctionKeyMap, isFinished]);

    // 不正入力ターゲット判定
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (status !== 'running' || !currentTarget || isFinished) return false;

        let expectedKeyName: string | null = null;
        let expectedLayoutIndex: number | null = null;

        if (currentTarget.type === 'seion') {
            if (challengeStage === 'gyouInput') {
                expectedKeyName = currentTarget.gyouKey;
                expectedLayoutIndex = 2;
            } else if (challengeStage === 'danInput') {
                expectedKeyName = currentTarget.danKey;
                expectedLayoutIndex = 3;
            }
        } else if (currentTarget.type === 'youon') {
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
             if (challengeStage === 'tsuInput') {
                 const tsuKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '促音');
                 expectedKeyName = tsuKeyEntry ? currentFunctionKeyMap[parseInt(tsuKeyEntry[0])] : '促音';
                 expectedLayoutIndex = 2;
             }
        }

        if (expectedKeyName !== null && expectedLayoutIndex !== null) {
            const targetKeyIndex = pressCode - 1;
            const expectedCodes = getHidKeyCodes(expectedKeyName, layers, kb, side);
            if (expectedCodes.includes(pressCode)) return false;
            return layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        }

        return false;
    }, [status, currentTarget, challengeStage, currentFunctionKeyMap, isFinished, layers, kb, side]);

    const practiceResult = useMemo(() => {
        return {
            currentTarget: currentTarget ?? undefined,
            getHighlight: () => ({ start: null, end: null }),
            headingChars,
            handleInput,
            getHighlightClassName,
            reset,
            isInvalidInputTarget,
            challengeResults,
            status,
            countdownValue,
        };
    }, [currentTarget, headingChars, handleInput, getHighlightClassName, reset, isInvalidInputTarget, challengeResults, status, countdownValue]);

    return practiceResult;
};

export default useKanaChallengePractice;
