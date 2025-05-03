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
import { tanbunSentences, kigoMapping3 } from '../data/keymapData'; // 短文データと kigoMapping3 をインポート

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
  if (score >= 3000) return "超高速！素晴らしい！";
  if (score >= 2000) return "速い！正確さもGood！";
  if (score >= 1000) return "良いペース！";
  if (score >= 500) return "まずまず！練習を続けよう！";
  return "頑張ろう！";
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
    const totalCharsTypedRef = useRef(0); // 総タイプ文字数
    const completedSentenceCountRef = useRef(0); // 完了した短文数
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
            setRemainingSentences(prev => prev.filter((_, i) => i !== randomIndex));
        } else {
            // 全文終了した場合
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

                    const correct = correctCountRef.current;
                    const miss = missCountRef.current;
                    const totalTyped = correct + miss;
                    const accuracy = totalTyped > 0 ? correct / totalTyped : 0;
                    // CPM (Characters Per Minute)
                    const cpm = Math.round(correct / (CHALLENGE_DURATION_SECONDS / 60));
                    // スコア計算 (例: CPM * 精度^2)
                    const score = Math.round(cpm * Math.pow(accuracy, 2) * 20);
                    const rankMessage = getRankMessage(score);

                    const results: ChallengeResult = {
                        totalQuestions: completedSentenceCountRef.current, // 完了した短文数
                        totalCharsTyped: totalCharsTypedRef.current,
                        correctCount: correct,
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

    // ヘッダー表示用文字配列 (現在の短文)
    const headingChars = useMemo(() => {
        if (status === 'countdown') {
            return [`${countdownValue}秒`];
        } else if (status === 'finished') {
            return ['終了！'];
        } else if (status === 'running' && currentSentence) {
            return [currentSentence]; // 短文全体を1要素として渡す
        }
        return [];
    }, [status, countdownValue, currentSentence]);

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
        correctCountRef.current = 0;
        missCountRef.current = 0;
        totalCharsTypedRef.current = 0;
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
        totalCharsTypedRef.current += 1;

        let typedChar: string | null = null;
        const currentGyouKey = hid2Gyou(pressCode, kb, side);
        const currentDanKey = hid2Dan(pressCode, kb, side);
        const currentYouonKey = hid2Youon(pressCode, kb, side); // 拗音キー判定
        const funcMap = functionKeyMaps[kb]?.[side] ?? {};
        const funcKeyName = Object.entries(funcMap).find(([idx, _]) => parseInt(idx) + 1 === pressCode)?.[1]; // 1-based index

        // ただし、タイムアウト自体によるリセットの場合はクリアしない
        // clearInputTimeout(); // ← ここでクリアすると、タイムアウトが機能しなくなる場合がある

/*
        // 機能キーが押された場合
        if (funcKeyName === '促音') {
            typedChar = 'っ'; // 促音は単独で確定
            setInputState(initialInputState); // 状態リセット
            // 促音はここで文字が確定するので、下の判定に進む
        } else if (funcKeyName === '拗音') {
            if (inputState.gyouKey) { // 行キーが入力済みの場合のみ有効
                setInputState(prev => ({ ...prev, hasYouon: true }));
            } else { // 行キーがまだなら無効
                setInputState(initialInputState);
            }
            return { isExpected: true, shouldGoToNext: false };
        } else if (funcKeyName === '濁音') {
            if (inputState.gyouKey) { // 行キーが入力済みの場合のみ有効
                // 半濁音とは排他
                setInputState(prev => ({ ...prev, hasDakuon: true, hasHandakuon: false }));
            } else { // 行キーがまだなら無効
                setInputState(initialInputState);
            }
            return { isExpected: true, shouldGoToNext: false };
        } else if (funcKeyName === '半濁音') { // 半濁音キーが定義されている場合
            if (inputState.gyouKey === 'は行') { // は行のみ有効
                // 濁音とは排他
                setInputState(prev => ({ ...prev, hasHandakuon: true, hasDakuon: false }));
            } else { // は行以外なら無効
                setInputState(initialInputState);
            }
             return { isExpected: true, shouldGoToNext: false };
            }
        // 行キーが押された場合
        else if (currentGyouKey) {
            // 既に入力状態があればリセットしてから新しい行キーを設定
            setInputState({ ...initialInputState, gyouKey: currentGyouKey });
            return { isExpected: true, shouldGoToNext: false };
        }
*/
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
            if (inputState.gyouKey) {
                if (inputState.gyouKey === 'は行' && inputState.hasDakuon) {
                    // は行 + 濁音状態 でさらに濁音キー -> 半濁音状態へ
                    clearInputTimeout();
                    setInputState(prev => ({ ...prev, hasDakuon: false, hasHandakuon: true }));
                } else {
                    // それ以外は通常の濁音状態へ (半濁音とは排他)
                    clearInputTimeout();
                    setInputState(prev => ({ ...prev, hasDakuon: true, hasHandakuon: false }));
                }
                inputTimeoutRef.current = window.setTimeout(resetInputStateAndClearTimeout, INPUT_TIMEOUT_MS);
                return { isExpected: true, shouldGoToNext: false }; // 状態変更のみ
            } else {
                setInputState(initialInputState); // 無効なシーケンス
                clearInputTimeout();
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
        }
        // 2. 段キー (inputState.gyouKey がある場合)
        else if (currentDanKey && inputState.gyouKey) {
            clearInputTimeout();

            const gyou = inputState.gyouKey;
            const danIndex = danList.indexOf(currentDanKey);

            if (gyou === '記号') {
                const gyouKeyForKigo = hid2Gyou(pressCode, kb, side);
                if (gyouKeyForKigo && kigoMapping3[gyouKeyForKigo]) {
                    typedChar = kigoMapping3[gyouKeyForKigo].split('\n')[0];
                }
            }
            else if (danIndex !== -1) { // 「記号」行以外の場合
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
                    // 半濁音が存在する行・段かチェック
                    if (handakuonDanMapping[gyou]?.includes(currentDanKey)) {
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
                        // 句点の判定 (例: わ行 + お段)
                        if (gyou === 'わ行' && currentDanKey === 'お段') {
                            typedChar = '。';
                        }
                    }
                 }
            }
            setInputState(initialInputState); // 状態リセット
            // -> 文字比較へ
        }
        // 3. 行キー (inputState が初期状態の場合)
        else if (currentGyouKey && !inputState.gyouKey && !inputState.hasYouon && !inputState.hasDakuon && !inputState.hasHandakuon) {
             clearInputTimeout();
             setInputState({ ...initialInputState, gyouKey: currentGyouKey });
             inputTimeoutRef.current = window.setTimeout(resetInputStateAndClearTimeout, INPUT_TIMEOUT_MS);
             return { isExpected: true, shouldGoToNext: false }; // 状態変更のみ
        }
        // その他のキー (BS, ENT など) はここでは無視
        else {
            clearInputTimeout();
            setInputState(initialInputState); // 無効なキーシーケンスならリセット
            return { isExpected: false, shouldGoToNext: false };
        }


        // 文字が確定した場合のみ判定
        if (typedChar !== null) {
            // console.warn("Could not convert pressCode to char:", pressCode); // ログ削除
            // return { isExpected: false, shouldGoToNext: false }; // 変換できなければ無視

            let expectedCharsToCompare = "";
            let charsToAdvance = 1; // 正解時に進むインデックス数
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
                correctCountRef.current += charsToAdvance;
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
            // 文字が確定しなかった場合 (行キーや機能キーのみ押された場合など)
            // console.warn(`[Tanbun Input] Reached unexpected state where typedChar is null after processing.`);
            console.warn(`[Tanbun Input] Reached unexpected state where typedChar is null after processing.`);
            return { isExpected: false, shouldGoToNext: false };
        }
    }, [status, currentSentence, currentIndex, selectNextSentence, kb, side, funcKeyCodes, inputState,
        clearInputTimeout, resetInputStateAndClearTimeout]
    );

    useEffect(() => { console.log(`[Tanbun Input] currentIndex updated to: ${currentIndex}`); }, [currentIndex]);

    const getProgressInfo = useCallback((): TanbunProgressInfo => {
        return progressInfo;
    }, [progressInfo]);

    return {
        // targetChar: currentSentence[currentIndex] ?? '', // ターゲット文字は使わないかも
        headingChars,
        handleInput,
        getProgressInfo,
        reset,
        isOkVisible: false, // OK表示は使わない
        challengeResults,
        // キーボード非表示のための設定
        targetLayerIndex: null,
        displayLayers: [],
        // 以下は必須だが使わないもの
        getHighlightClassName: () => ({ className: null, overrideKey: null }),
        isInvalidInputTarget: () => false,
    };
};

export default useTanbunChallengePractice;
