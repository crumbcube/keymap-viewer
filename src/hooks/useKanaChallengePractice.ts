// src/hooks/useKanaChallengePractice.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    PracticeHighlightResult,
    // ▼▼▼ 必要なものをインポート ▼▼▼
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
    // ▲▲▲ インポート ▲▲▲
} from './usePracticeCommons';

type ChallengeStatus = 'idle' | 'countdown' | 'running' | 'finished';
// ▼▼▼ ターゲットの型を拡張 ▼▼▼
type KanaTarget = CharInfoSeion | CharInfoYouon | CharInfoDakuon | CharInfoSokuonKomoji; // | CharInfoHandakuon;
// ▲▲▲ 変更 ▲▲▲
// ▼▼▼ 入力ステージを拡張 ▼▼▼
type ChallengeStage = 'gyouInput' | 'danInput' | 'youonInput' | 'dakuonInput' | 'tsuInput'; // 促音用ステージ追加
// ▲▲▲ 追加 ▲▲▲

const COUNTDOWN_SECONDS = 5;
const TRAINING_DURATION_MS = 60 * 1000; // 1分

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
    const [correctCount, setCorrectCount] = useState(0);
    const [totalTyped, setTotalTyped] = useState(0);
    const [challengeStage, setChallengeStage] = useState<ChallengeStage>('gyouInput');
    const [totalAttempted, setTotalAttempted] = useState(0);

    const countdownTimerRef = useRef<number | null>(null);
    const trainingTimerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    // ▼▼▼ ターゲットリストを結合 ▼▼▼
    const allKanaTargets = useMemo(() => {
        // 促音「っ」のみをフィルタリングして追加
        const tsuTargets = allSokuonKomojiCharInfos.filter(info => info.isTsu);
        // TODO: 将来的には半濁音も結合
        return [...allSeionCharInfos, ...allYouonCharInfos, ...allDakuonCharInfos, ...tsuTargets];
    }, []);
    // ▲▲▲ 修正 ▲▲▲

    // 次のランダムターゲットを選択
    const selectNextTarget = useCallback(() => {
        if (allKanaTargets.length > 0) {
            const randomIndex = Math.floor(Math.random() * allKanaTargets.length);
            const nextTarget = allKanaTargets[randomIndex];
            console.log(">>> Selecting new Kana Challenge target:", nextTarget);
            setCurrentTarget(nextTarget);
            // ▼▼▼ ターゲットタイプに応じて初期ステージを設定 ▼▼▼
            if (nextTarget.type === 'sokuonKomoji' && nextTarget.isTsu) {
                setChallengeStage('tsuInput');
            } else {
                setChallengeStage('gyouInput');
            }
            // ▲▲▲ 修正 ▲▲▲
        } else {
            setCurrentTarget(null);
        }
    }, [allKanaTargets]);

    // カウントダウン処理 (変更なし)
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

    // トレーニング時間計測 (変更なし)
    useEffect(() => {
        if (isActive && status === 'running') {
            trainingTimerRef.current = window.setInterval(() => {
                const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
                const newRemaining = Math.max(0, TRAINING_DURATION_MS - elapsed);
                setRemainingTime(newRemaining);
                if (newRemaining === 0) {
                    setStatus('finished');
                }
            }, 100);
        }
        return () => {
            if (trainingTimerRef.current !== null) {
                clearInterval(trainingTimerRef.current);
            }
        };
    }, [isActive, status]);

    // ヘッダー表示 (変更なし)
    const headingChars = useMemo(() => {
        if (status === 'countdown') {
            return [`${countdownValue}秒`];
        }
        if (status === 'running' && currentTarget) {
            return [currentTarget.char];
        }
        if (status === 'finished') {
            const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;
            const cpm = correctCount; // CPM は Characters Per Minute (正解文字数/分)
            return [`終了! ${cpm} CPM 正解率: ${accuracy}%`];
        }
        return [];
    }, [status, countdownValue, currentTarget, correctCount, totalTyped, totalAttempted]);

    // リセット処理 (変更なし)
    const reset = useCallback(() => {
        setStatus('idle');
        setCountdownValue(COUNTDOWN_SECONDS);
        setRemainingTime(TRAINING_DURATION_MS);
        setCurrentTarget(null);
        setCorrectCount(0);
        setTotalTyped(0);
        setChallengeStage('gyouInput');
        setTotalAttempted(0);
        startTimeRef.current = null;
        if (countdownTimerRef.current !== null) clearTimeout(countdownTimerRef.current);
        if (trainingTimerRef.current !== null) clearInterval(trainingTimerRef.current);
        console.log("Resetting Kana Challenge Practice");
    }, [setTotalAttempted]);

    // アクティブになったらカウントダウン開始 (変更なし)
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
        if (status !== 'running' || !currentTarget) {
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

        // ▼▼▼ currentTarget.type で処理を分岐 ▼▼▼
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
                if (actualDanKey === expectedDanKey) {
                    isExpected = true;
                    shouldIncrementAttempt = true;
                    setCorrectCount(prev => prev + 1);
                    selectNextTarget();
                    nextStage = null;
                } else {
                    shouldIncrementAttempt = true;
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
                    shouldIncrementAttempt = true;
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'danInput') {
                if (actualDanKey === expectedDanKey) {
                    isExpected = true;
                    shouldIncrementAttempt = true;
                    setCorrectCount(prev => prev + 1);
                    selectNextTarget();
                    nextStage = null;
                } else {
                    shouldIncrementAttempt = true;
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
                    nextStage = 'gyouInput';
                }
            } else if (challengeStage === 'danInput') {
                if (actualDanKey === expectedDanKey) {
                    isExpected = true;
                    shouldIncrementAttempt = true;
                    setCorrectCount(prev => prev + 1);
                    selectNextTarget();
                    nextStage = null;
                } else {
                    shouldIncrementAttempt = true; // danInput でミス
                    nextStage = 'gyouInput';
                }
            }
        } else if (currentTarget.type === 'sokuonKomoji' && currentTarget.isTsu) {
            // --- 促音「っ」の入力判定 ---
            const tsuKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '促音');
            const expectedTsuKeyCode = tsuKeyCodeEntry ? parseInt(tsuKeyCodeEntry[0]) + 1 : -1;

            if (challengeStage === 'tsuInput') {
                if (pressCode === expectedTsuKeyCode) {
                    isExpected = true;
                    shouldIncrementAttempt = true; // 1タイプで正解
                    setCorrectCount(prev => prev + 1);
                    selectNextTarget();
                    nextStage = null; // ステージは selectNextTarget でリセットされる
                } else {
                    shouldIncrementAttempt = true; // 1タイプで不正解
                    nextStage = 'tsuInput'; // ステージはそのまま
                }
            }
        }
        // ▲▲▲ 分岐完了 ▲▲▲

        // 共通処理
        setTotalTyped(prev => prev + 1);
        if (shouldIncrementAttempt) {
            setTotalAttempted(prev => prev + 1);
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
    }, [status, currentTarget, challengeStage, kb, side, selectNextTarget, currentFunctionKeyMap, setTotalAttempted]);

    // ハイライト処理
    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (status !== 'running' || !currentTarget) {
            return noHighlight;
        }

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        // ▼▼▼ currentTarget.type で処理を分岐 ▼▼▼
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
        // ▲▲▲ 分岐完了 ▲▲▲

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyName) {
            return { className: 'bg-blue-100', overrideKey: null };
        }

        return noHighlight;
    }, [status, currentTarget, challengeStage, currentFunctionKeyMap]);

    // 不正入力ターゲット判定
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (status !== 'running' || !currentTarget) return false;

        let expectedKeyName: string | null = null;
        let expectedLayoutIndex: number | null = null;

        // ▼▼▼ currentTarget.type で処理を分岐 ▼▼▼
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
        // ▲▲▲ 分岐完了 ▲▲▲

        if (expectedKeyName !== null && expectedLayoutIndex !== null) {
            const targetKeyIndex = pressCode - 1;
            return layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        }

        return false;
    }, [status, currentTarget, challengeStage, currentFunctionKeyMap]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        isOkVisible: false,
    };
};

export default useKanaChallengePractice;
