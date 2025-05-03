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
    const { isActive, okVisible, side, layers, kb } = props; // layers, kb を受け取る

    const [state, setState] = useState<KigoChallengeState>(initialState);
    const stateRef = useRef(state); // 常に最新の state を参照するための ref (useCallback 内で使う)
    const pressInfoRef = useRef<{ code: number; timestamp: number } | null>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const equalSignHighlightTimerRef = useRef<number | null>(null);

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
                    allKigoChars.push({ char, gyouKey: gyouKey, layerIndex: 7, type: 'kigo2', isEqualSign: false }); // ★★★ layerIndex を 7 に修正 ★★★
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
            console.log('[KigoChallenge] Initialized allKigoChars:', allKigoChars); // 必要ならコメント解除
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

        console.log(`[KigoChallenge] Selecting new target:`, selected);

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
        console.log('[KigoChallenge] Starting challenge... Setting status to countdown.');
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
            console.log(`[KigoChallenge] Countdown: ${state.countdownValue}`);
            if (state.countdownValue > 0) {
                const timerId = setTimeout(() => {
                    setState(prev => ({ ...prev, countdownValue: prev.countdownValue - 1 }));
                }, 1000);
                return () => clearTimeout(timerId);
            } else {
                console.log('[KigoChallenge] Countdown finished. Setting status to running.');
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
            console.log('[KigoChallenge] Status is running, selecting initial target.');
            selectNextTarget();
        }
    }, [state.status, selectNextTarget, state.targetChar]); // state.targetChar も依存配列に追加

    // チャレンジ終了処理
    const finishChallenge = useCallback(() => {
        const now = Date.now();
        const { startTime, totalQuestions, correctAnswers, totalCharsTyped, totalKeyPresses, incorrectKeyPresses } = stateRef.current;
        const durationSeconds = startTime ? (now - startTime) / 1000 : 0;


        console.log('[KigoChallenge] Finishing challenge. State from ref:', stateRef.current);
        console.log(`[KigoChallenge] totalKeyPresses at finish: ${totalKeyPresses}`);

        if (durationSeconds <= 0 || totalQuestions === 0) {
            console.warn("[KigoChallenge] Cannot calculate results: duration or totalQuestions is zero.");
            setState(prev => ({
                ...prev,
                endTime: now,
                status: 'finished',
                challengeResults: {
                    totalQuestions: 0,
                    // correctAnswers -> correctCount に修正
                    correctCount: 0,
                    missCount: 0, // missCount を追加
                    totalCharsTyped: 0,
                    accuracy: 0,
                    score: 0,
                    rankMessage: "記録なし",
                }
            }));
            return;
        }

        const accuracy = totalKeyPresses > 0 ? (totalKeyPresses - incorrectKeyPresses) / totalKeyPresses : 0;
        console.log(`[KigoChallenge] totalKeyPresses: ${totalKeyPresses}`);

        // missCount を計算
        const missCount = totalQuestions - correctAnswers;
        // スコア計算: (正答数 * 精度) を基本とし、時間経過で少し減点（仮）
        // const score = Math.max(0, Math.round((correctAnswers * accuracy * 10) - (durationSeconds / 10)));
        // スコア計算: 正答数 * 精度 * 10 を基本とする
        const score = Math.round(correctAnswers * accuracy * 2);


        let rankMessage = "頑張りましょう！";
        if (score >= 150) rankMessage = "素晴らしい！達人レベルです！";
        else if (score >= 100) rankMessage = "すごい！かなりの腕前です！";
        else if (score >= 70) rankMessage = "良い調子！もっと上を目指せます！";
        else if (score >= 40) rankMessage = "まずまずです！練習を続けましょう！";

        const results: ChallengeResult = { // ChallengeResults -> ChallengeResult に修正
            totalQuestions,
            totalCharsTyped,
            correctCount: correctAnswers, // correctAnswers -> correctCount
            missCount: missCount, // missCount を追加
            accuracy,
            score,
            rankMessage,
        };

        console.log('[KigoChallenge] Challenge finished. Results:', results);

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

    // 60秒タイマー
    useEffect(() => {
        if (isActive && state.status === 'running' && state.startTime && !state.endTime) {
            console.log('[KigoChallenge] Training timer started.');
            const timerId = setTimeout(() => {
                console.log('[KigoChallenge] Timer finished.');
                finishChallenge();
            }, 60000); // 60秒

            return () => {
                console.log('[KigoChallenge] Clearing timer.');
                clearTimeout(timerId);
            };
        }
}, [isActive, state.status, state.startTime, state.endTime, finishChallenge]); // finishChallenge は安定している

    // 練習モードがアクティブになったらチャレンジ開始
    useEffect(() => {
        if (isActive && state.status === 'idle') {
            startChallenge(); // useCallback でメモ化された関数を呼ぶ
        } else if (!isActive && state.status !== 'idle') {
            console.log('[KigoChallenge] Practice deactivated, resetting state.');
            setState(initialState); // initialState に戻す
            pressInfoRef.current = null;
            clearLongPressTimer();
        }
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
            console.log('[KigoChallenge handleInput] Ignoring release input: challenge ended or no target.');
            return { isExpected: false, shouldGoToNext: false };
        }

        console.log(`[KigoChallenge handleInput] Incrementing totalKeyPresses. Current: ${stateRef.current.totalKeyPresses}`);
        setState(prev => ({ ...prev, totalKeyPresses: prev.totalKeyPresses + 1 }));

        console.log(`[KigoChallenge handleInput] Release event. Target: ${targetChar}, GyouKey: ${targetGyouKey}, Layer: ${targetLayerIndex}, Type: ${targetType}, isEq: ${isEqualSign}, Step: ${currentStep}, InputCode: 0x${pressCode.toString(16)}`);

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
        console.log(`[KigoChallenge handleInput] Expected Layer: ${expectedLayer}, Expected GyouKeyCode: 0x${expectedGyouKeyCode.toString(16)}, Expected EqualKeyCode: 0x${expectedEqualKeyCode.toString(16)}`);

        let isCorrectInput = false;
        let nextStep = currentStep;
        let shouldGoToNext = false;

        // 1打鍵目の評価 (= が不要な場合、または = が必要な場合の1打鍵目)
        // 修正: targetType ごとに分岐 + kigo1 の長押し判定
        if (currentStep === 0) {
            if (targetType === 'kigo1') { // レイヤー6 (1打鍵のみ)
                expectedFirstKeyCode = getExpectedKeyCodeForKigo1();
                // ★★★ 長押し判定を追加 ★★★
                if (pressInfoRef.current && pressCode === pressInfoRef.current.code) {
                    const pressTimestamp = pressInfoRef.current.timestamp;
                    const releaseTimestamp = info.timestamp;
                    const duration = releaseTimestamp - pressTimestamp;

                    console.log(`[KigoChallenge kigo1 Release] Key: ${targetGyouKey}, Duration: ${duration}ms, isLongPressSuccess: ${isLongPressSuccess}, ExpectedCode: 0x${expectedFirstKeyCode.toString(16)}`);
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
                        // console.log("[KigoChallenge handleInput] Correct '=' 1st press. Setting showHighlightForEqualSign to false."); // 状態変数は使わない
                        clearEqualSignHighlightTimer(); // 既存のタイマーがあればクリア
                        console.log("[KigoChallenge handleInput] Setting timeout to re-enable highlight for '='.");
                        equalSignHighlightTimerRef.current = window.setTimeout(() => {
                            // タイマーが完了したら ref を null に戻す
                            console.log(`[KigoChallenge handleInput Timeout] Timeout fired. Current step: ${stateRef.current.currentStep}`);
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
            console.log(`[KigoChallenge handleInput] Input CORRECT. Updating state. shouldGoToNext: ${shouldGoToNext}`);
            setState(prev => ({
                ...prev,
                currentStep: nextStep,
                // 正解の場合のみ文字数を加算（仕様による）
                totalCharsTyped: prev.totalCharsTyped + (targetChar?.length ?? 0),
            }));

            if (shouldGoToNext) {
                console.log('[KigoChallenge handleInput] Correct sequence completed. Selecting next target.');
                setState(prev => ({
                    ...prev,
                    totalQuestions: prev.totalQuestions + 1,
                    correctAnswers: prev.correctAnswers + 1,
                }));
                selectNextTarget(); // 次の問題へ
            }
            return { isExpected: true, shouldGoToNext: false }; // App側での nextStage 呼び出しは不要
        } else {
            console.log('[KigoChallenge handleInput] Input INCORRECT.');
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
        console.log('[KigoChallenge] Resetting state.');
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

        // console.log(`[getHighlightClassName] State: status=${status}, targetGyouKey=${targetGyouKey}, targetLayerIndex=${targetLayerIndex}, targetType=${targetType}, currentStep=${currentStep}, layoutIndex=${layoutIndex}, keyName=${keyName}`);
        console.log(`[getHighlightClassName] State from ref: status=${status}, targetGyouKey=${targetGyouKey}, targetLayerIndex=${targetLayerIndex}, targetType=${targetType}, currentStep=${currentStep}, layoutIndex=${layoutIndex}, keyName=${keyName}`);

        if (status !== 'running' || targetLayerIndex === null) {
            // console.log('[getHighlightClassName] Return noHighlight: Not running or targetLayerIndex is null.'); // デバッグ用
            return noHighlight;
        }

        if (layoutIndex !== targetLayerIndex) {
            // console.log(`[getHighlightClassName] Return noHighlight: layoutIndex (${layoutIndex}) !== targetLayerIndex (${targetLayerIndex}).`); // デバッグ用
            return noHighlight;
        }

        let expectedKeyName: string | null = null;
        let expectedDisplayKeyName: string | null = null;

        // 修正: targetType ごとに分岐
        if (targetType === 'kigo1') { // レイヤー6
            expectedKeyName = targetGyouKey;
            expectedDisplayKeyName = expectedKeyName; // kigo1 は表示名そのまま
            if (keyName.trim() === expectedDisplayKeyName?.trim()) {
                console.log(`[getHighlightClassName] Highlight Match OK! Returning highlight for kigo1.`); // ログを修正
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
                console.log("[getHighlightClassName] Hiding highlight for '=' second press (waiting).");
                expectedDisplayKeyName = null; // ハイライトしない
            } else if (isEqualSign && currentStep === 1 && equalSignHighlightTimerRef.current === null) {
                console.log("[getHighlightClassName] Showing highlight for '=' second press (timer finished or initial).");
            }
        }


        // targetGyouKey が null の場合のチェックを追加 (特に kigo3 の '=' の場合など)
        // expectedKeyName が null になるのは、期待するキーがない場合（例：kigo1でステップ1など）
        if (expectedDisplayKeyName === null || expectedDisplayKeyName === undefined) { // undefined もチェック
            console.log(`[getHighlightClassName] Return noHighlight: expectedDisplayKeyName is null or undefined.`); // デバッグ用
            return noHighlight;
        }

        console.log(`[getHighlightClassName] Comparing: keyName="${keyName}" (${typeof keyName}), expectedDisplayKeyName="${expectedDisplayKeyName}" (${typeof expectedDisplayKeyName})`);

        if (keyName.trim() === expectedDisplayKeyName?.trim()) {
            console.log(`[getHighlightClassName] Highlight Match OK! Returning highlight.`);
            return { className: 'bg-blue-100', overrideKey: null };
        }
        /* // 不要になった詳細ログ
        if (layoutIndex === targetLayerIndex) {
             console.log(`[Highlight Match NG] keyName: "${keyName}" (${typeof keyName}), expectedKeyName: "${expectedKeyName}" (${typeof expectedKeyName}), layoutIndex: ${layoutIndex}`);
       }
        */

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
        targetChar: state.targetChar ?? undefined, // targetChar を追加
        isOkVisible: false, // isOkVisible を追加 (チャレンジ中は false 想定)
        // gyouKey, charIndex, step は PracticeHookResult にないので削除
    };
};

export default useKigoChallengePractice;
