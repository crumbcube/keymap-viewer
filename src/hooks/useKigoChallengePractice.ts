// /home/coffee/my-keymap-viewer/src/hooks/useKigoChallengePractice.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // useMemo をインポート
import {
    PracticeHookProps,
    PracticeHookResult,
    PracticeInputInfo,
    ChallengeResult,
    PracticeHighlightResult,
    HighlightInfo,
} from './usePracticeCommons';
import {
    kigoPractice1Data,
    kigoPractice2Data,
    kigoPractice3Data,
    kigoMapping2,
    kigoMapping3,
} from '../data/keymapData';
import { type } from 'os'; // このインポートは不要そうなので後で削除検討

// 長押し判定時間 (ミリ秒) - useKigoPractice1.ts からコピー
const LONG_PRESS_DURATION = 600;

// カウントダウン秒数
const COUNTDOWN_SECONDS = 5;

// 記号チャレンジモードの状態
interface KigoChallengeState {
    targetChar: string | null;
    targetGyouKey: string | null;
    targetLayerIndex: number | null;
    targetType: 'kigo1' | 'kigo2' | 'kigo3' | null; // どのデータセット由来か
    isEqualSign: boolean; // = キーが必要か
    currentStep: number; // 0: 初期状態, 1: 1打鍵目完了
    status: 'idle' | 'countdown' | 'running' | 'finished';
    countdownValue: number;
    startTime: number | null;
    endTime: number | null;
    totalQuestions: number;
    correctAnswers: number;
    totalCharsTyped: number; // 入力した総文字数（正誤問わず）
    totalKeyPresses: number;
    incorrectKeyPresses: number;
    challengeResults: ChallengeResult | null; // ChallengeResults -> ChallengeResult に修正
    isLongPressSuccess: boolean;
}

const initialState: KigoChallengeState = {
    targetChar: null,
    targetGyouKey: null,
    targetLayerIndex: null,
    targetType: null,
    isEqualSign: false,
    currentStep: 0,
    status: 'idle',
    countdownValue: COUNTDOWN_SECONDS,
    startTime: null,
    endTime: null,
    totalQuestions: 0,
    correctAnswers: 0,
    totalCharsTyped: 0,
    totalKeyPresses: 0,
    incorrectKeyPresses: 0,
    challengeResults: null,
    isLongPressSuccess: false,
};


// 記号チャレンジモードのカスタムフック
const useKigoChallengePractice = (props: PracticeHookProps): PracticeHookResult => {
    const { isActive, side, layers, kb } = props; // layers, kb を受け取る

    const [state, setState] = useState<KigoChallengeState>(initialState);
    const stateRef = useRef(state); // 常に最新の state を参照するための ref (useCallback 内で使う)
    const pressInfoRef = useRef<{ code: number; timestamp: number } | null>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const equalSignHighlightTimerRef = useRef<number | null>(null);
    const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持

    // state が更新されるたびに ref も更新
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // 組み合わせた全記号リストを作成 (初回のみ)
    const allKigoChars = useRef<
        { char: string; gyouKey: string | null; layerIndex: number; type: 'kigo1' | 'kigo2' | 'kigo3'; isEqualSign: boolean }[] // gyouKey を null 許容に
    >([]).current;

    useEffect(() => {
        if (allKigoChars.length === 0) {
            // kigoPractice1Data からの記号には layerIndex: 6 を設定
            kigoPractice1Data.forEach(group => {
                group.chars.forEach((char, index) => {
                    // kigoPractice1Data の inputDef からキー名を取得する想定だが、
                    // このフックでは gyouKey は直接使わないので null でも良いかもしれない。
                    // ただし、将来的な拡張性を考慮し、inputDef の keyName を使うのが望ましい。
                    // ここでは仮に group.inputs[index].keyName を gyouKey として扱う（要確認）
                    const keyName = group.inputs[index]?.keyName ?? null; // null チェックを追加
                    allKigoChars.push({ char, gyouKey: keyName, layerIndex: 6, type: 'kigo1', isEqualSign: false });
                });
            });
            // kigoPractice2Data からの記号には layerIndex: 2 を設定
            kigoPractice2Data.forEach(group => {
                group.chars.forEach((char: string, index: number) => { // index を追加
                    // group.inputs[index].gyouKey を使う
                    const gyouKey = group.inputs[index]?.gyouKey ?? null; // null チェック
                    allKigoChars.push({ char, gyouKey: gyouKey, layerIndex: 7, type: 'kigo2', isEqualSign: false });
                });
            });
            kigoPractice3Data.forEach(group => {
                group.chars.forEach((char, index) => {
                    const isEqualSign = char === '＝';
                    // '=' の場合は gyouKey は null、それ以外は inputDef から取得
                    const gyouKey = isEqualSign ? null : (group.inputs[index]?.gyouKey ?? null);
                    allKigoChars.push({ char, gyouKey: gyouKey, layerIndex: 8, type: 'kigo3', isEqualSign: isEqualSign });
                });
            });
        }
    }, [allKigoChars]); // allKigoChars は ref なので依存配列は初回のみ実行される
    // 次のターゲットを選択する関数
    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current !== null) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);
    const clearEqualSignHighlightTimer = useCallback(() => {
        if (equalSignHighlightTimerRef.current !== null) {
            clearTimeout(equalSignHighlightTimerRef.current);
            equalSignHighlightTimerRef.current = null;
        }
    }, []);

    const selectNextTarget = useCallback(() => {
        if (allKigoChars.length === 0) {
            console.warn("[KigoChallenge] allKigoChars is empty, cannot select next target.");
            return;
        }

        // ランダムに記号を選択
        const randomIndex = Math.floor(Math.random() * allKigoChars.length);
        const selected = allKigoChars[randomIndex];

        setState(prev => ({
            ...prev,
            targetChar: selected.char,
            targetGyouKey: selected.gyouKey,
            targetLayerIndex: selected.layerIndex,
            targetType: selected.type,
            isEqualSign: selected.isEqualSign,
            currentStep: 0, // ステップをリセット
            isLongPressSuccess: false,
        }));
        pressInfoRef.current = null;
        clearLongPressTimer();
        clearEqualSignHighlightTimer();
    }, [allKigoChars, clearLongPressTimer, clearEqualSignHighlightTimer]); // clearEqualSignHighlightTimer を追加
    // チャレンジ開始/リセット処理
    const startChallenge = useCallback(() => {
        setState({ // initialState を直接使う
            ...initialState, // スプレッド構文で initialState の全プロパティを展開
            status: 'countdown',
            countdownValue: COUNTDOWN_SECONDS,
            startTime: null,
            endTime: null,
            challengeResults: null,
            isLongPressSuccess: false,
        });
        pressInfoRef.current = null;
        clearLongPressTimer();
    }, []); // 依存配列は空 (initialState は外にあるため)

    // カウントダウン処理
    useEffect(() => {
        if (isActive && state.status === 'countdown') {
            if (state.countdownValue > 0) {
                const timerId = setTimeout(() => {
                    setState(prev => ({ ...prev, countdownValue: prev.countdownValue - 1 }));
                }, 1000);
                return () => clearTimeout(timerId);
            } else {
                setState(prev => ({
                    ...prev,
                    status: 'running',
                    startTime: Date.now(),
                }));
            }
        }
    }, [isActive, state.status, state.countdownValue]); // selectNextTarget は不要

    useEffect(() => {
        if (state.status === 'running' && !state.targetChar) { // ターゲットがまだない場合のみ
            selectNextTarget();
        }
    }, [state.status, selectNextTarget, state.targetChar]); // state.targetChar も依存配列に追加

    // チャレンジ終了処理
    const finishChallenge = useCallback(() => {
        const now = Date.now();
        const { startTime, totalQuestions, correctAnswers, totalCharsTyped, totalKeyPresses, incorrectKeyPresses } = stateRef.current;
        const durationSeconds = startTime ? (now - startTime) / 1000 : 0;

        const accuracy = totalKeyPresses > 0 ? (totalKeyPresses - incorrectKeyPresses) / totalKeyPresses : 0;

        // missCount を計算
        const missCount = totalQuestions - correctAnswers;
        // スコア計算: (正答数 * 精度) を基本とし、時間経過で少し減点（仮）
        // const score = Math.max(0, Math.round((correctAnswers * accuracy * 10) - (durationSeconds / 10)));
        // スコア計算: 正答数 * 精度 * 10 を基本とする
        const score = Math.round(correctAnswers * accuracy * 20);

        // 新しいランクメッセージ判定 (入力がなければ空)
        const rankMessage = totalKeyPresses > 0 ? getRankMessageKigo(score) : '';

        const results: ChallengeResult = { // ChallengeResults -> ChallengeResult に修正
            totalQuestions,
            totalCharsTyped,
            correctCount: correctAnswers, // correctAnswers -> correctCount
            missCount: missCount, // missCount を追加
            accuracy,
            score,
            rankMessage,
        };

        setState(prev => ({
            ...prev,
            endTime: now,
            status: 'finished',
            challengeResults: results,
            targetChar: null, // ターゲットをクリア
            targetGyouKey: null,
            targetLayerIndex: null,
        }));
    clearLongPressTimer();
}, [clearLongPressTimer]); // Only depends on functions/refs it calls

// --- ランクメッセージ判定関数 (記号用) ---
const getRankMessageKigo = (score: number): string => {
    // スコア基準は他のチャレンジと調整が必要かもしれません
    if (score >= 1500) return "Godlike! タイピングの神！";
    if (score >= 1000) return "Excellent! 正確さバッチリ！";
    if (score >= 500) return "Great! なかなかやりますね！";
    if (score >= 200) return "Good! その調子！";
    return "Keep Trying! 練習あるのみ！";
    };
  
    // 60秒タイマー
    useEffect(() => {
        if (isActive && state.status === 'running' && state.startTime && !state.endTime) {
            const timerId = setTimeout(() => {
                finishChallenge();
            }, 60000); // 60秒

            return () => {
                clearTimeout(timerId);
            };
        }
}, [isActive, state.status, state.startTime, state.endTime, finishChallenge]); // finishChallenge は安定している

    // 練習モードがアクティブになったらチャレンジ開始
    useEffect(() => {
        // isActive が false になった最初のタイミングでリセット
        if (!isActive && prevIsActiveRef.current) {
            // console.log(`[KigoChallenge useEffect] Resetting state because isActive became false.`);
            setState(initialState); // initialState に戻す
            pressInfoRef.current = null;
            clearLongPressTimer();
        } else if (isActive && state.status === 'idle') { // isActive が true で status が idle の場合のみチャレンジ開始
            startChallenge(); // useCallback でメモ化された関数を呼ぶ
        }
        prevIsActiveRef.current = isActive; // 最後に前回の値を更新
        clearEqualSignHighlightTimer();
    }, [isActive, state.status, startChallenge, clearLongPressTimer]); // clearLongPressTimer を追加

    // 入力処理
    const handleInput = useCallback((info: PracticeInputInfo): { isExpected: boolean; shouldGoToNext: boolean } => {

        const { targetChar, targetGyouKey, targetLayerIndex, isEqualSign, currentStep, targetType } = stateRef.current; // targetType も取得
        const { isLongPressSuccess } = stateRef.current;
        const pressCode = info.pressCode;

        // --- Helper function definitions (moved here) ---
        // キー名からキーコード（インデックス+1）を取得するヘルパー関数
        const findKeyCode = (keyName: string | null, layerIdx: number | null): number => {
            if (!keyName) return -1;
            const expectedLayer = layerIdx ?? -1; // Use targetLayerIndex from outer scope
            if (expectedLayer === -1 || !layers[expectedLayer]) return -1;

            if (expectedLayer === 6) {
                const index = (layers[6] ?? []).indexOf(keyName);
                return index !== -1 ? index + 1 : -1;
            }
            const index2 = (layers[2] ?? []).indexOf(keyName);
            const index7 = (layers[7] ?? []).indexOf(keyName);
            const index8 = (layers[8] ?? []).indexOf(keyName);
            return index2 !== -1 ? index2 + 1 : (index7 !== -1 ? index7 + 1 : (index8 !== -1 ? index8 + 1 : -1));
        };
        // kigoPractice1 (レイヤー6) の場合のキーコード取得ロジック
        const getExpectedKeyCodeForKigo1 = (): number => {
            return findKeyCode(targetGyouKey, 6);
        };
        // kigoPractice2/3 (レイヤー2) の場合のキーコード取得ロジック
        const getExpectedKeyCodeForKigo2 = (keyName: string | null): number => {
             return findKeyCode(keyName, 2);
        };
        const getExpectedKeyCodeForKigo2Layer7 = (keyName: string | null): number => {
             return findKeyCode(keyName, 7);
        };
        // kigoPractice3 の '記号' キーのコードを取得
        const getKigoKeyCodeForKigo3 = (): number => {
            return findKeyCode('＝\n記号', 8);
        };
        const getExpectedKeyCodeForKigo3Gyou = (keyName: string | null): number => findKeyCode(keyName, 8);
        // --- End of helper function definitions ---

        if (info.type === 'press') {
            const pressCode = info.pressCode;
            const { targetType } = stateRef.current;

            if (targetType === 'kigo1') {
                const expectedKeyCode = getExpectedKeyCodeForKigo1();
                if (pressCode === expectedKeyCode) {
                    // 期待されるキーが押されたらタイマー開始
                    pressInfoRef.current = { code: pressCode, timestamp: info.timestamp };
                    clearLongPressTimer(); // 既存のタイマーがあればクリア
                    longPressTimerRef.current = window.setTimeout(() => {
                        if (pressInfoRef.current && pressInfoRef.current.code === pressCode) {
                            setState(prev => ({ ...prev, isLongPressSuccess: true }));
                        }
                        longPressTimerRef.current = null;
                    }, LONG_PRESS_DURATION);
                }
            }
            return { isExpected: false, shouldGoToNext: false }; // Press イベントはここで終了
        }

        if (stateRef.current.status !== 'running' || !targetChar) {
            return { isExpected: false, shouldGoToNext: false };
        }

        setState(prev => ({ ...prev, totalKeyPresses: prev.totalKeyPresses + 1 }));

        // ターゲットに必要なキーコードを取得
        const expectedLayer = targetLayerIndex ?? -1; // null の場合は -1 など無効な値に
        const layerKeys = layers[expectedLayer];
        if (!layerKeys) {
            console.error(`[KigoChallenge handleInput] Invalid expectedLayer: ${expectedLayer}`);
            return { isExpected: false, shouldGoToNext: false };
        }

        // --- Helper function definitions (also needed for release logic) ---
        // (Functions are already defined above in the 'press' block scope,
        // but ideally they should be defined once at the beginning of handleInput)
        // --- End of helper function definitions ---


        let expectedFirstKeyCode = -1;
        let expectedSecondKeyCode = -1;
        const expectedGyouKeyCode = findKeyCode(targetGyouKey, targetLayerIndex);
        const expectedEqualKeyCode = findKeyCode('＝\n記号', 8);

        let isCorrectInput = false;
        let nextStep = currentStep;
        let shouldGoToNext = false;

        // 1打鍵目の評価 (= が不要な場合、または = が必要な場合の1打鍵目)
        // 修正: targetType ごとに分岐 + kigo1 の長押し判定
        if (currentStep === 0) {
            if (targetType === 'kigo1') { // レイヤー6 (1打鍵のみ)
                expectedFirstKeyCode = getExpectedKeyCodeForKigo1();
                if (pressInfoRef.current && pressCode === pressInfoRef.current.code) {
                    const pressTimestamp = pressInfoRef.current.timestamp;
                    const releaseTimestamp = info.timestamp;
                    const duration = releaseTimestamp - pressTimestamp;

                    clearLongPressTimer(); // タイマー解除

                    if (pressCode === expectedFirstKeyCode && duration >= LONG_PRESS_DURATION && isLongPressSuccess) {
                        isCorrectInput = true;
                        nextStep = 1; // 完了
                        shouldGoToNext = true;
                    } else {
                        isCorrectInput = false; // 長押し失敗またはキー違い
                    }
                } else {
                    isCorrectInput = false; // 押下情報がない、または押下キーと違う
                }
                pressInfoRef.current = null;
                setState(prev => ({ ...prev, isLongPressSuccess: false }));

            // --- kigo2, kigo3 の1打鍵目 (変更なし) ---
            } else if (targetType === 'kigo2') { // レイヤー2 (行キー -> 記号キー)
                expectedFirstKeyCode = getExpectedKeyCodeForKigo2Layer7(targetChar);
                if (pressCode === expectedFirstKeyCode) {
                    isCorrectInput = true;
                    nextStep = 1; // 2打鍵目待ち
                }
            } else if (targetType === 'kigo3') { // レイヤー2 (記号キー -> 行キー or 記号キー -> 記号キー)
                expectedFirstKeyCode = getKigoKeyCodeForKigo3();
                if (pressCode === expectedFirstKeyCode) {
                    isCorrectInput = true;
                    if (isEqualSign) {
                        clearEqualSignHighlightTimer(); // 既存のタイマーがあればクリア
                        equalSignHighlightTimerRef.current = window.setTimeout(() => {
                            // タイマーが完了したら ref を null に戻す
                            if (stateRef.current.currentStep === 1) { // 2打目待ち状態の場合のみ再表示
                                setState(prev => ({ ...prev, showHighlightForEqualSign: true }));
                            }
                            equalSignHighlightTimerRef.current = null;
                        }, 500); // 500ms後にハイライト再表示
                    }
                    nextStep = 1; // 2打鍵目待ち
                }
            }
        }
        // 2打鍵目の評価 (kigo2, kigo3) (変更なし)
        else if (currentStep === 1) {
            expectedSecondKeyCode = (targetType === 'kigo2') ? findKeyCode('記号', 7) : // kigo2 の2打目はレイヤー7の'記号'
                                   (isEqualSign ? getKigoKeyCodeForKigo3() : // kigo3 の '=' なら '＝\n記号'
                                   getExpectedKeyCodeForKigo3Gyou(targetGyouKey)); // kigo3 のそれ以外はレイヤー8の行キー
            clearEqualSignHighlightTimer();
            if (pressCode === expectedSecondKeyCode) {
                isCorrectInput = true;
                nextStep = 2; // 完了
                shouldGoToNext = true;
            }
        }


        // 正誤判定と状態更新
        if (isCorrectInput) {
            setState(prev => ({
                ...prev,
                currentStep: nextStep,
                // 正解の場合のみ文字数を加算（仕様による）
                totalCharsTyped: prev.totalCharsTyped + (targetChar?.length ?? 0),
            }));

            if (shouldGoToNext) {
                setState(prev => ({
                    ...prev,
                    totalQuestions: prev.totalQuestions + 1,
                    correctAnswers: prev.correctAnswers + 1,
                }));
                selectNextTarget(); // 次の問題へ
            }
            return { isExpected: true, shouldGoToNext: false }; // App側での nextStage 呼び出しは不要
        } else {
            // 不正解の場合、問題は変えずにステップをリセットする（または何もしない）
            // 不正解でも問題数をカウントする場合
            /*
            setState(prev => ({
                ...prev,
                totalQuestions: prev.totalQuestions + 1,
                // 不正解でも文字数をカウントする場合
                // totalCharsTyped: prev.totalCharsTyped + (targetChar?.length ?? 0),
                currentStep: 0, // ステップをリセットしてやり直し
            }));
            clearEqualSignHighlightTimer();
            selectNextTarget(); // 不正解でも次の問題へ進む場合
            */
            // 不正解の場合、問題を変えずにステップのみリセット
            setState(prev => ({
                ...prev,
                currentStep: 0, // ステップをリセット
                incorrectKeyPresses: prev.incorrectKeyPresses + 1,
                // 不正解でも問題数をカウントする場合（ただし、正解するまでカウントしない方が良いかも）
                // totalQuestions: prev.totalQuestions + 1,
            }));
            clearEqualSignHighlightTimer();

            return { isExpected: false, shouldGoToNext: false };
        }

    }, [layers, selectNextTarget, clearLongPressTimer, stateRef]); // stateRef を依存配列に追加

    // リセット処理
    const reset = useCallback(() => {
        setState(initialState);
        // startChallenge();
        pressInfoRef.current = null;
        clearLongPressTimer();
        clearEqualSignHighlightTimer();
    }, [clearLongPressTimer]); // initialState は外部スコープなので依存配列は空, clearLongPressTimer を追加

    // ヘッダー表示用の文字配列
    const headingChars = useMemo(() => {
        if (state.status === 'countdown') {
            return [`${state.countdownValue}秒`];
        } else if (state.status === 'finished' && state.challengeResults) {
            return ['終了！'];
        } else if (state.status === 'running' && state.targetChar) {
            // 現在のターゲット文字を表示
            return [state.targetChar];
        }
        return ['読み込み中...'];
    }, [state.status, state.countdownValue, state.targetChar, state.challengeResults]);

    const reverseKigoMapping2 = useMemo(() => {
        const map: Record<string, string> = {};
        for (const key in kigoMapping2) {
            map[kigoMapping2[key]] = key;
        }
        return map;
    }, []);

    const reverseKigoMapping3 = useMemo(() => {
        const map: Record<string, string> = {};
        for (const key in kigoMapping3) {
            // '＝\n記号' のような値は '＝' のみで逆引きできるようにする
            const displayChar = kigoMapping3[key].split('\n')[0];
            map[displayChar] = key;
        }
        return map;
    }, []);

    // ハイライト処理
    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        const { status, targetGyouKey, targetLayerIndex, isEqualSign, currentStep, targetType, targetChar/*, showHighlightForEqualSign */} = state;

        if (status !== 'running' || targetLayerIndex === null) {
            return noHighlight;
        }

        if (layoutIndex !== targetLayerIndex) {
            return noHighlight;
        }

        let expectedKeyName: string | null = null;
        let expectedDisplayKeyName: string | null = null;

        // 修正: targetType ごとに分岐
        if (targetType === 'kigo1') { // レイヤー6
            expectedKeyName = targetGyouKey;
            expectedDisplayKeyName = expectedKeyName; // kigo1 は表示名そのまま
            if (keyName.trim() === expectedDisplayKeyName?.trim()) {
                return { className: state.isLongPressSuccess ? 'bg-green-200' : 'bg-blue-100', overrideKey: null };
            }
        } else if (targetType === 'kigo2') { // レイヤー2 (行キー -> 記号キー)
            if (currentStep === 0) { // 1打目: 記号キー
                expectedKeyName = state.targetChar;
                expectedDisplayKeyName = expectedKeyName;
            } else if (currentStep === 1) {
                expectedKeyName = '記号';
                expectedDisplayKeyName = expectedKeyName; // '記号' キーはそのまま
            }
        } else if (targetType === 'kigo3') { // レイヤー2 (記号キー -> 行キー or 記号キー -> 記号キー)
            if (currentStep === 0) {
                expectedKeyName = '＝\n記号';
                expectedDisplayKeyName = expectedKeyName; // kigo3 は表示名そのまま
            } else if (currentStep === 1) {
                expectedKeyName = isEqualSign ? '＝\n記号' : state.targetChar;
                expectedDisplayKeyName = expectedKeyName; // kigo3 は表示名そのまま
            }
            if (isEqualSign && currentStep === 1 && equalSignHighlightTimerRef.current !== null) {
                expectedDisplayKeyName = null; // ハイライトしない
            }
        }


        // targetGyouKey が null の場合のチェックを追加 (特に kigo3 の '=' の場合など)
        // expectedKeyName が null になるのは、期待するキーがない場合（例：kigo1でステップ1など）
        if (expectedDisplayKeyName === null || expectedDisplayKeyName === undefined) { // undefined もチェック
            return noHighlight;
        }

        if (keyName.trim() === expectedDisplayKeyName?.trim()) {
            return { className: 'bg-blue-100', overrideKey: null };
        }

        return noHighlight;
    }, [
        state.status,
        state.targetLayerIndex,
        state.currentStep,
        state.targetGyouKey,
        state.targetType,
        state.isEqualSign,
        state.isLongPressSuccess,
        state.targetChar,
    ]); // stateRef.current を直接参照するのではなく、state の変更を検知して関数を再生成する

    // 不正入力ターゲット判定
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        // stateRef から最新の値を取得
        const { status, targetGyouKey, targetLayerIndex, isEqualSign, currentStep, targetType } = stateRef.current;

        if (status !== 'running' || targetLayerIndex === null || layoutIndex !== targetLayerIndex) {
            return false;
        }

        // 期待されるキーコードを取得するロジック (handleInput と同様)
        const getExpectedKeyCode = (): number => {
            const layerKeys = layers[targetLayerIndex];
            if (!layerKeys) return -1;
            const findKeyCodeLocal = (keyName: string | null, layerIdx: number | null): number => {
                if (!keyName) return -1;
                const expectedLayer = layerIdx ?? -1;
                if (expectedLayer === -1 || !layers[expectedLayer]) return -1;
                const index = (layers[expectedLayer] ?? []).indexOf(keyName);
                return index !== -1 ? index + 1 : -1;
            };
            let expectedKeyName: string | null = null;

            if (targetType === 'kigo1') {
                expectedKeyName = targetGyouKey;
                // const index = (layers[6] ?? []).indexOf(expectedKeyName ?? '');
                // return index !== -1 ? index + 1 : -1;
            } else if (targetType === 'kigo2') {
                if (currentStep === 0) expectedKeyName = stateRef.current.targetChar;
                else if (currentStep === 1) expectedKeyName = '記号';
            } else if (targetType === 'kigo3') {
                if (currentStep === 0) expectedKeyName = '＝\n記号';
                else if (currentStep === 1) expectedKeyName = isEqualSign ? '＝\n記号' : targetGyouKey;
            }

            return findKeyCodeLocal(expectedKeyName, targetLayerIndex);
        };

        const expectedKeyCode = getExpectedKeyCode();

        // 期待されるキーコードがない場合は不正入力ターゲットではない
        if (expectedKeyCode === -1) return false;

        // 期待されるキーコードと押されたキーコードが異なる、かつ、
        // 押されたキーがターゲットレイヤー上にある場合に true
        return pressCode !== expectedKeyCode && keyIndex === (pressCode - 1);
    }, [layers, stateRef]); // stateRef を依存配列に追加

    // getHighlight (ダミー実装)
    const getHighlight = useCallback((): HighlightInfo => {
        return { start: null, end: null };
    }, []);

    const displayLayers = useMemo(() => {
        const { targetType, targetLayerIndex } = state;

        // App.tsx が targetLayerIndex を見て適切なレイヤーを表示する

        return layers;
    }, [state.targetType, state.targetLayerIndex, layers]); // layers も依存配列に追加

    return {
        handleInput,
        reset,
        headingChars,
        getHighlightClassName, // highlightedKeys -> getHighlightClassName
        isInvalidInputTarget,
        getHighlight, // getHighlight を追加
        targetLayerIndex: state.targetLayerIndex,
        displayLayers,
        challengeResults: state.challengeResults,
        // 以下は KigoChallenge では直接使わないかもしれないが一応返す
        status: state.status,
        countdownValue: state.countdownValue,
        targetChar: state.targetChar ?? undefined, // targetChar を追加
        // gyouKey, charIndex, step は PracticeHookResult にないので削除
    };
};

export default useKigoChallengePractice;
