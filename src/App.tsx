// src/App.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { motion } from 'framer-motion'; // KeyboardLayout に移動
import { HIDDevice, HIDInputReportEvent } from './types/hid'; // パス修正済み
import {
    sampleJson,
    layerNames,
    // basicPracticeMenuItems, // PracticeMenu に移動
    // stepUpPracticeMenuItems, // PracticeMenu に移動
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
    // kigoMapping2, // KeyboardLayout に移動
    // kigoMapping3, // KeyboardLayout に移動
    functionKeyMaps,
    youonKakuchoChars, // 拗音拡張のデータも依存配列に含めるためインポート
    // youonKakuchoDanMapping, // 拗音拡張のデータも依存配列に含めるためインポート (App.tsxでは不要)
    gairaigoPracticeData, // ← 追加
} from './data/keymapData';
// import { getKeyStyle, isLargeSymbol } from './utils/styleUtils'; // KeyboardLayout に移動
import {
    PracticeMode,
    PracticeInputInfo,
    PracticeHookProps,
    PracticeHookResult,
    KeyboardSide,
    KeyboardModel
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
import useGairaigoPractice from './hooks/useGairaigoPractice'; // ← 追加
// ▼▼▼ 新しいフックをインポート ▼▼▼
import useKanaChallengePractice from './hooks/useKanaChallengePractice';
// ▲▲▲ インポート ▲▲▲


// 作成したコンポーネントをインポート
import PracticeMenu from './components/PracticeMenu';
import PracticeHeading from './components/PracticeHeading';
import KeyboardLayout from './components/KeyboardLayout';

// App コンポーネント (旧 KeymapViewer)
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
    // ▼▼▼ isRandomMode の初期値を false に変更 ▼▼▼
    const [isRandomMode, setIsRandomMode] = useState(false);
    // ▲▲▲ 変更完了 ▲▲▲
    // ▼▼▼ ログ追加 1: useState の初期値確認 ▼▼▼
    console.log(`[App Init] Initial isRandomMode state: ${isRandomMode}`);
    // ▲▲▲ ログ追加 ▲▲▲

    /* 現在の行/段/文字インデックス */
    const [gIdx, setGIdx] = useState(0); // 初期値は 0 に戻す
    const [dIdx, setDIdx] = useState(0); // 初期値は 0 に戻す

    /* UIフィードバック */
    const [okVisible, setOK] = useState(false);
    const [lastInvalidKeyCode, setLastInvalidKeyCode] = useState<number | null>(null);

    /* HID / カウンタ */
    const devRef = useRef<HIDDevice | null>(null);
    const opening = useRef(false);
    const invalidInputTimeoutRef = useRef<number | null>(null);
    const pressedKeysRef = useRef<Map<number, number>>(new Map());
    const lastInvalidInputTime = useRef<number>(0);

    // ▼▼▼ state を参照するための ref を作成 ▼▼▼
    const trainingRef = useRef(training);
    const practiceRef = useRef(practice);
    const activePracticeRef = useRef<PracticeHookResult | null>(null); // activePractice は useMemo の結果
    // ▼▼▼ gIdx, dIdx の ref を作成 ▼▼▼
    const gIdxRef = useRef(gIdx);
    const dIdxRef = useRef(dIdx);
    // ▲▲▲ ref 作成 ▲▲▲

    // --- カスタムフックの呼び出し ---
    const commonHookProps: PracticeHookProps = useMemo(() => ({
        gIdx, dIdx, isActive: false, okVisible, side, layers, kb, isRandomMode
    }), [gIdx, dIdx, okVisible, side, layers, kb, isRandomMode]);

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
    const gairaigoPractice = useGairaigoPractice({ ...commonHookProps, isActive: practice === '外来語の発音補助' }); // ← 追加
    // ▼▼▼ 新しいフックを呼び出し ▼▼▼
    const kanaChallengePractice = useKanaChallengePractice({ ...commonHookProps, isActive: practice === 'かな入力１分間トレーニング' });
    // ▲▲▲ 呼び出し ▲▲▲


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
            case '外来語の発音補助': return gairaigoPractice; // ← 追加
            // ▼▼▼ 新しい case を追加 ▼▼▼
            case 'かな入力１分間トレーニング': return kanaChallengePractice;
            // ▲▲▲ 追加 ▲▲▲
            default: return null;
        }
    // 依存配列に kanaChallengePractice を追加
    }, [practice, seionPractice, youonPractice, dakuonPractice, handakuonPractice, sokuonKomojiPractice, kigoPractice1, kigoPractice2, kigoPractice3, youdakuonPractice, youhandakuonPractice, youonKakuchoPractice, gairaigoPractice, kanaChallengePractice]);

    // ▼▼▼ state が変更されたら ref を更新する useEffect ▼▼▼
    useEffect(() => {
        trainingRef.current = training;
    }, [training]);

    useEffect(() => {
        practiceRef.current = practice;
    }, [practice]);

    useEffect(() => {
        activePracticeRef.current = activePractice;
    }, [activePractice]);
    // ▼▼▼ gIdx, dIdx の ref 更新 useEffect ▼▼▼
    useEffect(() => { gIdxRef.current = gIdx; }, [gIdx]);
    useEffect(() => { dIdxRef.current = dIdx; }, [dIdx]);
    // ▲▲▲ ref 更新 useEffect ▲▲▲

    // キーボード表示の固定幅 (変更なし)
    const keyWidthRem = 5.5;
    // const gapRem = 0.5; // gap-2 = 0.5rem - PracticeHeading に移動したため削除
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
        console.log(`Invalid input detected. Setting lastInvalidKeyCode to: 0x${pressCode.toString(16)}`);

        if (invalidInputTimeoutRef.current !== null) {
            clearTimeout(invalidInputTimeoutRef.current);
        }

        const timerId = window.setTimeout((codeToClear: number) => {
            setLastInvalidKeyCode(prevCode => {
                if (prevCode === codeToClear) {
                    console.log(`Clearing lastInvalidKeyCode: 0x${codeToClear.toString(16)}`);
                    return null;
                }
                return prevCode;
            });
            invalidInputTimeoutRef.current = null;
        }, 500, pressCode);
        invalidInputTimeoutRef.current = timerId;
     }, []); // 依存配列を空に修正

    // --- 次のステージへ ---
    // ▼▼▼ useCallback の依存配列から gIdx, dIdx を削除 ▼▼▼
    const nextStage = useCallback(() => {
        if (practiceRef.current === 'かな入力１分間トレーニング') {
            console.log("[nextStage] Ignored in Challenge mode.");
            return;
        }

        if (isRandomMode) {
            activePracticeRef.current?.reset?.();
            setOK(true);
            setTimeout(() => setOK(false), 1000);
            return;
        }

        setOK(true);
        setTimeout(() => {
            // ▼▼▼ 最新の gIdx, dIdx を ref から取得 ▼▼▼
            const currentGIdx = gIdxRef.current;
            const currentDIdx = dIdxRef.current;
            let nextGIdx = currentGIdx;
            let nextDIdx = currentDIdx;
            // ▲▲▲ ref から取得 ▲▲▲

            if (practiceRef.current === '清音の基本練習') {
                console.log(`[nextStage - 清音 setTimeout] Current state from ref: gIdx=${currentGIdx}, dIdx=${currentDIdx}`); // ログ追加
                const currentGyouKey = gyouList[currentGIdx]; // currentGIdx を使用
                if (!currentGyouKey || !gyouList.includes(currentGyouKey)) {
                    console.error("清音練習で無効な gIdx または currentGyouKey");
                } else {
                    const list = danOrder[currentGyouKey];
                    if (currentDIdx < list.length - 1) { // currentDIdx を使用
                        nextDIdx = currentDIdx + 1;
                    } else {
                        nextDIdx = 0;
                        nextGIdx = (currentGIdx + 1) % gyouList.length; // currentGIdx を使用
                    }
                    console.log(`[nextStage - 清音 setTimeout] Calculated next: nextGIdx=${nextGIdx}, nextDIdx=${nextDIdx}`); // ログ追加
                }
            }
            // ▼▼▼ 他の練習モードも同様に currentGIdx, currentDIdx を使うように修正 ▼▼▼
            else if (practiceRef.current === '拗音の基本練習') {
                if (currentGIdx < 0 || currentGIdx >= youonGyouList.length) { console.error("拗音練習で無効な gIdx"); }
                else {
                    const currentGyouKey = youonGyouList[currentGIdx];
                    const currentChars = youonGyouChars[currentGyouKey] || [];
                    if (currentDIdx < currentChars.length - 1) { nextDIdx = currentDIdx + 1; }
                    else { nextDIdx = 0; nextGIdx = (currentGIdx + 1) % youonGyouList.length; }
                }
            } else if (practiceRef.current === '濁音の基本練習') {
                 if (currentGIdx < 0 || currentGIdx >= dakuonGyouList.length) { console.error("濁音練習で無効な gIdx"); }
                 else {
                    const currentGyouKey = dakuonGyouList[currentGIdx];
                    const currentChars = dakuonGyouChars[currentGyouKey] || [];
                    if (currentDIdx < currentChars.length - 1) { nextDIdx = currentDIdx + 1; }
                    else { nextDIdx = 0; nextGIdx = (currentGIdx + 1) % dakuonGyouList.length; }
                 }
            } else if (practiceRef.current === '半濁音の基本練習') {
                 if (currentGIdx < 0 || currentGIdx >= handakuonGyouList.length) { console.error("半濁音練習で無効な gIdx"); }
                 else {
                    const currentChars = handakuonGyouChars['は行'] || [];
                    if (currentDIdx < currentChars.length - 1) { nextDIdx = currentDIdx + 1; }
                    else { nextDIdx = 0; nextGIdx = 0; } // gIdx は常に 0
                 }
            } else if (practiceRef.current === '小文字(促音)の基本練習') {
                 if (currentGIdx < 0 || currentGIdx >= sokuonKomojiData.length) { console.error("促音/小文字練習で無効な gIdx"); }
                 else {
                    const currentSet = sokuonKomojiData[currentGIdx];
                    const currentChars = currentSet.chars;
                     if (currentDIdx < 0 || currentDIdx >= currentChars.length) { console.error("促音/小文字練習で無効な dIdx"); nextGIdx = 0; nextDIdx = 0; }
                     else {
                        const isTsu = currentChars[currentDIdx] === 'っ';
                        if (isTsu || currentDIdx === currentChars.length - 1) {
                            nextDIdx = 0;
                            nextGIdx = (currentGIdx + 1) % sokuonKomojiData.length;
                        } else {
                            nextDIdx = currentDIdx + 1;
                        }
                     }
                 }
            } else if (practiceRef.current === '記号の基本練習１') {
                if (currentGIdx < 0 || currentGIdx >= kigoPractice1Data.length) { console.error("記号練習1で無効な gIdx"); }
                else {
                    const currentGroup = kigoPractice1Data[currentGIdx];
                    if (currentDIdx < currentGroup.chars.length - 1) { nextDIdx = currentDIdx + 1; }
                    else { nextDIdx = 0; nextGIdx = (currentGIdx + 1) % kigoPractice1Data.length; }
                }
            } else if (practiceRef.current === '記号の基本練習２') {
                if (currentGIdx < 0 || currentGIdx >= kigoPractice2Data.length) { console.error("記号練習2で無効な gIdx"); }
                else {
                    const currentGroup = kigoPractice2Data[currentGIdx];
                    if (currentDIdx < 0 || currentDIdx >= currentGroup.chars.length) { console.error("記号練習2で無効な dIdx"); }
                    else {
                        if (currentDIdx < currentGroup.chars.length - 1) {
                            nextDIdx = currentDIdx + 1;
                        } else {
                            nextDIdx = 0;
                            nextGIdx = (currentGIdx + 1) % kigoPractice2Data.length;
                        }
                    }
                }
            } else if (practiceRef.current === '記号の基本練習３') {
                if (currentGIdx < 0 || currentGIdx >= kigoPractice3Data.length) { console.error("記号練習3で無効な gIdx"); }
                else {
                    const currentGroup = kigoPractice3Data[currentGIdx];
                    if (currentDIdx < currentGroup.chars.length - 1) {
                        nextDIdx = currentDIdx + 1;
                    } else {
                        if (currentGIdx < kigoPractice3Data.length - 1) {
                            nextGIdx = currentGIdx + 1;
                            nextDIdx = 0;
                        } else {
                            nextGIdx = 0;
                            nextDIdx = 0;
                        }
                    }
                }
            } else if (practiceRef.current === '拗濁音の練習') {
                if (currentGIdx < 0 || currentGIdx >= youdakuonPracticeData.length) { console.error("拗濁音練習で無効な gIdx"); }
                else {
                    const currentGroup = youdakuonPracticeData[currentGIdx];
                    if (currentDIdx < currentGroup.chars.length - 1) {
                        nextDIdx = currentDIdx + 1;
                    } else {
                        nextDIdx = 0;
                        nextGIdx = (currentGIdx + 1) % youdakuonPracticeData.length;
                    }
                }
            } else if (practiceRef.current === '拗半濁音の練習') {
                const currentGroup = youhandakuonPracticeData[0];
                if (currentDIdx < currentGroup.chars.length - 1) {
                    nextDIdx = currentDIdx + 1;
                } else {
                    nextDIdx = 0;
                }
                nextGIdx = 0; // gIdx は常に 0
            }
            else if (practiceRef.current === '拗音拡張') {
                // 拗音拡張は dIdx が 1 と 3 の間を行き来する特殊なロジック
                if (currentDIdx === 1) { // 現在「ぃ」を練習していた場合
                    nextDIdx = 3; // 次は「ぇ」
                } else if (currentDIdx === 3) { // 現在「ぇ」を練習していた場合
                    nextDIdx = 1; // 次は次の行の「ぃ」
                    nextGIdx = (currentGIdx + 1) % youonGyouList.length;
                } else {
                    console.warn(`Invalid currentDIdx ${currentDIdx} in nextStage for 拗音拡張. Resetting to 1.`);
                    nextDIdx = 1; // 不正な場合はリセット
                }
            }
            else if (practiceRef.current === '外来語の発音補助') {
                 if (currentGIdx < 0 || currentGIdx >= gairaigoPracticeData.length) { console.error("外来語練習で無効な gIdx"); }
                 else {
                    const currentGroup = gairaigoPracticeData[currentGIdx];
                    if (currentDIdx < currentGroup.targets.length - 1) {
                        nextDIdx = currentDIdx + 1;
                    } else {
                        nextDIdx = 0;
                        nextGIdx = (currentGIdx + 1) % gairaigoPracticeData.length;
                    }
                 }
            }
            // ▲▲▲ 修正完了 ▲▲▲

            console.log(`[nextStage setTimeout Before Set State] Final next: nextGIdx=${nextGIdx}, nextDIdx=${nextDIdx}`);
            setGIdx(nextGIdx);
            setDIdx(nextDIdx);
            setOK(false);
            console.log(`[nextStage setTimeout After Set State] State update requested.`);
        }, 1000);
    // ▼▼▼ 依存配列から gIdx, dIdx を削除 ▼▼▼
    }, [isRandomMode, /* ...他の練習データ... */ gyouList, danOrder, youonGyouList, youonGyouChars, dakuonGyouList, dakuonGyouChars, handakuonGyouList, handakuonGyouChars, sokuonKomojiData, kigoPractice1Data, kigoPractice2Data, kigoPractice3Data, youdakuonPracticeData, youhandakuonPracticeData, youonKakuchoChars, gairaigoPracticeData]);
    // ▲▲▲ 修正 ▲▲▲

    // onInput (依存配列修正済み & ref を使用)
    const onInput: (ev: HIDInputReportEvent) => void = useCallback((ev) => {
        const data = new Uint8Array(ev.data.buffer);
        const reportId = data[0];
        const keyCode = data[1];
        const timestamp = Date.now();

        console.log(`[App.onInput] Start - kb: ${kb}, reportId: 0x${reportId.toString(16)}, keyCode: 0x${keyCode.toString(16)}`);

        // ▼▼▼ 強制 ON 処理コメントアウト確認 ▼▼▼
        /*
        if (reportId === 0x14 && keyCode === 0x03) {
            if (!trainingRef.current) { // ← ref を使用
                console.log("Forcing training mode ON");
                setTraining(true);
                setShowKeyLabels(true);
                console.log(`[onInput Force Training] Setting isRandomMode to: false`);
                setIsRandomMode(false);
            }
            return;
        }
        */
        // ▲▲▲ コメントアウト確認 ▲▲▲

        // ▼▼▼ 条件分岐で ref を使用 ▼▼▼
        console.log(`[App.onInput] Checking condition: reportId === 0x15 (${reportId === 0x15}), trainingRef.current (${trainingRef.current}), practiceRef.current ('${practiceRef.current}'), activePracticeRef.current (${!!activePracticeRef.current})`);

        if (reportId === 0x15 && trainingRef.current && practiceRef.current && activePracticeRef.current) { // ← ref を使用
            console.log(`[App.onInput] Processing reportId 0x15. Practice: ${practiceRef.current}`); // ← ref を使用
            const releaseOffset = 0x14;
            const maxStartLayoutKeyCode = 0x14;
            const isPressEventAdjusted = keyCode <= maxStartLayoutKeyCode;
            const isReleaseEventAdjusted = keyCode >= (releaseOffset + 1);

            console.log(`[App.onInput] maxStart: 0x${maxStartLayoutKeyCode.toString(16)}, releaseOffset: 0x${releaseOffset.toString(16)}`);
            console.log(`[App.onInput] isPress: ${isPressEventAdjusted}, isRelease: ${isReleaseEventAdjusted}`);

            if (isPressEventAdjusted) {
                const pressCode = keyCode;
                console.log(`[App.onInput] Press event detected. Recording pressCode: 0x${pressCode.toString(16)}`);
                pressedKeysRef.current.set(pressCode, timestamp);

                const inputInfo: PracticeInputInfo = { type: 'press', timestamp, pressCode };
                console.log(`[App.onInput] Calling activePracticeRef.current.handleInput (press):`, inputInfo);
                activePracticeRef.current.handleInput(inputInfo); // ← ref を使用

            } else if (isReleaseEventAdjusted) {
                const pressCode = keyCode - releaseOffset;
                console.log(`[App.onInput] Release event detected. Calculated pressCode: 0x${pressCode.toString(16)} (keyCode: 0x${keyCode.toString(16)})`);

                if (pressCode <= 0) {
                    console.warn(`[App.onInput] Invalid calculated pressCode: 0x${pressCode.toString(16)}. Ignoring release event.`);
                    return;
                }

                const pressTimestamp = pressedKeysRef.current.get(pressCode);
                if (pressTimestamp) {
                    console.log(`[App.onInput] Found matching press event for pressCode: 0x${pressCode.toString(16)}`);
                    pressedKeysRef.current.delete(pressCode);

                    const inputInfo: PracticeInputInfo = { type: 'release', timestamp, pressCode };
                    console.log(`[App.onInput] Calling activePracticeRef.current.handleInput (release):`, inputInfo);
                    const result = activePracticeRef.current.handleInput(inputInfo); // ← ref を使用
                    console.log(`[App.onInput] activePracticeRef.current.handleInput result:`, result);

                    if (result.isExpected) {
                        console.log(`[App.onInput] Input is expected. shouldGoToNext: ${result.shouldGoToNext}`);
                        // ▼▼▼ practiceRef.current を使用 ▼▼▼
                        if (result.shouldGoToNext && practiceRef.current !== 'かな入力１分間トレーニング') { // ← ref を使用
                            console.log(`[App.onInput] Calling nextStage()`);
                            nextStage(); // nextStage は useCallback でメモ化されており、内部で practice state を参照しているが、nextStage 自体の参照は変わらない想定
                        }
                    } else {
                        console.log(`[App.onInput] Input is NOT expected. Calling handleInvalidInput(0x${pressCode.toString(16)})`);
                        handleInvalidInput(pressCode);
                    }
                } else {
                    console.warn(`[App.onInput] Matching press event NOT FOUND for calculated pressCode: 0x${pressCode.toString(16)}. Current pressedKeys:`, Array.from(pressedKeysRef.current.keys()).map(k => `0x${k.toString(16)}`));
                }
            }
        } else {
             console.log(`[App.onInput] Ignoring input because condition was false.`);
        }
     // ▼▼▼ 依存配列から training, practice, activePractice を削除 ▼▼▼
     }, [handleInvalidInput, nextStage, setTraining, setShowKeyLabels, setIsRandomMode, kb, side]);
     // ▲▲▲ 依存配列修正 ▲▲▲

    /* HID send (練習 ON/OFF) */ // (依存配列修正済み)
    const sendHid: (on: boolean) => Promise<void> = useCallback(async (on) => {
        // ▼▼▼ デバッグログ追加 ▼▼▼
        console.log(`[sendHid] Called with on=${on}`);
        // ▲▲▲ デバッグログ追加 ▲▲▲

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
            // ▼▼▼ レポート送信直前ログ ▼▼▼
            console.log(`[sendHid] Attempting to send report: 0x02, ${on ? '0x01' : '0x00'}`);
            // ▲▲▲ ログ追加 ▲▲▲
            await dev.sendReport(0, new Uint8Array([0x02, on ? 0x01 : 0x00]));
            // ▼▼▼ レポート送信成功ログ ▼▼▼
            console.log(`[sendHid] Report sent successfully.`);
            // ▲▲▲ ログ追加 ▲▲▲
        } catch (err) {
            // ▼▼▼ エラーログを詳細化 ▼▼▼
            console.error("[sendHid] Failed to send HID report:", err);
            // ▲▲▲ 修正 ▲▲▲
            // エラーが発生しても setTraining を呼ぶか、ここで return するか検討
            // return; // エラー時は状態変更しない場合
        }

        // ▼▼▼ setTraining 直前ログ ▼▼▼
        console.log(`[sendHid] Calling setTraining(${on})`);
        // ▲▲▲ ログ追加 ▲▲▲
        setTraining(on);
        if (on) {
            setShowKeyLabels(true);
            // ▼▼▼ 練習モードON時はランダム OFF にする ▼▼▼
            console.log(`[sendHid ON] Setting isRandomMode to: false`);
            setIsRandomMode(false);
            // ▲▲▲ 変更完了 ▲▲▲
        } else {
            setPractice('');
            setGIdx(0); setDIdx(0);
            setOK(false);
            setLastInvalidKeyCode(null);
            if (invalidInputTimeoutRef.current !== null) {
                clearTimeout(invalidInputTimeoutRef.current);
                invalidInputTimeoutRef.current = null;
            }
            pressedKeysRef.current.clear();
            activePracticeRef.current?.reset?.(); // ← ref を使用
            setShowKeyLabels(true);
            // ▼▼▼ 練習モードOFF時もランダム OFF にする ▼▼▼
            console.log(`[sendHid OFF] Setting isRandomMode to: false`);
            setIsRandomMode(false);
            // ▲▲▲ 変更完了 ▲▲▲
            console.log(`[sendHid] Practice mode turned OFF. Resetting states.`); // ログ追加
        }
     // ▼▼▼ 依存配列から activePractice を削除 ▼▼▼
     }, [setTraining, setPractice, setGIdx, setDIdx, setOK, setLastInvalidKeyCode, setShowKeyLabels, setIsRandomMode]);
     // ▲▲▲ 修正 ▲▲▲

    /* 初期化 */ // (依存配列修正済み)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        // ▼▼▼ URLパラメータがない場合のデフォルト値を tw-20v と right に変更 ▼▼▼
        const kbRaw = params.get('kb') ?? 'tw-20v'; // デフォルトを 'tw-20v' に変更
        const sideRaw = params.get('side') ?? 'right'; // デフォルトは 'right' のまま
        // ▲▲▲ 変更完了 ▲▲▲

        const currentKb: KeyboardModel = kbRaw === 'tw-20h' ? 'tw-20h' : 'tw-20v';
        setKb(currentKb);
        console.log(`Initialized kb model to: ${currentKb}`);

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
                    console.log("No HID devices found on init.");
                    return;
                }
                const device = ds[0];
                console.log("Found existing HID device:", device);
                if (!opening.current && !(device as any).opened) {
                    opening.current = true;
                    try {
                        console.log("Opening existing HID device...");
                        await device.open();
                        console.log("Existing HID device opened.");
                        device.oninputreport = onInput; // ここは変更なし (onInput の参照自体は変わらない)
                        devRef.current = device;
                    } catch (err) { console.error("既存のHIDデバイスを開けませんでした:", err); }
                    finally { opening.current = false; }
                } else if ((device as any).opened) {
                    console.log("Existing HID device already opened. Setting oninputreport.");
                    device.oninputreport = onInput; // ここは変更なし (onInput の参照自体は変わらない)
                    devRef.current = device;
                }
            } catch (err) { console.error("HIDデバイスの取得またはオープンに失敗:", err); }
        };
        initHid();

        // ▼▼▼ ログ追加 7: useEffect 完了時の isRandomMode 確認 ▼▼▼
        console.log(`[useEffect End] isRandomMode after init: ${isRandomMode}`);
        // ▲▲▲ ログ追加 ▲▲▲

        // ▼▼▼ クリーンアップ処理を修正 ▼▼▼
        return () => {
            const dev = devRef.current;
            // devRef.current を null に設定する前にローカル変数に保持
            if (dev) {
                console.log("Closing HID device on cleanup.");
                // イベントハンドラを確実に解除
                dev.oninputreport = null;
                // デバイスが開いている場合のみ close を試みる (close はコメントアウト中)
                // if ((dev as any).opened) {
                //     dev.close().catch(err => console.error("Error closing HID device:", err));
                // }
                // devRef を null に設定
                devRef.current = null;
            }
        };
        // ▲▲▲ 修正完了 ▲▲▲
     // ▼▼▼ 依存配列は変更なし (onInput は含まないまま) ▼▼▼
     }, [setTitle, setCols, setLayers, setFW, setSN, setShowTrainingButton, setSide, setKb, sampleJson, isRandomMode]);

    // 練習モード選択時のリセット処理
    const handlePracticeSelect = (item: PracticeMode) => {
        // ▼▼▼ ログ追加 2: handlePracticeSelect 呼び出し確認 ▼▼▼
        console.log(`[handlePracticeSelect] Called with item: ${item}. Current isRandomMode: ${isRandomMode}`);
        // ▲▲▲ ログ追加 ▲▲▲
        activePracticeRef.current?.reset?.(); // ← ref を使用
        setPractice(item);
        setGIdx(0);
        // ▼▼▼ チャレンジモード用の初期化を追加 (必要なら) ▼▼▼
        if (item === 'かな入力１分間トレーニング') {
            // 特有の初期化があればここに追加
            setDIdx(0); // dIdx は使わないかもしれないが念のためリセット
        } else if (item === '拗音拡張') {
            setDIdx(1);
        } else {
            setDIdx(0); // 外来語含む他のモードは 0
        }
        // ▲▲▲ 追加 ▲▲▲
        setOK(false);
        setLastInvalidKeyCode(null);
        if (invalidInputTimeoutRef.current !== null) {
            clearTimeout(invalidInputTimeoutRef.current);
            invalidInputTimeoutRef.current = null;
        }
        pressedKeysRef.current.clear();
        setShowKeyLabels(true);
        // ▼▼▼ チャレンジモードはランダムモードを強制的に ON にする (フック内で処理するので不要かも) ▼▼▼
        // if (item === 'かな入力１分間トレーニング') {
        //     console.log(`[handlePracticeSelect] Setting isRandomMode to: true for Challenge`);
        //     setIsRandomMode(true);
        // } else {
            console.log(`[handlePracticeSelect] Setting isRandomMode to: false`);
            setIsRandomMode(false); // デフォルトは OFF
        // }
        // ▲▲▲ 修正 ▲▲▲
     };

    // ランダムモード切り替えハンドラ
    const toggleRandomMode = useCallback(() => {
        // ▼▼▼ ログ追加 8: toggleRandomMode 呼び出し確認 ▼▼▼
        console.log(`[toggleRandomMode] Called. Current isRandomMode: ${isRandomMode}, practice: ${practiceRef.current}`); // ← ref を使用
        // ▲▲▲ ログ追加 ▲▲▲
        // ▼▼▼ チャレンジモード中はランダムモードを切り替えられないようにする ▼▼▼
        if (practiceRef.current === 'かな入力１分間トレーニング') { // ← ref を使用
            console.warn("Cannot toggle random mode during challenge.");
            return;
        }
        // ▲▲▲ 追加 ▲▲▲
        const nextIsRandomMode = !isRandomMode;
        // ▼▼▼ ログ追加 9: toggleRandomMode での setIsRandomMode 直前確認 ▼▼▼
        console.log(`[toggleRandomMode] Setting isRandomMode to: ${nextIsRandomMode}`);
        // ▲▲▲ ログ追加 ▲▲▲
        setIsRandomMode(nextIsRandomMode);
        activePracticeRef.current?.reset?.(); // ← ref を使用
     // ▼▼▼ 依存配列から activePractice, practice を削除 ▼▼▼
     }, [setIsRandomMode, isRandomMode]);
     // ▲▲▲ 修正 ▲▲▲

    /* heading（見出し） - PracticeHeading コンポーネントに移動 */
    // const heading = useMemo(() => { /* ... */ }, [/* ... */]);

    /* キー描画 - KeyboardLayout コンポーネントに移動 */
    // const renderKana = useCallback((layoutIndex: number) => (key: string, idx: number) => { /* ... */ }, [/* ... */]);

    // ボタンのスタイル (変更なし)
    const buttonStyle: React.CSSProperties = {
        marginBottom: '0.5rem',
        padding: '5px 10px',
        display: 'block',
        minWidth: '120px',
        textAlign: 'center',
     };

    // コンポーネント全体のJSX
    return (
        // ▼▼▼ 一番外側の div に pt-20 を追加 (方法2も念のため適用しておく) ▼▼▼
        <div className='p-4 pt-20'>
            {/* ボタンエリア */}
            {showTrainingButton && (
                // ▼▼▼ ボタンエリアの z-index を高く設定 ▼▼▼
                <div className="absolute top-4 right-4 flex flex-col space-y-2 items-end z-50">
                    <button
                        className={`px-4 py-1 rounded shadow text-white ${training ? 'bg-gray-600' : 'bg-green-600'}`}
                        onClick={() => {
                            console.log(`[Button Click] Training ${training ? 'OFF' : 'ON'} button clicked. Current training state: ${training}`);
                            sendHid(!training);
                        }}
                        style={buttonStyle}
                    >
                        {training ? '練習モード OFF' : '練習モード ON'}
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
                            {practice !== 'かな入力１分間トレーニング' && (
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
                // ▲▲▲ z-index 追加 ▲▲▲
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
                    {/* ヘッダ表示 */}
                    {practice && (
                        // ▼▼▼ ヘッダーを囲む div に上マージンを追加 (方法1) ▼▼▼
                        // mt-16 (4rem) を追加。必要に応じて mt-20 などに調整してください。
                        // <div className="mt-16">  // ← 方法1のみの場合
                        <div> {/* 方法2の pt-20 と併用する場合は mt-* は不要な場合が多い */}
                            <PracticeHeading
                                activePractice={activePractice}
                                isRandomMode={practice === 'かな入力１分間トレーニング' ? true : isRandomMode}
                                practice={practice}
                                gIdx={gIdx}
                                dIdx={dIdx}
                                currentFunctionKeyMap={currentFunctionKeyMap}
                                fixedWidthNum={fixedWidthNum}
                            />
                        </div>
                        // ▲▲▲ マージン追加 ▲▲▲
                    )}

                    <div className='grid grid-cols-3 gap-4 items-start'>
                        {/* メニュー表示 */}
                        <PracticeMenu
                            practice={practice}
                            handlePracticeSelect={handlePracticeSelect}
                        />

                        {/* 練習モードに応じたキーボード表示 */}
                        <div className="col-span-2 grid grid-cols-2 gap-4 justify-items-center">
                            {/* ... (キーボードレイアウト表示部分は変更なし) ... */}
                            {(practice === 'かな入力１分間トレーニング') ? (
                                <>
                                    {/* かなモード（スタート） */}
                                    <KeyboardLayout
                                        layerData={layers[2]}
                                        layoutIndex={2}
                                        layoutTitle="かなモード（スタート）"
                                        cols={cols}
                                        fixedWidth={fixedWidth}
                                        showKeyLabels={showKeyLabels}
                                        lastInvalidKeyCode={lastInvalidKeyCode}
                                        activePractice={activePractice}
                                        practice={practice}
                                        currentFunctionKeyMap={currentFunctionKeyMap}
                                        training={training}
                                    />

                                    {/* かなモード（エンド） */}
                                    <KeyboardLayout
                                        layerData={layers[3]}
                                        layoutIndex={3}
                                        layoutTitle="かなモード（エンド）"
                                        cols={cols}
                                        fixedWidth={fixedWidth}
                                        showKeyLabels={showKeyLabels}
                                        lastInvalidKeyCode={lastInvalidKeyCode}
                                        activePractice={activePractice}
                                        practice={practice}
                                        currentFunctionKeyMap={currentFunctionKeyMap}
                                        training={training}
                                    />
                                </>
                            ) : (practice && !['記号の基本練習１', '記号の基本練習２', '記号の基本練習３'].includes(practice)) ? (
                                <>
                                    {/* かなモード（スタート） */}
                                    <KeyboardLayout
                                        layerData={layers[2]}
                                        layoutIndex={2}
                                        layoutTitle="かなモード（スタート）"
                                        cols={cols}
                                        fixedWidth={fixedWidth}
                                        showKeyLabels={showKeyLabels}
                                        lastInvalidKeyCode={lastInvalidKeyCode}
                                        activePractice={activePractice}
                                        practice={practice}
                                        currentFunctionKeyMap={currentFunctionKeyMap}
                                        training={training}
                                    />

                                    {/* かなモード（エンド） */}
                                    <KeyboardLayout
                                        layerData={layers[3]}
                                        layoutIndex={3}
                                        layoutTitle="かなモード（エンド）"
                                        cols={cols}
                                        fixedWidth={fixedWidth}
                                        showKeyLabels={showKeyLabels}
                                        lastInvalidKeyCode={lastInvalidKeyCode}
                                        activePractice={activePractice}
                                        practice={practice}
                                        currentFunctionKeyMap={currentFunctionKeyMap}
                                        training={training}
                                    />
                                </>
                            ) : ['記号の基本練習２', '記号の基本練習３'].includes(practice) ? (
                                <div className="col-span-2 flex justify-center">
                                    <KeyboardLayout
                                        layerData={layers[2]}
                                        layoutIndex={2}
                                        layoutTitle={practice === '記号の基本練習２' ? '記号２ (後押し)' : '記号３（先押し）'}
                                        cols={cols}
                                        fixedWidth={fixedWidth}
                                        showKeyLabels={showKeyLabels}
                                        lastInvalidKeyCode={lastInvalidKeyCode}
                                        activePractice={activePractice}
                                        practice={practice}
                                        currentFunctionKeyMap={currentFunctionKeyMap}
                                        training={training}
                                    />
                                </div>
                            ) : practice === '記号の基本練習１' ? (
                                <div className="col-span-2 flex justify-center">
                                    <KeyboardLayout
                                        layerData={layers[6]}
                                        layoutIndex={6}
                                        layoutTitle="記号１ (長押し)"
                                        cols={cols}
                                        fixedWidth={fixedWidth}
                                        showKeyLabels={showKeyLabels}
                                        lastInvalidKeyCode={lastInvalidKeyCode}
                                        activePractice={activePractice}
                                        practice={practice}
                                        currentFunctionKeyMap={currentFunctionKeyMap}
                                        training={training}
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </>
            ) : ( // 練習モードOFF時の表示
                 <div className='grid grid-cols-2 gap-4'>
                     {layers.map((layer: string[], li: number) => {
                        console.log(`Rendering KeyboardLayout (OFF mode) - layerIndex: ${li}, training prop: ${training}`);
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
