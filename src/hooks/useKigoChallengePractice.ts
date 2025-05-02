// /home/coffee/my-keymap-viewer/src/hooks/useKigoChallengePractice.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // useMemo をインポート
import {
    PracticeHookProps,
    PracticeHookResult,
    PracticeInputInfo,
    ChallengeResult, // ChallengeResults -> ChallengeResult に修正
    PracticeHighlightResult, // PracticeHighlightResult をインポート
    HighlightInfo, // HighlightInfo をインポート
} from './usePracticeCommons';
import {
    kigoPractice1Data,
    kigoPractice2Data,
    kigoPractice3Data,
    kigoMapping2, // ★★★ インポート追加 ★★★
    kigoMapping3, // ★★★ インポート追加 ★★★
    // KigoPracticeSet, // 不要なインポートを削除
} from '../data/keymapData';
import { type } from 'os'; // このインポートは不要そうなので後で削除検討

// カウントダウン秒数
const LONG_PRESS_DURATION = 600; // 長押し判定時間 (ミリ秒) - useKigoPractice1.ts からコピー

// カウントダウン秒数
const COUNTDOWN_SECONDS = 5;

// 記号チャレンジモードの状態
interface KigoChallengeState {
    targetChar: string | null;
    targetGyouKey: string | null;
    targetLayerIndex: number | null; // ★★★ ターゲットレイヤーインデックスを追加 ★★★
    targetType: 'kigo1' | 'kigo2' | 'kigo3' | null; // どのデータセット由来か
    isEqualSign: boolean; // = キーが必要か
    currentStep: number; // 0: 初期状態, 1: 1打鍵目完了
    status: 'idle' | 'countdown' | 'running' | 'finished'; // ★★★ チャレンジステータスを追加 ★★★
    countdownValue: number; // ★★★ カウントダウン値を追加 ★★★
    startTime: number | null;
    endTime: number | null;
    totalQuestions: number;
    correctAnswers: number;
    totalCharsTyped: number; // 入力した総文字数（正誤問わず）
    challengeResults: ChallengeResult | null; // ChallengeResults -> ChallengeResult に修正
    isLongPressSuccess: boolean; // ★★★ 長押し成功フラグを追加 ★★★
}

// ★★★ initialState をコンポーネント外に移動 ★★★
const initialState: KigoChallengeState = {
    targetChar: null,
    targetGyouKey: null,
    targetLayerIndex: null, // ★★★ 初期値 null ★★★
    targetType: null,
    isEqualSign: false,
    currentStep: 0,
    status: 'idle', // ★★★ 初期ステータス ★★★
    countdownValue: COUNTDOWN_SECONDS, // ★★★ 初期カウントダウン値 ★★★
    startTime: null,
    endTime: null,
    totalQuestions: 0,
    correctAnswers: 0,
    totalCharsTyped: 0,
    challengeResults: null,
    isLongPressSuccess: false, // ★★★ 初期値 false ★★★
};


// 記号チャレンジモードのカスタムフック
const useKigoChallengePractice = (props: PracticeHookProps): PracticeHookResult => {
    const { isActive, okVisible, side, layers, kb } = props; // layers, kb を受け取る

    // ★★★ useState の初期値として initialState を使用 ★★★
    const [state, setState] = useState<KigoChallengeState>(initialState);
    const stateRef = useRef(state); // 常に最新の state を参照するための ref (useCallback 内で使う)
    // ★★★ 長押し判定用の ref を追加 ★★★
    const pressInfoRef = useRef<{ code: number; timestamp: number } | null>(null);
    const longPressTimerRef = useRef<number | null>(null);
    // ★★★ ここまで追加 ★★★

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
                    allKigoChars.push({ char, gyouKey: gyouKey, layerIndex: 2, type: 'kigo2', isEqualSign: false }); // type を 'kigo2' に、isEqualSign を false に修正
                });
            });
            // ★★★ kigoPractice3Data (layerIndex: 8) を追加 ★★★
            kigoPractice3Data.forEach(group => {
                group.chars.forEach((char, index) => {
                    const isEqualSign = char === '＝'; // ★★★ 修正: '=' ではなく '＝' ★★★
                    // '=' の場合は gyouKey は null、それ以外は inputDef から取得
                    const gyouKey = isEqualSign ? null : (group.inputs[index]?.gyouKey ?? null);
                    // ★★★ layerIndex を 8 に修正 ★★★
                    allKigoChars.push({ char, gyouKey: gyouKey, layerIndex: 8, type: 'kigo3', isEqualSign: isEqualSign });
                });
            });
            console.log('[KigoChallenge] Initialized allKigoChars:', allKigoChars); // 必要ならコメント解除
        }
    }, [allKigoChars]); // allKigoChars は ref なので依存配列は初回のみ実行される
    // ★★★ selectNextTarget を useCallback でメモ化 ★★★
    // 次のターゲットを選択する関数
    // ★★★ タイマークリア処理を追加 ★★★
    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current !== null) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);
    // ★★★ ここまで追加 ★★★

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
            targetLayerIndex: selected.layerIndex, // ★★★ レイヤーインデックスを設定 ★★★
            targetType: selected.type,
            isEqualSign: selected.isEqualSign,
            currentStep: 0, // ステップをリセット
            isLongPressSuccess: false, // ★★★ 長押し状態をリセット ★★★
        }));
        // ★★★ ターゲット変更時にタイマーと押下情報をクリア ★★★
        pressInfoRef.current = null;
        clearLongPressTimer();
    }, [allKigoChars, clearLongPressTimer]); // clearLongPressTimer を依存配列に追加
    // ★★★ startChallenge を useCallback でメモ化 ★★★
    // チャレンジ開始/リセット処理
    const startChallenge = useCallback(() => {
        console.log('[KigoChallenge] Starting challenge... Setting status to countdown.');
        setState({ // initialState を直接使う
            ...initialState, // スプレッド構文で initialState の全プロパティを展開
            status: 'countdown', // ★★★ ステータスをカウントダウンに ★★★
            countdownValue: COUNTDOWN_SECONDS, // ★★★ カウントダウン値をリセット ★★★
            startTime: null, // ★★★ startTime はまだ設定しない ★★★
            endTime: null,
            challengeResults: null,
            isLongPressSuccess: false, // ★★★ 長押し状態をリセット ★★★
        });
        // selectNextTarget(); // ★★★ ターゲット選択はカウントダウン後に移動 ★★★
        // ★★★ 開始時にもタイマーと押下情報をクリア ★★★
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
                // ★★★ カウントダウン中もタイマークリア処理を追加 ★★★
                return () => clearTimeout(timerId);
            } else {
                console.log('[KigoChallenge] Countdown finished. Setting status to running.');
                setState(prev => ({
                    ...prev,
                    status: 'running',
                    startTime: Date.now(), // ★★★ カウントダウン終了時に startTime を設定 ★★★
                    // ★★★ ターゲット選択は status が running になってから行う ★★★
                }));
            }
        }
    }, [isActive, state.status, state.countdownValue]); // selectNextTarget は不要

    // ★★★ status が running になったら最初のターゲットを選択する useEffect を追加 ★★★
    useEffect(() => {
        if (state.status === 'running' && !state.targetChar) { // ターゲットがまだない場合のみ
            console.log('[KigoChallenge] Status is running, selecting initial target.');
            selectNextTarget();
        }
    }, [state.status, selectNextTarget, state.targetChar]); // state.targetChar も依存配列に追加
    // ★★★ ここまで追加 ★★★

    // ★★★ finishChallenge を useCallback でメモ化 ★★★
    // チャレンジ終了処理
    const finishChallenge = useCallback(() => {
        const now = Date.now();
        // ★★★ stateRef ではなく state を使う ★★★
        const { startTime, totalQuestions, correctAnswers, totalCharsTyped } = state;
        const durationSeconds = startTime ? (now - startTime) / 1000 : 0;


        console.log('[KigoChallenge] Finishing challenge. State from ref:', stateRef.current);

        if (durationSeconds <= 0 || totalQuestions === 0) {
            console.warn("[KigoChallenge] Cannot calculate results: duration or totalQuestions is zero.");
            setState(prev => ({
                ...prev,
                endTime: now,
                status: 'finished', // ★★★ ステータスを終了に ★★★
                challengeResults: {
                    totalQuestions: 0,
                    // correctAnswers -> correctCount に修正
                    correctCount: 0,
                    missCount: 0, // missCount を追加
                    totalCharsTyped: 0,
                    accuracy: 0,
                    score: 0, // ★★★ score: 0 を追加 ★★★
                    rankMessage: "記録なし",
                }
            }));
            return;
        }

        const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
        // missCount を計算
        const missCount = totalQuestions - correctAnswers;
        // スコア計算: (正答数 * 精度) を基本とし、時間経過で少し減点（仮）
        // const score = Math.max(0, Math.round((correctAnswers * accuracy * 10) - (durationSeconds / 10)));
        // スコア計算: 正答数 * 精度 * 10 を基本とする
        const score = Math.round(correctAnswers * accuracy * 10);


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
            status: 'finished', // ★★★ ステータスを終了に ★★★
            challengeResults: results,
            targetChar: null, // ターゲットをクリア
            targetGyouKey: null,
            targetLayerIndex: null,
        }));
    // ★★★ state の主要な値を依存配列に追加 ★★★
    // ★★★ タイマークリア処理を追加 ★★★
    clearLongPressTimer();
    }, [state.startTime, state.totalQuestions, state.correctAnswers, state.totalCharsTyped, clearLongPressTimer]); // clearLongPressTimer を追加

    // 60秒タイマー
    useEffect(() => {
        // ★★★ 開始条件を status === 'running' に変更 ★★★
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
    // ★★★ finishChallenge, clearLongPressTimer を依存配列に追加 ★★★
    }, [isActive, state.status, state.startTime, state.endTime, finishChallenge]);

    // 練習モードがアクティブになったらチャレンジ開始
    useEffect(() => {
        // ★★★ status が idle の場合のみ startChallenge を呼ぶ ★★★
        if (isActive && state.status === 'idle') {
            startChallenge(); // useCallback でメモ化された関数を呼ぶ
        } else if (!isActive && state.status !== 'idle') { // ★★★ 非アクティブかつアイドル状態でない場合のみリセット ★★★
            console.log('[KigoChallenge] Practice deactivated, resetting state.');
            setState(initialState); // initialState に戻す
            // ★★★ 非アクティブ時にもタイマーと押下情報をクリア ★★★
            pressInfoRef.current = null;
            clearLongPressTimer();
        }
    // ★★★ startChallenge を依存配列に追加 ★★★
    }, [isActive, state.status, startChallenge, clearLongPressTimer]); // clearLongPressTimer を追加

    // 入力処理
    const handleInput = useCallback((info: PracticeInputInfo): { isExpected: boolean; shouldGoToNext: boolean } => {

        const { targetChar, targetGyouKey, targetLayerIndex, isEqualSign, currentStep, targetType } = stateRef.current; // targetType も取得
        // ★★★ 長押し成功フラグも取得 ★★★
        const { isLongPressSuccess } = stateRef.current;
        const pressCode = info.pressCode;

        // --- Helper function definitions (moved here) ---
        // キー名からキーコード（インデックス+1）を取得するヘルパー関数
        // ★★★ targetLayerIndex を引数に追加 ★★★
        const findKeyCode = (keyName: string | null, layerIdx: number | null): number => {
            if (!keyName) return -1;
            const expectedLayer = layerIdx ?? -1; // Use targetLayerIndex from outer scope
            if (expectedLayer === -1 || !layers[expectedLayer]) return -1;

            if (expectedLayer === 6) {
                const index = (layers[6] ?? []).indexOf(keyName);
                return index !== -1 ? index + 1 : -1;
            }
            const index = (layers[2] ?? []).indexOf(keyName);
            // ★★★ レイヤー8も検索対象に追加 ★★★
            const index8 = (layers[8] ?? []).indexOf(keyName);
            return index !== -1 ? index + 1 : (index8 !== -1 ? index8 + 1 : -1);
        };
        // kigoPractice1 (レイヤー6) の場合のキーコード取得ロジック修正
        const getExpectedKeyCodeForKigo1 = (): number => {
            return findKeyCode(targetGyouKey, 6); // ★★★ targetLayerIndex を渡す ★★★
        };
        // kigoPractice2/3 (レイヤー2) の場合のキーコード取得ロジック
        const getExpectedKeyCodeForKigo2 = (keyName: string | null): number => {
             return findKeyCode(keyName, 2); // ★★★ targetLayerIndex を渡す ★★★
        };
        // kigoPractice3 の '記号' キーのコードを取得
        const getKigoKeyCodeForKigo3 = (): number => {
            return findKeyCode('＝\n記号', 8); // ★★★ キー名と targetLayerIndex を修正 ★★★
        };
        const getExpectedKeyCodeForKigo3Gyou = (keyName: string | null): number => findKeyCode(keyName, 8); // ★★★ kigo3 の行キー用ヘルパー ★★★
        // --- End of helper function definitions ---

        // ★★★ Press イベントの処理を追加 (kigo1 の長押しタイマー開始) ★★★
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
        // ★★★ ここまで Press イベント処理追加 ★★★

        // ★★★ 開始条件を status === 'running' に変更 (Release イベントのみチェック) ★★★
        if (stateRef.current.status !== 'running' || !targetChar) {
            console.log('[KigoChallenge handleInput] Ignoring release input: challenge ended or no target.');
            return { isExpected: false, shouldGoToNext: false };
        }

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
        const expectedGyouKeyCode = findKeyCode(targetGyouKey, targetLayerIndex); // これは kigo2/3 の行キー用 ★★★ targetLayerIndex を渡す ★★★
        const expectedEqualKeyCode = findKeyCode('＝\n記号', 8); // これは kigo3 の '=' 用 (1打目) ★★★ キー名と targetLayerIndex を修正 ★★★
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
                // ★★★ 押下情報と長押し状態をリセット ★★★
                pressInfoRef.current = null;
                setState(prev => ({ ...prev, isLongPressSuccess: false }));
                // ★★★ ここまで kigo1 修正 ★★★

            // --- kigo2, kigo3 の1打鍵目 (変更なし) ---
            } else if (targetType === 'kigo2') { // レイヤー2 (行キー -> 記号キー)
                expectedFirstKeyCode = getExpectedKeyCodeForKigo2(targetGyouKey); // ★★★ ヘルパー関数名変更 ★★★
                if (pressCode === expectedFirstKeyCode) {
                    isCorrectInput = true;
                    nextStep = 1; // 2打鍵目待ち
                }
            } else if (targetType === 'kigo3') { // レイヤー2 (記号キー -> 行キー or 記号キー -> 記号キー)
                expectedFirstKeyCode = getKigoKeyCodeForKigo3();
                if (pressCode === expectedFirstKeyCode) {
                    isCorrectInput = true;
                    nextStep = 1; // 2打鍵目待ち
                }
            }
        }
        // 2打鍵目の評価 (kigo2, kigo3) (変更なし)
        else if (currentStep === 1) {
            // ★★★ kigo2 は '記号' キー、kigo3 は '=' なら '＝\n記号'、それ以外は行キー ★★★
            expectedSecondKeyCode = (targetType === 'kigo2') ? findKeyCode('記号', 2) : // kigo2 の2打目はレイヤー2の'記号'
                                   (isEqualSign ? getKigoKeyCodeForKigo3() : // kigo3 の '=' なら '＝\n記号'
                                   getExpectedKeyCodeForKigo3Gyou(targetGyouKey)); // kigo3 のそれ以外はレイヤー8の行キー
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
            selectNextTarget(); // 不正解でも次の問題へ進む場合
            */
            // 不正解の場合、問題を変えずにステップのみリセット
            setState(prev => ({
                ...prev,
                currentStep: 0, // ステップをリセット
                // 不正解でも問題数をカウントする場合（ただし、正解するまでカウントしない方が良いかも）
                // totalQuestions: prev.totalQuestions + 1,
            }));

            return { isExpected: false, shouldGoToNext: false };
        }

    }, [layers, selectNextTarget, clearLongPressTimer, stateRef]); // stateRef を依存配列に追加

    // リセット処理
    const reset = useCallback(() => {
        console.log('[KigoChallenge] Resetting state.');
        setState(initialState); // ★★★ initialState に戻す ★★★
        // startChallenge(); // ★★★ reset では開始しない ★★★
        // ★★★ リセット時にもタイマーと押下情報をクリア ★★★
        pressInfoRef.current = null;
        clearLongPressTimer();
    }, [clearLongPressTimer]); // initialState は外部スコープなので依存配列は空, clearLongPressTimer を追加
    // ★★★ clearLongPressTimer を依存配列に追加 ★★★

    // ヘッダー表示用の文字配列
    const headingChars = useMemo(() => {
        // ★★★ status に応じて表示を切り替え ★★★
        if (state.status === 'countdown') {
            return [`${state.countdownValue}秒`];
        } else if (state.status === 'finished' && state.challengeResults) {
            // 終了メッセージを表示
            return [`終了！ スコア: ${state.challengeResults.score}`];
        } else if (state.status === 'running' && state.targetChar) {
            // 現在のターゲット文字を表示
            return [state.targetChar];
        }
        return ['読み込み中...'];
    // ★★★ state の関連プロパティを依存配列に追加 ★★★
    }, [state.status, state.countdownValue, state.targetChar, state.challengeResults]);

    // ★★★ 逆引き用のマップを作成 (useMemo でキャッシュ) ★★★
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
        // ★★★ state のプロパティを直接参照 ★★★
        // ★★★ isLongPressSuccess も取得 ★★★
        const { status, targetGyouKey, targetLayerIndex, isEqualSign, currentStep, targetType } = state;

        // ★★★ デバッグログ修正：state の値を確認 ★★★
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
        // ★★★ 逆引き処理を削除 ★★★

        let expectedKeyName: string | null = null;
        let expectedDisplayKeyName: string | null = null; // ★★★ 表示名用の変数を追加 ★★★

        // 修正: targetType ごとに分岐
        if (targetType === 'kigo1') { // レイヤー6
            // ★★★ 長押し判定中もハイライト & 表示名設定 ★★★
            expectedKeyName = targetGyouKey;
            expectedDisplayKeyName = expectedKeyName; // kigo1 は表示名そのまま
            if (keyName === expectedDisplayKeyName) { // ★★★ 表示名で比較 ★★★
                return { className: state.isLongPressSuccess ? 'bg-green-200' : 'bg-blue-100', overrideKey: null };
            }
        } else if (targetType === 'kigo2') { // レイヤー2 (行キー -> 記号キー)
            if (currentStep === 0) {
                expectedKeyName = targetGyouKey; // 例: 'あ行'
                expectedDisplayKeyName = kigoMapping2[expectedKeyName ?? ''] ?? expectedKeyName; // ★★★ 表示名に変換 (例: '＋') ★★★
            } else if (currentStep === 1) {
                expectedKeyName = '記号';
                expectedDisplayKeyName = expectedKeyName; // '記号' キーはそのまま
            }
        } else if (targetType === 'kigo3') { // レイヤー2 (記号キー -> 行キー or 記号キー -> 記号キー)
            if (currentStep === 0) {
                expectedKeyName = '＝\n記号'; // ★★★ 修正済み ★★★
                expectedDisplayKeyName = expectedKeyName; // kigo3 は表示名そのまま
            } else if (currentStep === 1) {
                // ★★★ 修正: isEqualSign が false の場合、targetGyouKey ではなく targetChar を使う ★★★
                expectedKeyName = isEqualSign ? '記号' : state.targetChar; // targetChar を参照
                expectedDisplayKeyName = expectedKeyName; // kigo3 は表示名そのまま
            }
        }

        // targetGyouKey が null の場合のチェックを追加 (特に kigo3 の '=' の場合など)
        // expectedKeyName が null になるのは、期待するキーがない場合（例：kigo1でステップ1など）
        // ★★★ expectedDisplayKeyName でチェック ★★★
        if (expectedDisplayKeyName === null || expectedDisplayKeyName === undefined) { // undefined もチェック
            console.log(`[getHighlightClassName] Return noHighlight: expectedDisplayKeyName is null or undefined.`); // デバッグ用
            return noHighlight;
        }

        // ★★★ 比較前のログを追加 ★★★
        console.log(`[getHighlightClassName] Comparing: keyName="${keyName}" (${typeof keyName}), expectedDisplayKeyName="${expectedDisplayKeyName}" (${typeof expectedDisplayKeyName})`);

        // ★★★ 比較対象を originalKeyName に変更 ★★★
        if (keyName === expectedDisplayKeyName) { // ★★★ 表示名で比較 ★★★
            // ★★★ デバッグログ追加：一致した場合 ★★★
            console.log(`[getHighlightClassName] Highlight Match OK! Returning highlight.`);
            return { className: 'bg-blue-100', overrideKey: null };
        }
        // ★★★ ログの比較対象も originalKeyName に変更 ★★★
        /* // 不要になった詳細ログ
        if (layoutIndex === targetLayerIndex) {
             console.log(`[Highlight Match NG] keyName: "${keyName}" (${typeof keyName}), expectedKeyName: "${expectedKeyName}" (${typeof expectedKeyName}), layoutIndex: ${layoutIndex}`);
       }
        */

        return noHighlight;
    // ★★★ reverseKigoMapping3 を依存配列に追加 ★★★
    // ★★★ 修正: state の関連プロパティを依存配列に追加 ★★★
    }, [
        // layers, // layers は displayLayers で使うのでここでは不要かも
        // reverseKigoMapping2, // 逆引きマップは不要になった
        // reverseKigoMapping3,
        state.status, // status の変更を検知
        // ★★★ state のプロパティを直接参照するように修正 ★★★
        state.targetLayerIndex, // targetLayerIndex の変更を検知
        state.currentStep, // currentStep の変更を検知
        state.targetGyouKey, // targetGyouKey の変更を検知
        state.targetType, // targetType の変更を検知
        state.isEqualSign, // isEqualSign も比較に使っているので追加
        state.isLongPressSuccess, // ★★★ 長押し状態も依存配列に追加 ★★★
        state.targetChar, // ★★★ targetChar を依存配列に追加 ★★★
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
            // ★★★ findKeyCode ヘルパー関数を isInvalidInputTarget 内に移動またはアクセス可能にする ★★★
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
                // ★★★ 修正: layers[6] は string[] なので indexOf を使う ★★★
                // const index = (layers[6] ?? []).indexOf(expectedKeyName ?? '');
                // return index !== -1 ? index + 1 : -1;
            } else if (targetType === 'kigo2') {
                if (currentStep === 0) expectedKeyName = targetGyouKey;
                else if (currentStep === 1) expectedKeyName = '記号';
            } else if (targetType === 'kigo3') {
                if (currentStep === 0) expectedKeyName = '＝\n記号'; // ★★★ 修正 ★★★
                else if (currentStep === 1) expectedKeyName = isEqualSign ? '記号' : targetGyouKey;
            }

            // ★★★ findKeyCodeLocal を使用 ★★★
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

    // ★★★ 表示用レイヤーデータを生成する useMemo を追加 ★★★
    const displayLayers = useMemo(() => {
        const { targetType, targetLayerIndex } = state;

        // ★★★ kigo2 でターゲットレイヤーが 2 の場合のみ加工 ★★★
        if (targetType === 'kigo2' && targetLayerIndex === 2) {
            const originalLayer2 = layers[2] ?? [];
            const modifiedLayer2 = originalLayer2.map(keyName => {
                // kigoMapping2 または kigoMapping3 にキーが存在すれば記号に置換
                if (targetType === 'kigo2' && kigoMapping2[keyName]) {
                    return kigoMapping2[keyName];
                }
                // ★★★ kigo3 のマッピングはここでは不要 ★★★
                // if (targetType === 'kigo3' && kigoMapping3[keyName]) {
                //     // kigoMapping3 は改行を含む場合があるので、最初の文字だけ取る（例: '＝\n記号' -> '＝'）
                //     return kigoMapping3[keyName].split('\n')[0];
                // }
                // 機能キーなどはそのまま返す
                return keyName;
            });
            // 元の layers をコピーして、layer[2] だけ差し替える
            const newLayers = [...layers];
            newLayers[2] = modifiedLayer2;
            return newLayers;
        }
        // ★★★ それ以外 (kigo1, kigo3 含む) の場合は元の layers を返す ★★★
        return layers;
    }, [state.targetType, state.targetLayerIndex, layers]); // layers も依存配列に追加

    return {
        handleInput,
        reset,
        headingChars,
        getHighlightClassName, // highlightedKeys -> getHighlightClassName
        isInvalidInputTarget,
        getHighlight, // getHighlight を追加
        targetLayerIndex: state.targetLayerIndex, // ★★★ App.tsx に渡す ★★★
        displayLayers, // ★★★ 表示用レイヤーデータを渡す ★★★
        challengeResults: state.challengeResults, // ★★★ 結果を渡す ★★★
        // 以下は KigoChallenge では直接使わないかもしれないが一応返す
        targetChar: state.targetChar ?? undefined, // targetChar を追加
        isOkVisible: false, // isOkVisible を追加 (チャレンジ中は false 想定)
        // gyouKey, charIndex, step は PracticeHookResult にないので削除
    };
};

export default useKigoChallengePractice;
