// /home/coffee/my-keymap-viewer/src/App.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HIDDevice, HIDInputReportEvent } from './types/hid'; // パス修正済み
import {
    sampleJson,
    layerNames,
    gyouList,
    danOrder,
    youonGyouList,
    youonGyouChars,
    dakuonGyouList,
    dakuonGyouChars,
    handakuonGyouList,
    handakuonGyouChars,
    sokuonKomojiData,
    kigoPractice1Data,
    kigoPractice2Data,
    kigoPractice3Data,
    youdakuonPracticeData,
    youhandakuonPracticeData,
    functionKeyMaps,
    youonKakuchoChars,
    gairaigoPracticeData,
    basicPracticeMenuItems, // PracticeMenu で使うためインポート
    stepUpPracticeMenuItems, // PracticeMenu で使うためインポート
    challengeMenuItems, // PracticeMenu で使うためインポート
    gyouChars, // calculateNextIndices で使用
    youonDanMapping, // calculateNextIndices で使用
    dakuonDanMapping, // calculateNextIndices で使用
    handakuonDanMapping, // calculateNextIndices で使用
    youdakuonDanMapping, // calculateNextIndices で使用
    youhandakuonDanMapping, // calculateNextIndices で使用
} from './data/keymapData';
import {
    PracticeMode,
    PracticeInputInfo,
    PracticeHookProps,
    PracticeHookResult,
    KeyboardSide,
    KeyboardModel,
    PracticeStatus // PracticeHeading に渡すためインポート
} from './hooks/usePracticeCommons';
import useSeionPractice from './hooks/useSeionPractice';
import useYouonPractice from './hooks/useYouonPractice';
import useDakuonPractice from './hooks/useDakuonPractice';
import useHandakuonPractice from './hooks/useHandakuonPractice';
import useSokuonKomojiPractice from './hooks/useSokuonKomojiPractice';
import useKigoPractice1 from './hooks/useKigoPractice1';
import useKigoPractice2 from './hooks/useKigoPractice2';
import useKigoPractice3 from './hooks/useKigoPractice3';
import useYoudakuonPractice from './hooks/useYoudakuonPractice';
import useYouhandakuonPractice from './hooks/useYouhandakuonPractice';
import useYouonKakuchoPractice from './hooks/useYouonKakuchoPractice';
import useGairaigoPractice from './hooks/useGairaigoPractice';
import useKanaChallengePractice from './hooks/useKanaChallengePractice';
import useKigoChallengePractice from './hooks/useKigoChallengePractice';
import useTanbunChallengePractice from './hooks/useTanbunChallengePractice';


// 作成したコンポーネントをインポート
import PracticeMenu from './components/PracticeMenu';
import PracticeHeading from './components/PracticeHeading';
import KeyboardLayout from './components/KeyboardLayout';

export default function App() {
    /* UI 状態 */
    const [layers, setLayers] = useState<string[][]>([]);
    const [title, setTitle] = useState('TW-20H レイアウト');
    const [fw, setFW] = useState<string | null>(null);
    const [sn, setSN] = useState<string | null>(null);
    const [cols, setCols] = useState(5);
    const [training, setTraining] = useState(false);
    const [practice, setPractice] = useState<PracticeMode>('');
    const [showTrainingButton, setShowTrainingButton] = useState(false);
    const [side, setSide] = useState<KeyboardSide>('right');
    const [kb, setKb] = useState<KeyboardModel>('tw-20v');
    const [showKeyLabels, setShowKeyLabels] = useState(true);
    const [isRandomMode, setIsRandomMode] = useState(false);


    /* 現在の行/段/文字インデックス */
    const [gIdx, setGIdx] = useState(0); // 初期値は 0 に戻す
    const [dIdx, setDIdx] = useState(0); // 初期値は 0 に戻す

    /* UIフィードバック */
    // okVisible と okTimerRef を削除
    const [lastInvalidKeyCode, setLastInvalidKeyCode] = useState<number | null>(null);

    /* HID / カウンタ */
    const devRef = useRef<HIDDevice | null>(null);
    const opening = useRef(false);
    const invalidInputTimeoutRef = useRef<number | null>(null);
    const pressedKeysRef = useRef<Map<number, number>>(new Map());
    const lastInvalidInputTime = useRef<number>(0);

    const trainingRef = useRef(training);
    const practiceRef = useRef(practice);
    const activePracticeRef = useRef<PracticeHookResult | null>(null); // activePractice は useMemo の結果
    const gIdxRef = useRef(gIdx);
    const dIdxRef = useRef(dIdx);

    // --- カスタムフックの呼び出し ---
    const commonHookProps: PracticeHookProps = useMemo(() => ({
        gIdx, dIdx, isActive: false, side, layers, kb, isRandomMode // okVisible を削除
    }), [gIdx, dIdx, side, layers, kb, isRandomMode]); // okVisible を依存配列から削除

    // 各練習フックの呼び出し
    const seionPractice = useSeionPractice({ ...commonHookProps, isActive: practice === '清音の基本練習' });
    const youonPractice = useYouonPractice({ ...commonHookProps, isActive: practice === '拗音の基本練習' });
    const dakuonPractice = useDakuonPractice({ ...commonHookProps, isActive: practice === '濁音の基本練習' });
    const handakuonPractice = useHandakuonPractice({ ...commonHookProps, isActive: practice === '半濁音の基本練習' });
    const sokuonKomojiPractice = useSokuonKomojiPractice({ ...commonHookProps, isActive: practice === '小文字(促音)の基本練習' });
    const kigoPractice1 = useKigoPractice1({ ...commonHookProps, isActive: practice === '記号の基本練習１', layers });
    const kigoPractice2 = useKigoPractice2({ ...commonHookProps, isActive: practice === '記号の基本練習２' });
    const kigoPractice3 = useKigoPractice3({ ...commonHookProps, isActive: practice === '記号の基本練習３' });
    const youdakuonPractice = useYoudakuonPractice({ ...commonHookProps, isActive: practice === '拗濁音の練習' });
    const youhandakuonPractice = useYouhandakuonPractice({ ...commonHookProps, isActive: practice === '拗半濁音の練習' });
    const youonKakuchoPractice = useYouonKakuchoPractice({ ...commonHookProps, isActive: practice === '拗音拡張' });
    const gairaigoPractice = useGairaigoPractice({ ...commonHookProps, isActive: practice === '外来語の発音補助' });
    const kanaChallengePractice = useKanaChallengePractice({ ...commonHookProps, isActive: practice === 'かな入力１分間トレーニング' });
    const kigoChallengePractice = useKigoChallengePractice({ ...commonHookProps, isActive: practice === '記号入力１分間トレーニング' });
    const tanbunChallengePractice = useTanbunChallengePractice({ ...commonHookProps, isActive: practice === '短文入力３分間トレーニング' });


    // --- 現在アクティブな練習フックを選択 ---
    const activePractice: PracticeHookResult | null = useMemo(() => {
        switch (practice) {
            case '清音の基本練習': return seionPractice;
            case '拗音の基本練習': return youonPractice;
            case '濁音の基本練習': return dakuonPractice;
            case '半濁音の基本練習': return handakuonPractice;
            case '小文字(促音)の基本練習': return sokuonKomojiPractice;
            case '記号の基本練習１': return kigoPractice1;
            case '記号の基本練習２': return kigoPractice2;
            case '記号の基本練習３': return kigoPractice3;
            case '拗濁音の練習': return youdakuonPractice;
            case '拗半濁音の練習': return youhandakuonPractice;
            case '拗音拡張': return youonKakuchoPractice;
            case '外来語の発音補助': return gairaigoPractice;
            case 'かな入力１分間トレーニング': return kanaChallengePractice; // ← 修正: 正しいフックを返す
            case '記号入力１分間トレーニング': return kigoChallengePractice; // ← 修正: 正しいフックを返す
            case '短文入力３分間トレーニング': return tanbunChallengePractice; // ← 修正: 正しいフックを返す
            default: return null; // default ケースを追加して null を返す
                }
    }, [practice, seionPractice, youonPractice, dakuonPractice, handakuonPractice, sokuonKomojiPractice, kigoPractice1, kigoPractice2, kigoPractice3, youdakuonPractice, youhandakuonPractice, youonKakuchoPractice, gairaigoPractice, kanaChallengePractice, kigoChallengePractice, tanbunChallengePractice]);

    const isChallengeFinished = useMemo(() => {
        return (practice === 'かな入力１分間トレーニング' || practice === '記号入力１分間トレーニング' || practice === '短文入力３分間トレーニング') && !!activePractice?.challengeResults;
    }, [practice, activePractice]);

    useEffect(() => {
        trainingRef.current = training;
    }, [training]);

    useEffect(() => {
        practiceRef.current = practice;
    }, [practice]);

    useEffect(() => {
        activePracticeRef.current = activePractice;
    }, [activePractice]);
    useEffect(() => { gIdxRef.current = gIdx; }, [gIdx]);
    useEffect(() => { dIdxRef.current = dIdx; }, [dIdx]);

    // キーボード表示の固定幅 (変更なし)
    const keyWidthRem = 5.5;
    const fixedWidthNum = cols * keyWidthRem;
    const fixedWidth = `${fixedWidthNum}rem`;

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    // --- 不正入力処理 --- (依存配列修正済み)
    const handleInvalidInput = useCallback((pressCode: number) => {
        const now = Date.now();
        if (now - lastInvalidInputTime.current < 50) {
            return;
        }
        lastInvalidInputTime.current = now;
        setLastInvalidKeyCode(pressCode);

        if (invalidInputTimeoutRef.current !== null) {
            clearTimeout(invalidInputTimeoutRef.current);
        }

        const invalidHighlightDuration = showKeyLabels ? 500 : 0; // キー表示OFFなら0ms

        const timerId = window.setTimeout((codeToClear: number) => {
            setLastInvalidKeyCode(prevCode => {
                if (prevCode === codeToClear) {
                    return null;
                }
                return prevCode;
            });
            invalidInputTimeoutRef.current = null;
        }, invalidHighlightDuration, pressCode); // showKeyLabels に応じた時間に変更
        invalidInputTimeoutRef.current = timerId;
    }, [showKeyLabels]); // showKeyLabels を依存配列に追加

    // 次の練習ステージに進む関数
    const calculateNextIndices = (currentGIdx: number, currentDIdx: number, isRandomMode: boolean, practiceMode: PracticeMode) => {
        let nextGIdx = currentGIdx;
        let nextDIdx = currentDIdx + 1; // 基本は現在の dIdx + 1

        // console.log(`[calculateNextIndices] Start. currentGIdx=${currentGIdx}, currentDIdx=${currentDIdx}, isRandomMode=${isRandomMode}, practiceMode=${practiceMode}`);

        if (practiceMode === '清音の基本練習') {
            const currentGyouKey = gyouList[currentGIdx];
            const list = danOrder[currentGyouKey];
            const charsForGyou = gyouChars[currentGyouKey];
            // console.log(`[calculateNextIndices Seion] currentGyouKey=${currentGyouKey}, list=${list}, charsForGyou=${charsForGyou}, dIdx=${dIdx}`);
            if (list && charsForGyou) {
                if (currentDIdx >= charsForGyou.length - 1) { // 現在の行の最後の文字か？
                    nextGIdx = currentGIdx + 1;
                    nextDIdx = 0;
                    if (nextGIdx >= gyouList.length) {
                        nextGIdx = 0;
                    }
                } else {
                    // nextDIdx は既に currentDIdx + 1 になっているので何もしない
                }
            }
        } else if (practiceMode === '拗音の基本練習') {
            const currentGyouKey = youonGyouList[currentGIdx];
            const danListForGyou = youonDanMapping[currentGyouKey];
            if (danListForGyou) {
                if (currentDIdx >= danListForGyou.length - 1) {
                    nextGIdx = currentGIdx + 1;
                    nextDIdx = 0;
                    if (nextGIdx >= youonGyouList.length) {
                        nextGIdx = 0;
                    }
                } else {
                    // nextDIdx は既に currentDIdx + 1 になっているので何もしない
                }
            }
        } else if (practiceMode === '濁音の基本練習') {
            const currentGyouKey = dakuonGyouList[currentGIdx];
            const danListForGyou = dakuonDanMapping[currentGyouKey];
            if (danListForGyou) {
                if (currentDIdx >= danListForGyou.length - 1) {
                    nextGIdx = currentGIdx + 1;
                    nextDIdx = 0;
                    if (nextGIdx >= dakuonGyouList.length) {
                        nextGIdx = 0;
                    }
                } else {
                    // nextDIdx は既に currentDIdx + 1 になっているので何もしない
                }
            }
        } else if (practiceMode === '半濁音の基本練習') {
            const currentGyouKey = handakuonGyouList[currentGIdx]; // 常に 'は行'
            const danListForGyou = handakuonDanMapping[currentGyouKey];
            if (danListForGyou) {
                if (currentDIdx >= danListForGyou.length - 1) {
                    // 半濁音は「は行」のみなので、次は最初のグループに戻る
                    nextGIdx = 0;
                    nextDIdx = 0;
                } else {
                    // nextDIdx は既に currentDIdx + 1 になっているので何もしない
                }
            }
        } else if (practiceMode === '小文字(促音)の基本練習') {
            const group = sokuonKomojiData[currentGIdx];
            if (group) {
                const maxDIdx = group.chars.length - 1;
                if (currentDIdx >= maxDIdx) {
                    nextGIdx = currentGIdx + 1;
                    nextDIdx = 0;
                    if (nextGIdx >= sokuonKomojiData.length) {
                        nextGIdx = 0;
                    }
                } else {
                    // nextDIdx は既に currentDIdx + 1 になっているので何もしない
                }
            }
        } else if (practiceMode === '記号の基本練習１') {
            const group = kigoPractice1Data[currentGIdx];
            if (group) {
                const maxDIdx = group.chars.length - 1;
                if (currentDIdx >= maxDIdx) {
                    nextGIdx = currentGIdx + 1;
                    nextDIdx = 0;
                    if (nextGIdx >= kigoPractice1Data.length) {
                        nextGIdx = 0;
                    }
                } else {
                    // nextDIdx は既に currentDIdx + 1 になっているので何もしない
                }
            }
        } else if (practiceMode === '記号の基本練習２') {
            const group = kigoPractice2Data[currentGIdx];
            if (group) {
                const maxDIdx = group.chars.length - 1;
                if (currentDIdx >= maxDIdx) {
                    nextGIdx = currentGIdx + 1;
                    nextDIdx = 0;
                    if (nextGIdx >= kigoPractice2Data.length) {
                        nextGIdx = 0;
                    }
                } else {
                    // nextDIdx は既に currentDIdx + 1 になっているので何もしない
                }
            }
        } else if (practiceMode === '記号の基本練習３') {
            const group = kigoPractice3Data[currentGIdx];
            if (group) {
                const maxDIdx = group.chars.length - 1;
                if (currentDIdx >= maxDIdx) {
                    nextGIdx = currentGIdx + 1;
                    nextDIdx = 0;
                    if (nextGIdx >= kigoPractice3Data.length) {
                        nextGIdx = 0;
                    }
                } else {
                    // nextDIdx は既に currentDIdx + 1 になっているので何もしない
                }
            }
        } else if (practiceMode === '拗濁音の練習') {
            const youdakuonGyouKeys = Object.keys(youdakuonPracticeData); // 行名のリストを取得
            const currentGyouKey = youdakuonGyouKeys[currentGIdx];
            const danListForGyou = youdakuonDanMapping[currentGyouKey];
            if (danListForGyou) {
                if (currentDIdx >= danListForGyou.length - 1) {
                    nextGIdx = currentGIdx + 1;
                    nextDIdx = 0;
                    if (nextGIdx >= youdakuonGyouKeys.length) {
                        nextGIdx = 0;
                    }
                } else {
                    // nextDIdx は既に currentDIdx + 1 になっているので何もしない
                }
            }
        } else if (practiceMode === '拗半濁音の練習') {
            // 拗半濁音は「は行」のみ
            const currentGyouKey = 'は行';
            const danListForGyou = youhandakuonDanMapping[currentGyouKey];
            if (currentDIdx >= danListForGyou.length - 1) {
                nextGIdx = 0; // 最初のグループに戻る
                nextDIdx = 0;
            } else {
                // nextDIdx は既に currentDIdx + 1 になっているので何もしない
            }
        } else if (practiceMode === '拗音拡張') {
            const currentGyouKey = youonGyouList[currentGIdx];
            // 拗音拡張は dIdx が 1(ぃ) か 3(ぇ) のみ練習対象
            // dIdx が 1 なら次は 3 へ、3 なら次のグループへ
            if (currentDIdx === 1) {
                nextDIdx = 3;
            } else if (currentDIdx === 3) {
                nextGIdx = currentGIdx + 1; // gIdx をインクリメント
                nextDIdx = 1; // 次のグループの最初のターゲット (ぃ)
                if (nextGIdx >= youonGyouList.length) {
                    nextGIdx = 0;
                }
            } else {
                // 不正な dIdx の場合はリセット
                nextGIdx = 0;
                nextDIdx = 1;
            }
        } else if (practiceMode === '外来語の発音補助') {
            const group = gairaigoPracticeData[currentGIdx];
            if (group) {
                if (currentGIdx === 0) {
                    nextGIdx = 1; // 次の「うぁ」グループへ
                    nextDIdx = 0; // dIdx は 0 にリセット
                    return { nextGIdx, nextDIdx };
                }
                else if (currentGIdx === 1) { // else if に変更
                    if (currentDIdx === 0 || currentDIdx === 1) nextDIdx = 3; // うぃ -> うぇ (dIdx=2 をスキップ)
                    else if (currentDIdx === 2 || currentDIdx === 3) nextDIdx = 4; // うぇ -> うぉ
                    else if (currentDIdx === 4) { // うぉ -> 次のグループへ
                        nextGIdx = currentGIdx + 1;
                        nextDIdx = 0;
                    }
                }
                else if (currentGIdx === 2) { // gIdx=2 (くぁ)
                    // dIdx は 0, 1, 3, 4 と進む (2 はスキップ)
                    if (currentDIdx === 0) nextDIdx = 1; // くぁ -> くぃ
                    else if (currentDIdx === 1) nextDIdx = 3; // くぃ -> くぇ (dIdx=2 は練習対象外なのでスキップ)
                    else if (currentDIdx === 3) nextDIdx = 4; // くぇ -> くぉ
                    else if (currentDIdx === 4) { // くぉ -> 次のグループへ
                        nextGIdx = 3;
                        // すぁ行の最初のターゲットは「すぃ」(dIdx=1)
                        nextDIdx = 1;
                    } else { // 予期しない dIdx (dIdx=2 など)
                        nextGIdx = 0;
                        nextDIdx = 0;
                    }
                }
                else if (currentGIdx === 3) { // gIdx=3 (す)
                    // 「すぃ」(dIdx=1) の次は「つぁ」グループ (gIdx=4, dIdx=0) へ
                    if (currentDIdx === 1) {
                        nextGIdx = 4;
                        nextDIdx = 0;
                    } else {
                        // 「すぃ」以外からの遷移は想定しない (またはエラー処理)
                        console.warn(`[calculateNextIndices Gairaigo] Unexpected dIdx ${currentDIdx} for gIdx 3 (Su group)`);
                        nextGIdx = 0; // エラー時は最初に戻るなど
                        nextDIdx = 0;
                    }
                }
                else if (currentGIdx === 4) { // gIdx=4 (つぁ)
                    // dIdx は 0, 1, 3, 4 と進む (2 はスキップ)
                    if (currentDIdx === 0) nextDIdx = 1; // つぁ -> つぃ
                    else if (currentDIdx === 1) nextDIdx = 3; // つぃ -> つぇ (dIdx=2 は練習対象外なのでスキップ)
                    else if (currentDIdx === 3) nextDIdx = 4; // つぇ -> つぉ
                    else if (currentDIdx === 4) { // つぉ -> 次のグループへ
                        nextGIdx = 5;
                        // てぁ行の最初のターゲットは「てぃ」(dIdx=1)
                        nextDIdx = 1;
                    } else { // 予期しない dIdx (dIdx=2 など)
                        nextGIdx = 0;
                        nextDIdx = 0;
                    }
                }
                else if (currentGIdx === 5) { // gIdx=5 (て)
                    // 「てぃ」(dIdx=1) の次は「とぅ」グループ (gIdx=6, dIdx=2) へ
                    if (currentDIdx === 1) {
                        nextGIdx = 6; // と グループ
                        nextDIdx = 2; // とぅ
                    } else {
                        console.warn(`[calculateNextIndices Gairaigo] Unexpected dIdx ${currentDIdx} for gIdx 5 (Te group)`);
                        nextGIdx = 0; // エラー時は最初に戻るなど
                        nextDIdx = 3; // いぇ
                    }
                    return { nextGIdx, nextDIdx };
                }
                else if (currentGIdx === 6) { // gIdx=6 (と)
                    // 「とぅ」(dIdx=2) の次は「ふぁ」グループ (gIdx=7, dIdx=0) へ
                    if (currentDIdx === 2) {
                        nextGIdx = 7; // ふぁ グループ
                        nextDIdx = 0; // ふぁ
                    } else {
                        console.warn(`[calculateNextIndices Gairaigo] Unexpected dIdx ${currentDIdx} for gIdx 6 (To group)`);
                        nextGIdx = 0; // エラー時は最初に戻るなど
                        nextDIdx = 0;
                    }
                }
                else if (currentGIdx === 7) { // gIdx=7 (ふぁ)
                    // dIdx は 0, 1, 3, 4 と進む (2 はスキップ)
                    if (currentDIdx === 0) nextDIdx = 1; // ふぁ -> ふぃ
                    else if (currentDIdx === 1) nextDIdx = 3; // ふぃ -> ふぇ (dIdx=2 は練習対象外なのでスキップ)
                    else if (currentDIdx === 3) nextDIdx = 4; // ふぇ -> ふぉ
                    else if (currentDIdx === 4) { // ふぉ -> 次のグループへ
                        nextGIdx = 8; // ヴァ グループ
                        nextDIdx = 0; // ヴァ
                    } else { // 予期しない dIdx (dIdx=2 など)
                        nextGIdx = 0;
                        nextDIdx = 0;
                    }
                }
                else if (currentGIdx === 8) { // gIdx=8 (ヴぁ)
                    // dIdx は 0, 1, 3, 4 と進む (2 はスキップ)
                    if (currentDIdx === 0) nextDIdx = 1; // ヴァ -> ヴィ
                    else if (currentDIdx === 1) nextDIdx = 3; // ヴィ -> ヴェ (dIdx=2 はスキップ)
                    else if (currentDIdx === 3) nextDIdx = 4; // ヴェ -> ヴォ
                    else if (currentDIdx === 4) { // ヴォ -> 次のグループ (最初に戻る)
                        nextGIdx = 0;
                        nextDIdx = 0;
                    }
                    // dIdx=2 からの遷移は想定しない
                }
                else {
                    const maxDIdxInGroup = group.headerChars.length - 1; // ヘッダーの数-1 が dIdx の最大値
                    if (currentDIdx >= maxDIdxInGroup) {
                        nextGIdx = currentGIdx + 1; // gIdx をインクリメント
                        nextDIdx = 0;
                    } else {
                        nextDIdx = currentDIdx + 1;
                    }
                }

                // 最後のグループを超えたら最初のグループに戻る (gIdx のチェック)
                if (nextGIdx >= gairaigoPracticeData.length) {
                    nextGIdx = 0;
                    nextDIdx = 0;
                }
            }
        }
        // console.log(`[calculateNextIndices] End. nextGIdx=${nextGIdx}, nextDIdx=${nextDIdx}`);
        return { nextGIdx, nextDIdx };
      };

    const nextStage = useCallback(() => {
        if (isRandomMode) {
            // ランダムモードの場合は各フック内で次のターゲットを選択する
            return;
        }

        // useCallback の依存配列に gIdx, dIdx を追加したので、直接 state を参照する
        //console.log(`[App nextStage] Called. Current gIdx=${gIdx}, dIdx=${dIdx}, isRandomMode=${isRandomMode}, practice=${practice}`);
        const { nextGIdx, nextDIdx } = calculateNextIndices(gIdx, dIdx, isRandomMode, practice); // practiceRef.current の代わりに practice を使用
        //console.log(`[App nextStage] Calculated next indices: nextGIdx=${nextGIdx}, nextDIdx=${nextDIdx}. Setting state...`);
        setGIdx(nextGIdx);
        setDIdx(nextDIdx);

        // 状態更新が非同期であるため、この直後に gIdx, dIdx を参照しても古い値の可能性があることに注意
        //console.log(`[App nextStage] State update requested. (Actual update is async)`);
    }, [isRandomMode, gIdx, dIdx, practice, setGIdx, setDIdx]); // gIdx, dIdx, practice を依存配列に追加

    // onInput (依存配列修正済み & ref を使用)
    const onInput: (ev: HIDInputReportEvent) => void = useCallback((ev) => {
        const data = new Uint8Array(ev.data.buffer);
        const reportId = data[0];
        const keyCode = data[1];
        const timestamp = Date.now();


        if (reportId === 0x14 && keyCode === 0x03) {
            if (!trainingRef.current) { // ← ref を使用
                setTraining(true);
                setShowKeyLabels(true);
                setIsRandomMode(false);
            }
            return;
        }


        if (reportId === 0x15 && trainingRef.current && practiceRef.current && activePracticeRef.current) { // ← ref を使用
            const releaseOffset = 0x14;
            const maxStartLayoutKeyCode = 0x14;
            const isPressEventAdjusted = keyCode <= maxStartLayoutKeyCode;
            const isReleaseEventAdjusted = keyCode >= (releaseOffset + 1);


            if (isPressEventAdjusted) {
                const pressCode = keyCode;
                pressedKeysRef.current.set(pressCode, timestamp);

                const inputInfo: PracticeInputInfo = { type: 'press', timestamp, pressCode };
                activePracticeRef.current.handleInput(inputInfo); // ← ref を使用

            } else if (isReleaseEventAdjusted) {
                const pressCode = keyCode - releaseOffset;

                if (pressCode <= 0) {
                    console.warn(`[App.onInput] Invalid calculated pressCode: 0x${pressCode.toString(16)}. Ignoring release event.`);
                    return;
                }

                const pressTimestamp = pressedKeysRef.current.get(pressCode);
                if (pressTimestamp) {
                    pressedKeysRef.current.delete(pressCode);

                    const inputInfo: PracticeInputInfo = { type: 'release', timestamp, pressCode };
                    //console.log(`[App onInput] Calling activePractice.handleInput for 0x${pressCode.toString(16)} at ${performance.now()}`); // ★追加: 呼び出し前ログ
                    const result = activePracticeRef.current.handleInput(inputInfo); // ← ref を使用
                    //console.log(`[App onInput] activePractice.handleInput for 0x${pressCode.toString(16)} finished at ${performance.now()}`); // ★追加: 呼び出し後ログ

                    //console.log(`[App onInput] Release event for 0x${pressCode.toString(16)}. handleInput result: isExpected=${result.isExpected}, shouldGoToNext=${result.shouldGoToNext}`);

                    if (result.isExpected) {
                        if (result.shouldGoToNext && practiceRef.current !== 'かな入力１分間トレーニング' && practiceRef.current !== '記号入力１分間トレーニング' && practiceRef.current !== '短文入力３分間トレーニング') {
                            //console.log(`[App onInput] Correct input, calling nextStage() for practice: ${practiceRef.current}`);
                            nextStage(); // 次の練習問題へ
                            // showOkFeedback(); // OK表示を削除
                        }
                   } else {
                        handleInvalidInput(pressCode);
                    }
                } else {
                    console.warn(`[App.onInput] Matching press event NOT FOUND for calculated pressCode: 0x${pressCode.toString(16)}. Current pressedKeys:`, Array.from(pressedKeysRef.current.keys()).map(k => `0x${k.toString(16)}`));
                }
            }
        }
    }, [handleInvalidInput, nextStage, setTraining, setShowKeyLabels, setIsRandomMode, kb, side]); // nextStage を依存配列に追加 (中身が変わるため)

    /* HID send (練習 ON/OFF) */ // (依存配列修正済み)
    const sendHid: (on: boolean) => Promise<void> = useCallback(async (on) => {

        const filters = [{ usagePage: 0xff60, usage: 0x61 }];
        let dev = devRef.current;
        if (!dev) {
            try {
                const ds = (await navigator.hid?.requestDevice({ filters })) ?? [];
                if (!ds.length) return;
                dev = ds[0]; devRef.current = dev;
            } catch (err) { console.error("HIDデバイスのリクエストに失敗:", err); return; }
        }
        if (!opening.current && !(dev as any).opened) {
            opening.current = true;
            try {
                await dev.open();
            } catch (err) { console.error("HIDデバイスを開けませんでした:", err); opening.current = false; devRef.current = null; return; }
            finally {
                opening.current = false;
            }
        }
        if (!(dev as any).opened) { console.error("HIDデバイスが開いていません。"); return; }

        try {
            await dev.sendReport(0, new Uint8Array([0x02, on ? 0x01 : 0x00]));
        } catch (err) {
            console.error("[sendHid] Failed to send HID report:", err);
        }

        setTraining(on);
        if (on) {
            setShowKeyLabels(true);
            setIsRandomMode(false);
        } else {
            setPractice('');
            setGIdx(0); setDIdx(0);
            // setOK(false); // 削除
            setLastInvalidKeyCode(null); // 不正入力ハイライトもクリア
            if (invalidInputTimeoutRef.current !== null) {
                clearTimeout(invalidInputTimeoutRef.current);
                invalidInputTimeoutRef.current = null;
            }
            pressedKeysRef.current.clear();
            activePracticeRef.current?.reset?.(); // ← ref を使用
            setShowKeyLabels(true);
            // OK表示タイマーのクリア処理を削除
            setIsRandomMode(false);
        }
     }, [setTraining, setPractice, setGIdx, setDIdx, setLastInvalidKeyCode, setShowKeyLabels, setIsRandomMode]); // setOK を依存配列から削除

    /* 初期化 */ // (依存配列修正済み)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const kbRaw = params.get('kb') ?? 'tw-20v'; // デフォルトを 'tw-20v' に変更
        const sideRaw = params.get('side') ?? 'right'; // デフォルトは 'right' のまま

        const currentKb: KeyboardModel = kbRaw === 'tw-20h' ? 'tw-20h' : 'tw-20v';
        setKb(currentKb);

        const currentSide: KeyboardSide = sideRaw === 'left' ? 'left' : 'right';
        setSide(currentSide);

        const kbKey = currentKb as keyof typeof sampleJson;
        const sideKey = currentSide as keyof typeof sampleJson[typeof kbKey];
        if (sampleJson[kbKey] && sampleJson[kbKey][sideKey]) {
            const sel = sampleJson[kbKey][sideKey];
            setLayers(sel.layers);
            setTitle(`${currentKb.toUpperCase()} レイアウト (${currentSide})`);
            setCols(currentKb === 'tw-20v' ? 4 : 5);
        } else {
             console.error(`キーマップデータが見つかりません: ${currentKb}, ${currentSide}`);
             setLayers([]); setTitle('レイアウト不明'); setCols(5);
        }

        const firmware = params.get('version');
        const serial = params.get('serial');
        setFW(firmware); setSN(serial);
        if (firmware || serial) {
            setShowTrainingButton(true);
        }

        const initHid = async () => {
            try {
                const ds = await navigator.hid?.getDevices();
                if (!ds || !ds.length) {
                    return;
                }
                const device = ds[0];
                if (!opening.current && !(device as any).opened) {
                    opening.current = true;
                    try {
                        await device.open();
                        device.oninputreport = onInput; // ここは変更なし (onInput の参照自体は変わらない)
                        devRef.current = device;
                    } catch (err) { console.error("既存のHIDデバイスを開けませんでした:", err); }
                    finally { opening.current = false; }
                } else if ((device as any).opened) {
                    device.oninputreport = onInput; // ここは変更なし (onInput の参照自体は変わらない)
                    devRef.current = device;
                }
            } catch (err) { console.error("HIDデバイスの取得またはオープンに失敗:", err); }
        };
        initHid();


        return () => {
            const dev = devRef.current;
            // devRef.current を null に設定する前にローカル変数に保持
            if (dev) {
                // イベントハンドラを確実に解除
                dev.oninputreport = null;
                devRef.current = null;
            }
        };
     }, [setTitle, setCols, setLayers, setFW, setSN, setShowTrainingButton, setSide, setKb, sampleJson, isRandomMode, onInput]); // onInput を依存配列に追加

    // 練習モード選択時のリセット処理
    const handlePracticeSelect = (item: PracticeMode) => {
        activePracticeRef.current?.reset?.(); // ← ref を使用
        setPractice(item);
        setGIdx(0);
        // setOK(false); // 削除
        // OKタイマークリア処理を削除
        if (item === 'かな入力１分間トレーニング' || item === '記号入力１分間トレーニング' || item === '短文入力３分間トレーニング') {
            // 特有の初期化があればここに追加
            setDIdx(0); // dIdx は使わないかもしれないが念のためリセット
        } else if (item === '拗音拡張') {
            setDIdx(1);
        } else if (item === '外来語の発音補助') {
            setDIdx(3); // 最初のターゲット「いぇ」の dIdx
        } else {
            setDIdx(0); // 他のモードは 0
        }
        // setOK(false); // 削除
        setLastInvalidKeyCode(null);
        if (invalidInputTimeoutRef.current !== null) {
            clearTimeout(invalidInputTimeoutRef.current);
            invalidInputTimeoutRef.current = null;
        }
        pressedKeysRef.current.clear();
        setShowKeyLabels(true);
        setIsRandomMode(false); // デフォルトは OFF
     };

    // ランダムモード切り替えハンドラ
    const toggleRandomMode = useCallback(() => {
        if (practiceRef.current === 'かな入力１分間トレーニング' || practiceRef.current === '記号入力１分間トレーニング' || practiceRef.current === '短文入力３分間トレーニング') {
            console.warn("Cannot toggle random mode during challenge.");
            return;
        }
        const nextIsRandomMode = !isRandomMode;
        setIsRandomMode(nextIsRandomMode);
        activePracticeRef.current?.reset?.(); // ← ref を使用
     }, [setIsRandomMode, isRandomMode]);

    // ボタンのスタイル (変更なし)
    const buttonStyle: React.CSSProperties = {
        marginBottom: '0.5rem',
        padding: '5px 10px',
        display: 'block',
        minWidth: '120px',
        textAlign: 'center',
     };

    const displayLayerIndices = useMemo(() => {
        if (training) {
            // 記号入力１分間トレーニングの場合、フックから返された targetLayerIndex を優先
            if (practice === '記号入力１分間トレーニング' && activePractice?.targetLayerIndex !== null && activePractice?.targetLayerIndex !== undefined) {
                return [activePractice.targetLayerIndex];
            }
            else if (practice === '記号の基本練習１') return [6];
            else if (practice === '記号の基本練習２') return [7];
            else if (practice === '記号の基本練習３') return [8];
            else if (practice && practice !== '記号入力１分間トレーニング' && practice !== '短文入力３分間トレーニング') {
                return [2, 3];
            }
            // その他の練習モードはデフォルトでレイヤー2（かなスタート）
            else if (practice === '記号入力１分間トレーニング') {
                // targetLayerIndex が null/undefined でも、記号チャレンジ中は記号レイヤーを表示したい
                // ここでは仮にレイヤー2をデフォルトとする
                // (あるいは、チャレンジ開始前は何も表示しない、など仕様に応じて変更)
                return [2];
            } else {
                if (practice === '短文入力３分間トレーニング') {
                    return [];
                }
                // 練習モードが選択されていない場合など (デフォルト)
                return []; // 何も表示しない、または [0] など仕様に応じて
            }
        }
        // トレーニングモードでなければ、現在のレイヤー（これは現状の実装では使われていないかも？）
        // 練習モードOFF時は全レイヤー表示なので、この値は KeyboardLayout には直接渡さない
        return []; // トレーニングOFF時は空配列
    }, [training, practice, activePractice?.targetLayerIndex]);

    const keyboardLayers = useMemo(() => {
        // 現在選択されているキーボードモデルと言語サイドのレイヤーデータを取得
        const baseLayers = sampleJson[kb]?.[side]?.layers ?? [];

        if (practice === '記号入力１分間トレーニング' && activePractice?.displayLayers) {
            // useKigoChallengePractice が加工済みのレイヤーを返すので、それをそのまま使う
            return activePractice.displayLayers;
        }

        // 記号の基本練習３の場合
        if (practice === '記号の基本練習３') {
            // targetLayerIndex が 8 であっても、kigoMapping3 を適用せず、元のレイヤーデータを返す
            return baseLayers;
        }

        // --- 他のモードで kigoMapping3 を適用するロジックがあれば、ここに記述 ---
        // 例: もし他のモードで targetLayerIndex が 8 の場合に kigoMapping3 を適用する必要があれば
        // if (targetLayerIndex === 8 /* && practiceMode !== '記号の基本練習３' */ ) {
        //   const modifiedLayer8 = baseLayers[8]?.map(keyName => kigoMapping3[keyName] ?? keyName);
        //   const newLayers = [...baseLayers];
        //   newLayers[8] = modifiedLayer8;
        //   return newLayers;
        // }
        // --- ここまで ---

        // 上記のどの条件にも当てはまらない場合は、元のレイヤーデータをそのまま返す
        return baseLayers;

    }, [practice, activePractice, kb, side]); // layers を削除し、kb, side を追加

    // ヘッダーに表示する文字配列
    const headingChars = useMemo(() => {
        //console.log(`[App headingChars useMemo] Start calculation. training=${training}, practice=${practice}, gIdx=${gIdx}, isRandomMode=${isRandomMode}, activePractice exists: ${!!activePractice}`);
        if (!training || !practice || !activePractice) return [];

        let data: any[] = [];
        let groupKey: string | null = null; // 参照するキーを格納する変数

        switch (practice) {
            // 配列を直接返すモード
            case '清音の基本練習': data = gyouList.map(gyou => danOrder[gyou]); break; // 配列を返す
            case '拗音の基本練習': data = youonGyouList.map(gyou => youonGyouChars[gyou]); break;
            case '濁音の基本練習': data = dakuonGyouList.map(gyou => dakuonGyouChars[gyou]); break;
            case '半濁音の基本練習': data = [handakuonGyouChars['は行']]; break; // 半濁音は「は行」のみ
            case '拗音拡張': data = youonGyouList.map(gyou => youonKakuchoChars[gyou]); break;
            // ▼▼▼ チャレンジモードの場合はフックの headingChars を直接返す ▼▼▼
            case 'かな入力１分間トレーニング': {
                return activePractice.headingChars; // フックの headingChars を返す
            }
            case '記号入力１分間トレーニング': {
                return activePractice.headingChars; // フックの headingChars を返す
            }
            case '短文入力３分間トレーニング': {
                return activePractice.headingChars; // フックの headingChars を返す
            }
            // オブジェクト配列から特定のキーを参照するモード
            case '小文字(促音)の基本練習': data = sokuonKomojiData; groupKey = 'chars'; break;
            case '記号の基本練習１': data = kigoPractice1Data; groupKey = 'chars'; break;
            case '記号の基本練習２': data = kigoPractice2Data; groupKey = 'chars'; break;
            case '記号の基本練習３': data = kigoPractice3Data; groupKey = 'chars'; break;
            case '拗濁音の練習': data = youdakuonPracticeData; groupKey = 'chars'; break;
            case '拗半濁音の練習': data = youhandakuonPracticeData; groupKey = 'chars'; break;
            case '外来語の発音補助':
                data = gairaigoPracticeData;
                groupKey = 'headerChars'; // 外来語は headerChars を使う
                break;
            default: return [];
        }

        const result = (() => {
            if (isRandomMode) { // isRandomMode のチェックを先に移動
                // ランダムモードの場合、フックの headingChars を使う
                // (各フックはランダムモード時に headingChars にターゲット文字を入れているはず)
                const targetChar = activePractice.headingChars?.[0];
                return targetChar ? [targetChar] : [];
            }

            // 通常モードの処理
            if (gIdx >= 0 && gIdx < data.length) {
                const group = data[gIdx];
                if (Array.isArray(group)) { return group; } // 配列の場合はそのまま返す
                else if (typeof group === 'object' && group !== null && groupKey && group[groupKey]) { return group[groupKey]; } // オブジェクトの場合は指定されたキーの配列を返す
            }
            return [];
        })();
        //console.log(`[App headingChars useMemo] Calculated result:`, result);
        return result;
    }, [training, practice, gIdx, isRandomMode, activePractice, activePractice?.headingChars]);


    // コンポーネント全体のJSX
    return (
        <div className='p-4 pt-20'>
            {/* ボタンエリア */}
            {showTrainingButton && (
                <div className="absolute top-4 right-4 flex flex-col space-y-2 items-end z-50">
                    <button
                        className={`px-4 py-1 rounded shadow text-white ${training ? 'bg-gray-600' : 'bg-green-600'}`}
                        onClick={() => {
                            sendHid(!training);
                        }}
                        style={buttonStyle}
                    >
                        {training ? 'レイアウト表示に戻る' : '練習を始める'}
                    </button>
                    {training && (
                        <>
                            <button
                                className="px-4 py-1 rounded shadow text-white bg-blue-600 hover:bg-blue-700"
                                onClick={() => setShowKeyLabels(prev => !prev)}
                                style={buttonStyle}
                            >
                                {showKeyLabels ? 'キー表示 OFF' : 'キー表示 ON'}
                            </button>
                            {practice !== 'かな入力１分間トレーニング' && practice !== '記号入力１分間トレーニング' && practice !== '短文入力３分間トレーニング' && (
                                <>
                                    {console.log(`[Render Button] Rendering random mode button. isRandomMode: ${isRandomMode}`)}
                                    <button
                                        className={`px-4 py-1 rounded shadow text-white bg-purple-600 hover:bg-purple-700`}
                                        onClick={toggleRandomMode}
                                        style={buttonStyle}
                                    >
                                        ランダム {isRandomMode ? 'OFF' : 'ON'}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 練習モードOFF時の表示 */}
            {!training && <h1 className='text-lg font-semibold mb-4'>{title}</h1>}
            {(fw || sn) && !training && (
                <div className='mb-4 text-sm text-gray-700 space-y-1'>
                    <p>FW: {fw ?? '不明'}</p>
                    <p>SN: {sn ?? '不明'}</p>
                </div>
            )}

            {/* 練習モードON時の表示 */}
            {training ? (
                <>
                    {practice ? (
                        <div className='grid grid-cols-3 gap-4 items-start'>
                            {/* メニュー表示 */}
                            <PracticeMenu
                                practice={practice}
                                handlePracticeSelect={handlePracticeSelect}
                            />

                            {/* ▼▼▼ 常に grid-cols-2 を使用するように変更 ▼▼▼ */}
                            <div className="col-span-2 grid grid-cols-2 gap-4">
                            {/* ▲▲▲ 変更 ▲▲▲ */}
                                <div className={`${ // ▼▼▼ 左カラムの中央に配置するように変更 ▼▼▼
                                    'col-start-1 justify-self-center w-full' // 左カラムの中央に配置 & 幅を確保
                                }`}>
                                    {/* ▼▼▼ カウントダウン表示をヘッダーの前に移動 ▼▼▼ */}
                                    {activePractice?.status === 'countdown' && activePractice?.countdownValue && activePractice.countdownValue > 0 && (
                                        <div className="flex items-center justify-center mb-4"> {/* justify-center に変更 */}
                                            <div className="text-5xl font-bold"> {/* text-yellow-300 を削除 */}
                                                {activePractice.countdownValue}
                                            </div>
                                        </div>
                                    )}
                                    {/* ▲▲▲ 移動完了 ▲▲▲ */}
                                    {/* ▼▼▼ カウントダウン中はヘッダーを表示しないように修正 ▼▼▼ */}
                                    {activePractice?.status !== 'countdown' && (
                                        <PracticeHeading
                                            isRandomMode={(practice === 'かな入力１分間トレーニング' || practice === '記号入力１分間トレーニング' || practice === '短文入力３分間トレーニング') ? true : isRandomMode}
                                            practice={practice}
                                            gIdx={gIdx}
                                            dIdx={dIdx}
                                            headingChars={headingChars}
                                            isFinished={isChallengeFinished} // チャレンジ終了フラグ
                                            typedEndIndex={activePractice?.typedEndIndex} // 短文入力の進捗
                                            status={activePractice?.status} // status を渡す
                                        />
                                    )}
                                </div>
                                {isChallengeFinished ? (
                                    // ▼▼▼ 常に col-start-1 justify-self-start を使用 ▼▼▼
                                    <div className="flex items-center p-4 border rounded bg-gray-50 col-start-1 justify-self-center" style={{ minHeight: '15rem' }}> {/* justify-self-center に変更 */}
                                    {/* ▲▲▲ 変更 ▲▲▲ */}
                                        {activePractice?.challengeResults && (
                                            <pre className="text-lg text-left font-semibold">
                                                {`【${practice} 結果】\n`}
                                                {`問題数：${activePractice.challengeResults.totalQuestions}問クリア\n`}
                                                {(practice === 'かな入力１分間トレーニング' || practice === '短文入力３分間トレーニング') && `正解文字数：${activePractice.challengeResults.correctCharsCount}文字\n`}
                                                {`打鍵精度：${(activePractice.challengeResults.accuracy * 100).toFixed(1)}%\n`}
                                                {`スコア：${activePractice.challengeResults.score}点\n`}
                                                {activePractice.challengeResults.rankMessage && `\n${activePractice.challengeResults.rankMessage}`}
                                            </pre>
                                        )}
                                    </div>
                                ) : (
                                    <> {/* map の結果を直接レンダリングするため、不要な div を削除 */}
                                        {/* ▼▼▼ キーボードレイアウトの配置ロジックを修正 ▼▼▼ */}
                                        {displayLayerIndices.length === 1 ? (
                                            // レイアウトが1つの場合: 左寄せに変更
                                            keyboardLayers[displayLayerIndices[0]] && (
                                                <KeyboardLayout
                                                    key={displayLayerIndices[0]}
                                                    layerData={keyboardLayers[displayLayerIndices[0]]}
                                                    layoutIndex={displayLayerIndices[0]}
                                                    className="col-start-1 justify-self-center" // 左カラムの中央揃えに変更
                                                    layoutTitle={layerNames[displayLayerIndices[0]] ?? `レイヤー ${displayLayerIndices[0]}`}
                                                    cols={cols} fixedWidth={fixedWidth} showKeyLabels={showKeyLabels} lastInvalidKeyCode={lastInvalidKeyCode} activePractice={activePractice} practice={practice} currentFunctionKeyMap={currentFunctionKeyMap} training={training}
                                                />
                                            )
                                        ) : displayLayerIndices.length === 2 && displayLayerIndices.includes(2) && displayLayerIndices.includes(3) ? (
                                            // レイアウトが2つ (かなスタート/エンド) の場合: 横並び
                                            displayLayerIndices.map((layerIndex) => {
                                                const gridColClass = layerIndex === 2 ? 'col-start-1 justify-self-center' : 'col-start-2 justify-self-center'; // 各々中央寄せ
                                                return keyboardLayers[layerIndex] ? (
                                                    <KeyboardLayout
                                                        key={layerIndex}
                                                        layerData={keyboardLayers[layerIndex]}
                                                        layoutIndex={layerIndex}
                                                        className={gridColClass}
                                                        layoutTitle={layerNames[layerIndex] ?? `レイヤー ${layerIndex}`}
                                                        cols={cols} fixedWidth={fixedWidth} showKeyLabels={showKeyLabels} lastInvalidKeyCode={lastInvalidKeyCode} activePractice={activePractice} practice={practice} currentFunctionKeyMap={currentFunctionKeyMap} training={training}
                                                    />
                                                ) : (
                                                    <div key={layerIndex}>レイヤー {layerIndex} のデータが見つかりません。</div>
                                                );
                                            })
                                        ) : (
                                            // その他の場合 (例: 短文練習でレイアウトなし) は何も表示しない
                                            null
                                        )}
                                        {/* ▲▲▲ 修正完了 ▲▲▲ */}
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className='grid grid-cols-3 gap-4 items-start'>
                            <PracticeMenu
                                practice={practice}
                                handlePracticeSelect={handlePracticeSelect}
                            />
                            <div className="col-span-2">
                                {/* 練習が選択されていない場合、キーボードエリアは空 */}
                            </div>
                        </div>
                    )}
                </>
            ) : ( // 練習モードOFF時の表示
                 <div className='grid grid-cols-2 gap-4'>
                     {layers.map((layer: string[], li: number) => {
                        return (
                            <div key={li} className="justify-self-center">
                                <KeyboardLayout
                                    layerData={layer}
                                    layoutIndex={li}
                                    layoutTitle={layerNames[li] ?? `レイヤー ${li}`}
                                    cols={cols}
                                    fixedWidth={fixedWidth}
                                    showKeyLabels={true}
                                    lastInvalidKeyCode={null}
                                    activePractice={null}
                                    practice={''}
                                    currentFunctionKeyMap={{}}
                                    training={training}
                                />
                            </div>
                        );
                     })}
                 </div>
            )}
        </div>
    );
}
