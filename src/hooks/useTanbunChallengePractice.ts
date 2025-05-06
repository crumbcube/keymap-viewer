// /home/coffee/my-keymap-viewer/src/hooks/useTanbunChallengePractice.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    PracticeHighlightResult,
    HighlightInfo,
    hid2Gyou,
    hid2Dan,
    functionKeyMaps,
    ChallengeResult,
    getHidKeyCodes, // 文字判定に使うかも
    gyouChars,
    danList,
    youonGyouList,
    youonGyouChars,
    youonDanMapping,
    dakuonGyouChars,
    dakuonDanMapping,
    handakuonGyouChars,
    handakuonDanMapping,
    youdakuonGyouChars,
    youdakuonDanMapping,
    youhandakuonGyouChars,
    youhandakuonDanMapping,
    hid2Youon,
} from './usePracticeCommons';
import { tanbunSentences, kigoMapping3, kigoMapping2 } from '../data/keymapData'; // 短文データと kigoMapping3, kigoMapping2 をインポート

type ChallengeStatus = 'idle' | 'countdown' | 'running' | 'finished';

type TanbunProgressInfo = {
    typedEndIndex: number; // どこまで正しく入力されたかを示すインデックス
};


type InputState = {
    gyouKey: string | null; // 直前に押された行キー
    hasYouon: boolean;
    hasDakuon: boolean;
    hasHandakuon: boolean;
};
const initialInputState: InputState = { gyouKey: null, hasYouon: false, hasDakuon: false, hasHandakuon: false };


const COUNTDOWN_SECONDS = 5;
const INPUT_TIMEOUT_MS = 1000; // 1秒のタイムアウト
const TRAINING_DURATION_MS = 3 * 60 * 1000; // 3分
const CHALLENGE_DURATION_SECONDS = 180; // チャレンジ時間（秒）


// --- ランクメッセージ判定関数 (仮) ---
const getRankMessage = (score: number): string => {
    if (score >= 1500) return "Godlike! タイピングの神！";
    if (score >= 1000) return "Excellent! 正確さバッチリ！";
    if (score >= 500) return "Great! なかなかやりますね！";
    if (score >= 200) return "Good! その調子！";
    return "Keep Trying! 練習あるのみ！";
  };


const useTanbunChallengePractice = ({
    isActive,
    kb,
    side,
    layers, // layers を受け取る
}: PracticeHookProps): PracticeHookResult => {
    const [status, setStatus] = useState<ChallengeStatus>('idle');
    const [countdownValue, setCountdownValue] = useState<number>(COUNTDOWN_SECONDS);
    const [remainingTime, setRemainingTime] = useState<number>(TRAINING_DURATION_MS);
    const [currentSentence, setCurrentSentence] = useState<string>('');
    const [currentIndex, setCurrentIndex] = useState<number>(0); // 現在入力中の文字インデックス
    const [remainingSentences, setRemainingSentences] = useState<string[]>([]);
    const [inputState, setInputState] = useState<InputState>(initialInputState);
    const [progressInfo, setProgressInfo] = useState<TanbunProgressInfo>({ typedEndIndex: 0 });

    const countdownTimerRef = useRef<number | null>(null);
    const trainingTimerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const correctCountRef = useRef(0); // 正解文字数
    const missCountRef = useRef(0); // ミス文字数
    const totalCharsTypedRef = useRef(0); // 総打鍵数
    const completedCharsCountRef = useRef(0); // 正しく入力完了した文字数
    const completedSentenceCountRef = useRef(0); // クリアした文の数
    const [challengeResults, setChallengeResults] = useState<ChallengeResult | null>(null);
    const inputTimeoutRef = useRef<number | null>(null);

    // 機能キーコードを取得 (仮実装 - useKanaChallengePractice から移植)
    const funcKeyCodes = useMemo(() => {
        const map = functionKeyMaps[kb]?.[side] ?? {};
        const findCode = (name: string) => {
            const entry = Object.entries(map).find(([_, n]) => n === name);
            return entry ? parseInt(entry[0]) + 1 : null;
        };
        return {
            youon: findCode('拗音'),
            dakuon: findCode('濁音'),
            handakuon: findCode('半濁音'),
            sokuon: findCode('促音'),
            kigo: findCode('記号'), // 記号キーのコードも取得
        };
    }, [kb, side]);

    const clearInputTimeout = useCallback(() => {
        if (inputTimeoutRef.current !== null) {
            clearTimeout(inputTimeoutRef.current);
            inputTimeoutRef.current = null;
        }
    }, []);

    const resetInputStateAndClearTimeout = useCallback(() => {
        setInputState(initialInputState);
        clearInputTimeout();
    }, [clearInputTimeout]);

    // 次の短文を選択
    const selectNextSentence = useCallback(() => {
        if (remainingSentences.length > 0) {
            const randomIndex = Math.floor(Math.random() * remainingSentences.length);
            const nextSentence = remainingSentences[randomIndex];
            setCurrentSentence(nextSentence);
            setCurrentIndex(0);
            setProgressInfo({ typedEndIndex: 0 });
            // 選ばれた短文をリストから削除
            setRemainingSentences(prev => {
                const newRemaining = prev.filter((_, i) => i !== randomIndex);
                return newRemaining;
            });
        } else {
            setCurrentSentence("全ての短文が終了しました！");
            setCurrentIndex(0); // currentIndex はリセットするが、typedEndIndex はそのままでも良いかも
            // setProgressInfo({ typedEndIndex: 0 }); // 必要ならリセット
            // ここでチャレンジを強制終了しても良い
            // setStatus('finished');
        }
        clearInputTimeout();
    }, [remainingSentences, clearInputTimeout]);

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
                setRemainingSentences([...tanbunSentences]);
            }
        }
        return () => {
            if (countdownTimerRef.current !== null) clearTimeout(countdownTimerRef.current);
        };
    }, [isActive, status, countdownValue, selectNextSentence]);

    useEffect(() => {
        if (status === 'running' && remainingSentences.length > 0 && !currentSentence) {
            selectNextSentence();
        }
    }, [status, remainingSentences, currentSentence, selectNextSentence]);

    // トレーニング時間計測 & 終了処理
    useEffect(() => {
        if (isActive && status === 'running') {
            trainingTimerRef.current = window.setInterval(() => {
                const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
                const newRemaining = Math.max(0, TRAINING_DURATION_MS - elapsed);
                setRemainingTime(newRemaining);
                if (newRemaining === 0) {
                    setStatus('finished');
                    if (trainingTimerRef.current) clearInterval(trainingTimerRef.current);

                    const correct = completedCharsCountRef.current; // 正しく入力完了した文字数を使う
                    const miss = missCountRef.current;
                    const totalTyped = totalCharsTypedRef.current; // 総打鍵数を使う
                    // 正答率: (総打鍵数 - ミス数) / 総打鍵数
                    const accuracy = totalTyped > 0 ? Math.max(0, (totalTyped - miss) / totalTyped) : 0;
                    // スコア計算 (例: 正解文字数 * 精度^2)
                    const score = Math.round(correct * accuracy * accuracy * 5);
                    // 入力が全くなかった場合はランクメッセージを空にする
                    const rankMessage = totalTyped > 0 ? getRankMessage(score) : '';

                    const results: ChallengeResult = {
                        totalQuestions: completedSentenceCountRef.current, // 完了した短文数
                        correctCharsCount: correct, // 正解文字数を追加
                        totalCharsTyped: totalTyped, // 総打鍵数
                        correctCount: correct, // correctCount も正解文字数とする
                        missCount: miss,
                        accuracy: accuracy,
                        score: score,
                        rankMessage: rankMessage,
                    };
                    setChallengeResults(results);
                }
            }, 100);
        } else if (status === 'finished' && trainingTimerRef.current) {
             clearInterval(trainingTimerRef.current);
        }
        return () => {
            if (trainingTimerRef.current !== null) clearInterval(trainingTimerRef.current);
        };
    }, [isActive, status]);

    // リセット処理
    const reset = useCallback(() => {
        setStatus('idle');
        setCountdownValue(COUNTDOWN_SECONDS);
        setRemainingTime(TRAINING_DURATION_MS);
        setCurrentSentence('');
        setCurrentIndex(0);
        setRemainingSentences([]);
        setProgressInfo({ typedEndIndex: 0 });
        setChallengeResults(null);
        startTimeRef.current = null;
        setInputState(initialInputState);
        correctCountRef.current = 0; // 正解文字数リセット (使わないかも)
        missCountRef.current = 0;
        totalCharsTypedRef.current = 0;
        completedCharsCountRef.current = 0; // 正しく入力完了した文字数リセット
        completedSentenceCountRef.current = 0;
        if (countdownTimerRef.current !== null) clearTimeout(countdownTimerRef.current);
        if (trainingTimerRef.current !== null) clearInterval(trainingTimerRef.current);
        clearInputTimeout();
    }, [clearInputTimeout]);

    // アクティブ状態変化
    useEffect(() => {
        if (isActive && status === 'idle') {
            setStatus('countdown');
        } else if (!isActive) {
            reset();
        }
    }, [isActive, status, reset, clearInputTimeout]);

    // 入力処理
    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        if (status !== 'running' || !currentSentence || inputInfo.type !== 'release') {
            return { isExpected: false, shouldGoToNext: false };
        }

        const pressCode = inputInfo.pressCode;
        totalCharsTypedRef.current += 1; // 総打鍵数をカウント

        let typedChar: string | null = null;
        let shouldReturnEarly = false;
        let isCorrect = false; // Flag for correctness
        let charsToAdvance = 1; // Default advancement

        const expectedChar = currentSentence[currentIndex];
        const isLastChar = currentIndex === currentSentence.length - 1;

        const currentGyouKey = hid2Gyou(pressCode, kb, side);
        const currentDanKey = hid2Dan(pressCode, kb, side);
        const currentYouonKey = hid2Youon(pressCode, kb, side); // 拗音キー判定
        const funcMap = functionKeyMaps[kb]?.[side] ?? {};
        const funcKeyName = Object.entries(funcMap).find(([idx, _]) => parseInt(idx) + 1 === pressCode)?.[1]; // 1-based index

        // 1. 機能キー (単独で意味を持つもの、または状態を変更するもの)
        if (funcKeyName === '促音') {
            typedChar = 'っ';
            setInputState(initialInputState);
            // -> 文字比較へ
        } else if (funcKeyName === '拗音') {
            if (inputState.gyouKey) {
                clearInputTimeout();
                setInputState(prev => ({ ...prev, hasYouon: true }));
                inputTimeoutRef.current = window.setTimeout(resetInputStateAndClearTimeout, INPUT_TIMEOUT_MS);
                return { isExpected: true, shouldGoToNext: false }; // 状態変更のみ
            } else {
                setInputState(initialInputState); // 無効なシーケンス
                clearInputTimeout();
                return { isExpected: false, shouldGoToNext: false };
            }
        } else if (funcKeyName === '濁音') {
            clearInputTimeout(); // タイムアウトクリアを先に行う
            if (inputState.gyouKey) {
                if (inputState.gyouKey === 'は行' && inputState.hasDakuon && !inputState.hasHandakuon) { // 濁音状態かつ半濁音でない場合
                    // は行 + 濁音状態 でさらに濁音キー -> 半濁音状態へ
                    setInputState(prev => ({ ...prev, hasDakuon: false, hasHandakuon: true }));
                } else if (!inputState.hasDakuon && !inputState.hasHandakuon) { // まだ濁音でも半濁音でもない場合
                    // 通常の濁音状態へ (半濁音とは排他)
                    clearInputTimeout();
                    setInputState(prev => ({ ...prev, hasDakuon: true, hasHandakuon: false }));
                }
                inputTimeoutRef.current = window.setTimeout(resetInputStateAndClearTimeout, INPUT_TIMEOUT_MS);
                return { isExpected: true, shouldGoToNext: false }; // 状態変更のみ
            } else {
                setInputState(initialInputState); // 無効なシーケンス
                return { isExpected: false, shouldGoToNext: false };
            }
        } else if (funcKeyName === '半濁音') {
            if (inputState.gyouKey === 'は行') {
                clearInputTimeout();
                setInputState(prev => ({ ...prev, hasHandakuon: true, hasDakuon: false }));
                inputTimeoutRef.current = window.setTimeout(resetInputStateAndClearTimeout, INPUT_TIMEOUT_MS);
                return { isExpected: true, shouldGoToNext: false }; // 状態変更のみ
            } else {
                setInputState(initialInputState); // 無効なシーケンス
                return { isExpected: false, shouldGoToNext: false };
            }
        } else if (funcKeyName === '記号') {
            clearInputTimeout();
            if (inputState.gyouKey) { // 行キーが押された後に記号キー (kigoPractice2)
                const gyou = inputState.gyouKey;
                // kigoPractice2 の入力パターン (行キー -> 記号キー)
                if (kigoMapping2[gyou]) {
                    typedChar = kigoMapping2[gyou];
                }
                setInputState(initialInputState); // 状態リセット
                // -> 文字比較へ
            } else { // 記号キーが最初に押された (kigoPractice3)
                setInputState({ ...initialInputState, gyouKey: '記号' }); // 行キーとして '記号' をセット
                inputTimeoutRef.current = window.setTimeout(resetInputStateAndClearTimeout, INPUT_TIMEOUT_MS);
                return { isExpected: true, shouldGoToNext: false }; // 状態変更のみ
            }
        }
        else if (inputState.gyouKey === '記号' && currentGyouKey) { // kigoPractice3 パターン (記号キー -> 行キー)
            clearInputTimeout();
            const kigoValue = kigoMapping3[currentGyouKey];
            //console.log(`[Tanbun Input] kigoPractice3 - kigoValue for ${currentGyouKey}:`, kigoValue);
            if (kigoValue) {
                console.log(`[Tanbun Input] kigoPractice3 detected. currentGyouKey=${currentGyouKey}`);
                typedChar = kigoValue.split('\n')[0];
            }
            //console.log(`[Tanbun Input] kigoPractice3 result. typedChar=${typedChar}`);
            setInputState(initialInputState);
            // -> 文字比較へ
        }
        // 2. 段キー (inputState.gyouKey がある場合)
        else if (currentDanKey && inputState.gyouKey) {
            clearInputTimeout();

            const gyou = inputState.gyouKey;
            const danIndex = danList.indexOf(currentDanKey);

            if (danIndex !== -1 && gyou !== '記号') { // 「記号」行以外の場合
                // ... (清音、濁音、拗音などの判定) ...
                if (inputState.hasYouon && inputState.hasDakuon) { // 拗濁音
                    const youdakuonDanIndex = youdakuonDanMapping[gyou]?.indexOf(currentDanKey);
                    if (youdakuonDanIndex !== -1) {
                        typedChar = youdakuonGyouChars[gyou]?.[youdakuonDanIndex] ?? null;
                    }
                 }
                 else if (inputState.hasYouon && inputState.hasHandakuon) { // 拗半濁音 (例: ぴゃ)
                    const youhandakuonDanIndex = youhandakuonDanMapping[gyou]?.indexOf(currentDanKey);
                    if (youhandakuonDanIndex !== -1) {
                        typedChar = youhandakuonGyouChars[gyou]?.[youhandakuonDanIndex] ?? null;
                    }
                 }
                 else if (inputState.hasYouon) { // 拗音 (例: きゃ)
                    const youonDanIndex = youonDanMapping[gyou]?.indexOf(currentDanKey);
                    if (youonDanIndex !== -1) {
                        typedChar = youonGyouChars[gyou]?.[youonDanIndex] ?? null;
                    }
                 }
                 else if (inputState.hasDakuon) { // 濁音 (例: が)
                    // 濁音が存在する行・段かチェック
                    if (dakuonDanMapping[gyou]?.includes(currentDanKey)) {
                         typedChar = dakuonGyouChars[gyou]?.[danIndex] ?? null;
                     }
                 }
                 else if (inputState.hasHandakuon) { // 半濁音 (例: ぱ)
                    // 半濁音が存在する行・段かチェック (gyou は 'は行' のはず)
                    if (gyou === 'は行' && handakuonDanMapping[gyou]?.includes(currentDanKey)) {
                        typedChar = handakuonGyouChars[gyou]?.[danIndex] ?? null;
                     }
                 }
                 else { // 清音 (例: か)
                    if (gyou === 'や行') {
                        if (currentDanKey === 'あ段') typedChar = gyouChars[gyou]?.[0] ?? null; // や
                        else if (currentDanKey === 'う段') typedChar = gyouChars[gyou]?.[1] ?? null; // ゆ
                        else if (currentDanKey === 'お段') typedChar = gyouChars[gyou]?.[2] ?? null; // よ
                    } else {
                        // や行以外は通常のインデックスを使用
                        typedChar = gyouChars[gyou]?.[danIndex] ?? null;
                        // 句点の判定 (例: わ行 + お段 -> 。) は削除 (kigoPractice3 で処理)
                        // 読点の判定 (例: な行 + お段 -> 、) は削除 (kigoPractice3 で処理)
                    }
                 }
            }
            setInputState(initialInputState); // 状態リセット
            // -> 文字比較へ
        }
        // 3. 行キー (単独)
        else if (currentGyouKey) { // 行キーが押された場合 (他のパターンに一致しなかった場合)
            clearInputTimeout();
            if (!inputState.gyouKey && !inputState.hasYouon && !inputState.hasDakuon && !inputState.hasHandakuon) { // 初期状態の場合
                setInputState({ ...initialInputState, gyouKey: currentGyouKey });
                 inputTimeoutRef.current = window.setTimeout(resetInputStateAndClearTimeout, INPUT_TIMEOUT_MS);
                 return { isExpected: true, shouldGoToNext: false }; // 状態変更のみ
             } else { // 予期しないシーケンス
                 setInputState(initialInputState);
                 return { isExpected: false, shouldGoToNext: false };
             }
        }
        // その他のキー (BS, ENT など) はここでは無視
        else {
            clearInputTimeout();
            setInputState(initialInputState); // 無効なキーシーケンスならリセット
            return { isExpected: false, shouldGoToNext: false };
        }


        // 文字が確定した場合のみ判定
        if (typedChar !== null) {
            //console.log(`[Tanbun Input] Character determined: typedChar='${typedChar}'`);
            let expectedCharsToCompare = "";
            // let charsToAdvance = 1; // Default advancement (moved up)
            if (currentIndex < currentSentence.length) { // インデックスが範囲内かチェック
                const firstChar = currentSentence[currentIndex];
                expectedCharsToCompare = firstChar; // まず1文字目を取得
                charsToAdvance = 1;
                // 2文字目が存在し、拗音/拗濁音などを形成するかチェック
                if (currentIndex + 1 < currentSentence.length) {
                    const secondChar = currentSentence[currentIndex + 1];
                    const smallYouonChars = ['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ']; // 小文字も考慮
                    // 拗音・拗濁音・拗半濁音の基底文字かチェック (より正確に)
                    const isBaseForYouon = ['き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'ぢ', 'び', 'ぴ'].includes(firstChar);
                    // 促音「っ」は単独で処理されるので、ここでは考慮しない
                    // 外来語の「うぃ」なども考慮が必要なら追加
                    if (isBaseForYouon && smallYouonChars.includes(secondChar)) {
                        expectedCharsToCompare = firstChar + secondChar; // 2文字を結合
                        charsToAdvance = 2;
                    }
                }
            }


            if (typedChar === expectedCharsToCompare) {
                isCorrect = true;
            }

            if (isCorrect) {
                // correctCountRef.current += charsToAdvance; // 古いカウントは使わない
                completedCharsCountRef.current += charsToAdvance; // 正しく入力完了した文字数をカウント
                const nextIndex = currentIndex + charsToAdvance;

                if (nextIndex >= currentSentence.length) {
                    // 短文完了 (句点まで入力された)
                    completedSentenceCountRef.current += 1;
                    selectNextSentence(); // 次の文へ (currentIndex は selectNextSentence でリセット)
                } else {
                    setCurrentIndex(nextIndex);
                    setProgressInfo({ typedEndIndex: nextIndex });
                }
                return { isExpected: true, shouldGoToNext: false }; // shouldGoToNext は false
            } else {
                missCountRef.current += 1;
                // ミスした場合、currentIndex は変更しない
                return { isExpected: false, shouldGoToNext: false };
            }
        } else {
            // console.warn(`[Tanbun Input] Reached unexpected state where typedChar is null after processing.`);
            return { isExpected: false, shouldGoToNext: false };
        }
    }, [status, currentSentence, currentIndex, selectNextSentence, kb, side, funcKeyCodes, inputState,
        clearInputTimeout, resetInputStateAndClearTimeout]
    );

    useEffect(() => { console.log(`[Tanbun Input] currentIndex updated to: ${currentIndex}`); }, [currentIndex]);

    const getProgressInfo = useCallback((): TanbunProgressInfo => {
        return progressInfo;
    }, [progressInfo]);

    const practiceResult = useMemo(() => {
        // headingChars の計算ロジックを useMemo の中に移動
        let calculatedHeadingChars: string[] = [];
        if (status === 'countdown') {
            calculatedHeadingChars = [`${countdownValue}秒`];
        } else if (status === 'finished') {
            calculatedHeadingChars = ['終了！'];
        } else if (status === 'running' && currentSentence) {
            calculatedHeadingChars = [currentSentence];
        }

        return {
            headingChars: calculatedHeadingChars, // 計算結果を使用
            handleInput,
            getProgressInfo,
            reset,
            challengeResults,
            targetLayerIndex: null,
            displayLayers: [],
            getHighlightClassName: () => ({ className: null, overrideKey: null }),
            isInvalidInputTarget: () => false,
            typedEndIndex: progressInfo.typedEndIndex, // 最新の typedEndIndex を含める
            status, // status も返す
            countdownValue, // countdownValue も返す
        };
    }, [
        status, countdownValue, currentSentence, // headingChars の計算に必要なもの
        handleInput,
        getProgressInfo,
        reset,
        challengeResults,
        progressInfo // typedEndIndex の更新を検知
    ]);

    return practiceResult; // useMemo の結果を返す
};

export default useTanbunChallengePractice;
