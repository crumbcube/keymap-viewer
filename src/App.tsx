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
    seionPracticeData, // practiceDataMap で使用
    youonPracticeData, // practiceDataMap で使用
    dakuonPracticeData, // practiceDataMap で使用
    handakuonPracticeData, // practiceDataMap で使用
    youonKakuchoPracticeData, // practiceDataMap で使用
    youdakuonDanMapping, // calculateNextIndices で使用
    youhandakuonDanMapping, // calculateNextIndices で使用
} from './data/keymapData';

// 各練習モードに対応する練習データをマップとして定義
const practiceDataMap: Record<string, any[]> = {
    '清音の基本練習': seionPracticeData,
    '拗音の基本練習': youonPracticeData,
    '濁音の基本練習': dakuonPracticeData,
    '半濁音の基本練習': handakuonPracticeData,
    '小文字(促音)の基本練習': sokuonKomojiData,
    '記号の基本練習１': kigoPractice1Data,
    '記号の基本練習２': kigoPractice2Data,
    '記号の基本練習３': kigoPractice3Data,
    '拗濁音の練習': youdakuonPracticeData,
    '拗半濁音の練習': youhandakuonPracticeData,
    '拗音拡張': youonKakuchoPracticeData,
    '外来語の発音補助': gairaigoPracticeData,
    // チャレンジモードは別途データ構造が異なるため、ここでは含めないか、別の扱いをする
};

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

// ユーティリティ関数: チャレンジモードかどうかを判定
const isChallengeMode = (mode: PracticeMode | ''): boolean => { // Allow ''
    if (!mode) return false; // If mode is '', it's not a challenge mode
    return mode === 'かな入力１分間トレーニング' || mode === '記号入力１分間トレーニング' || mode === '短文入力３分間トレーニング';
};

export default function App() {
    /* UI 状態 */
    const [layers, setLayers] = useState<string[][]>([]);
    const [title, setTitle] = useState('TW-20H レイアウト');
    const [fw, setFW] = useState<string | null>(null);
    const [sn, setSN] = useState<string | null>(null);
    const [cols, setCols] = useState(5);
    const [training, setTraining] = useState(false);
    const [practice, setPractice] = useState<PracticeMode | ''>(''); // Allow '' for initial state
    const [showTrainingButton, setShowTrainingButton] = useState(false);
    const [side, setSide] = useState<KeyboardSide>('right');
    const [kb, setKb] = useState<KeyboardModel>('tw-20v');
    const [showKeyLabels, setShowKeyLabels] = useState(true);
    const [isRandomMode, setIsRandomMode] = useState(false);


    /* 現在の行/段/文字インデックス */
    const [gIdx, setGIdx] = useState(0); // 初期値は 0 に戻す
    const [dIdx, setDIdx] = useState(0); // 初期値は 0 に戻す

    /* UIフィードバック */
    const [lastInvalidKeyCode, setLastInvalidKeyCode] = useState<number | null>(null);

    /* HID / カウンタ */
    const devRef = useRef<HIDDevice | null>(null);
    const opening = useRef(false);
    const invalidInputTimeoutRef = useRef<number | null>(null);
    const pressedKeysRef = useRef<Map<number, number>>(new Map());
    const lastInvalidInputTime = useRef<number>(0);

    const trainingRef = useRef(training);
    const practiceRef = useRef(practice);
    const activePracticeRef = useRef<PracticeHookResult | null>(null);
    const gIdxRef = useRef(gIdx);
    const dIdxRef = useRef(dIdx);

    // calculateNextIndices 関数の定義 (nextStage より前に定義)
    const calculateNextIndices = useCallback((
        currentGIdx: number,
        currentDIdx: number,
        isRandomMode: boolean | undefined,
        dataForMode: any[] | undefined
    ): { nextGIdx: number; nextDIdx: number } => {
        let nextGIdx = currentGIdx;
        let nextDIdx = currentDIdx + 1;

        if (isRandomMode) {
            // ランダムモードの場合、インデックス計算はスキップ
            // (App.tsx側で別途ターゲット選択ロジックを呼び出す想定)
            return { nextGIdx: currentGIdx, nextDIdx: currentDIdx };
        }

        if (!dataForMode || dataForMode.length === 0) {
            console.error("[App calculateNextIndices] No practice data provided for current mode.");
            return { nextGIdx: 0, nextDIdx: 0 };
        }

        if (nextGIdx >= dataForMode.length) {
            // gIdx が既に範囲外なら最初に戻る
            return { nextGIdx: 0, nextDIdx: 0 };
        }
        const currentGroup = dataForMode[nextGIdx];
        if (!currentGroup) {
            // 現在のグループデータがなければ最初に戻る
            return { nextGIdx: 0, nextDIdx: 0 };
        }

        // グループ内の要素数を取得 (inputs または chars の長さを想定)
        const groupLength = currentGroup.inputs?.length ?? currentGroup.chars?.length ?? 0;

        if (groupLength === 0 && nextGIdx < dataForMode.length - 1) {
            // 要素がないグループで、かつ最後のグループでなければ次のグループへ
            nextDIdx = 0;
            nextGIdx = currentGIdx + 1;
        } else if (nextDIdx >= groupLength) {
            // 現在のグループの最後に達した
            nextDIdx = 0;
            nextGIdx = currentGIdx + 1;
        }

        if (nextGIdx >= dataForMode.length) {
            // 全てのグループを終えた場合
            if (isChallengeMode(practice)) { // practice state を参照
                // チャレンジモードでは終了処理 (ここでは何もしないか、特別な値を返す)
                // console.log("[App calculateNextIndices] Challenge mode finished all groups.");
                // setIsPracticeActive(false); // 例
            } else {
                // 通常練習モードでは最初のグループに戻る
                // console.log("[App calculateNextIndices] All groups finished. Resetting to the first group.");
                nextGIdx = 0;
            }
        }
        return { nextGIdx, nextDIdx };
    }, [practice]); // practice を依存配列に追加 (isChallengeMode で参照するため)

    // 次の練習ステージに進む関数
    const nextStage = useCallback((currentPracticeMode: PracticeMode | '') => { // Allow '' for currentPracticeMode
        // console.log(`[App nextStage] Called. Current mode: '${currentPracticeMode}', gIdx=${gIdx}, dIdx=${dIdx}, isRandomMode=${isRandomMode}`);

        if (!currentPracticeMode) { // Simplified check, handles ''
            console.error(`[App nextStage] Current practice mode ('${currentPracticeMode}') is not set or is empty. Cannot advance.`);
            return;
        }

        // At this point, TypeScript knows currentPracticeMode is of type PracticeMode (a non-empty string)

        const dataForCurrentMode = practiceDataMap[currentPracticeMode];
        if (!dataForCurrentMode && !isRandomMode && !isChallengeMode(currentPracticeMode)) {
            console.error(`[App nextStage] No practice data found for mode: '${currentPracticeMode}'`);
            return;
        }

        const { nextGIdx, nextDIdx } = calculateNextIndices(gIdx, dIdx, isRandomMode, dataForCurrentMode);
        // console.log(`[App nextStage] Calculated next indices: nextGIdx=${nextGIdx}, nextDIdx=${nextDIdx}. Setting state...`);
        setGIdx(nextGIdx);
        setDIdx(nextDIdx);
    }, [isRandomMode, gIdx, dIdx, setGIdx, setDIdx, calculateNextIndices]); // calculateNextIndices を依存配列に追加

    // --- カスタムフックの呼び出し ---
    const commonHookProps: PracticeHookProps = useMemo(() => ({
        gIdx,
        dIdx,
        isActive: false, // 各フックで practice === 'モード名' で上書きされる
        side,
        layers,
        kb,
        isRandomMode,
        showKeyLabels, // Add showKeyLabels here
        onAdvance: () => nextStage(practice) // nextStage に現在の practice state を渡す
    }), [gIdx, dIdx, side, layers, kb, isRandomMode, practice, nextStage, showKeyLabels]); // And add showKeyLabels to the dependency array

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
            case 'かな入力１分間トレーニング': return kanaChallengePractice;
            case '記号入力１分間トレーニング': return kigoChallengePractice;
            case '短文入力３分間トレーニング': return tanbunChallengePractice;
            default: return null;
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

    // キーボード表示の固定幅
    const keyWidthRem = 5.5;
    const fixedWidthNum = cols * keyWidthRem;
    const fixedWidth = `${fixedWidthNum}rem`;

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb as keyof typeof functionKeyMaps]?.[side as keyof typeof functionKeyMaps[keyof typeof functionKeyMaps]] ?? {};
    }, [kb, side]);

    // --- 不正入力処理 ---
    const handleInvalidInput = useCallback((pressCode: number) => {
        //console.log(`[App handleInvalidInput] Called with pressCode: 0x${pressCode.toString(16)}`);
        const now = Date.now();
        if (now - lastInvalidInputTime.current < 50) {
            //console.log(`[App handleInvalidInput] Debounced.`);
            return;
        }
        lastInvalidInputTime.current = now;

        //console.log(`[App handleInvalidInput] Setting lastInvalidKeyCode to: 0x${pressCode.toString(16)}`);
        setLastInvalidKeyCode(pressCode);

        if (invalidInputTimeoutRef.current !== null) {
            //console.log(`[App handleInvalidInput] Clearing existing invalid input timeout: ${invalidInputTimeoutRef.current}`);
            clearTimeout(invalidInputTimeoutRef.current);
        }

        // Always highlight incorrect inputs in red for 0.5 seconds (500ms).
        const invalidHighlightDuration = 500;

        //console.log(`[App handleInvalidInput] Setting new timeout for ${invalidHighlightDuration}ms to clear code 0x${pressCode.toString(16)}`);
        const timerId = window.setTimeout((codeToClear: number) => {
            //console.log(`[App handleInvalidInput TIMEOUT] Attempting to clear highlight for code 0x${codeToClear.toString(16)}. Current lastInvalidKeyCode: 0x${lastInvalidKeyCode?.toString(16) ?? 'null'}`);
            setLastInvalidKeyCode(prevCode => {
                if (prevCode === codeToClear) {
                    //console.log(`[App handleInvalidInput TIMEOUT] Cleared lastInvalidKeyCode from 0x${prevCode?.toString(16)} to null.`);
                    return null;
                }
                //console.log(`[App handleInvalidInput TIMEOUT] Did not clear. prevCode (0x${prevCode?.toString(16) ?? 'null'}) !== codeToClear (0x${codeToClear.toString(16)}).`);
                return prevCode;
            });
            invalidInputTimeoutRef.current = null;
        }, invalidHighlightDuration, pressCode);
        invalidInputTimeoutRef.current = timerId;
    }, []); // lastInvalidKeyCode is read in timeout via closure, but setter uses functional update. Refs don't need to be in deps.

    // onInput
    const onInput: (ev: HIDInputReportEvent) => void = useCallback((ev) => {
        const data = new Uint8Array(ev.data.buffer);
        const reportId = data[0];
        const keyCode = data[1];
        const timestamp = Date.now();


        if (reportId === 0x14 && keyCode === 0x03) {
            if (!trainingRef.current) {
                setTraining(true);
                setShowKeyLabels(true);
                setIsRandomMode(false);
            }
            return;
        }

        if (reportId === 0x15 && trainingRef.current && practiceRef.current && activePracticeRef.current) {
            const releaseOffset = 0x14;
            const maxStartLayoutKeyCode = 0x14;
            const isPressEventAdjusted = keyCode <= maxStartLayoutKeyCode;
            const isReleaseEventAdjusted = keyCode >= (releaseOffset + 1);


            if (isPressEventAdjusted) {
                const pressCode = keyCode;
                pressedKeysRef.current.set(pressCode, timestamp);

                const inputInfo: PracticeInputInfo = { type: 'press', timestamp, pressCode };
                activePracticeRef.current.handleInput(inputInfo);

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
                    const result = activePracticeRef.current.handleInput(inputInfo);

                    if (result.isExpected) {
                        if (result.shouldGoToNext && practiceRef.current !== 'かな入力１分間トレーニング' && practiceRef.current !== '記号入力１分間トレーニング' && practiceRef.current !== '短文入力３分間トレーニング') {
                            nextStage(practiceRef.current);
                        }
                   } else {
                        handleInvalidInput(pressCode);
                    }
                } else {
                    console.warn(`[App.onInput] Matching press event NOT FOUND for calculated pressCode: 0x${pressCode.toString(16)}. Current pressedKeys:`, Array.from(pressedKeysRef.current.keys()).map(k => `0x${k.toString(16)}`));
                }
            }
        }
    }, [handleInvalidInput, nextStage, setTraining, setShowKeyLabels, setIsRandomMode, kb, side]);

    /* HID send (練習 ON/OFF) */
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
            setLastInvalidKeyCode(null);
            if (invalidInputTimeoutRef.current !== null) {
                clearTimeout(invalidInputTimeoutRef.current);
                invalidInputTimeoutRef.current = null;
            }
            pressedKeysRef.current.clear();
            activePracticeRef.current?.reset?.();
            setShowKeyLabels(true);
            setIsRandomMode(false);
        }
     }, [setTraining, setPractice, setGIdx, setDIdx, setLastInvalidKeyCode, setShowKeyLabels, setIsRandomMode]);

    /* 初期化 */
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const kbRaw = params.get('kb') ?? 'tw-20v';
        const sideRaw = params.get('side') ?? 'right';

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
                        device.oninputreport = onInput;
                        devRef.current = device;
                    } catch (err) { console.error("既存のHIDデバイスを開けませんでした:", err); }
                    finally { opening.current = false; }
                } else if ((device as any).opened) {
                    device.oninputreport = onInput;
                    devRef.current = device;
                }
            } catch (err) { console.error("HIDデバイスの取得またはオープンに失敗:", err); }
        };
        initHid();


        return () => {
            const dev = devRef.current;
            if (dev) {
                dev.oninputreport = null;
                devRef.current = null;
            }
        };
     }, [setTitle, setCols, setLayers, setFW, setSN, setShowTrainingButton, setSide, setKb, sampleJson, isRandomMode, onInput]);

    // 練習モード選択時のリセット処理
    const handlePracticeSelect = (item: PracticeMode) => {
        activePracticeRef.current?.reset?.();
        setPractice(item);
        setGIdx(0);
        if (item === 'かな入力１分間トレーニング' || item === '記号入力１分間トレーニング' || item === '短文入力３分間トレーニング') {
            setDIdx(0);
        } else if (item === '拗音拡張') {
            setDIdx(1);
        } else if (item === '外来語の発音補助') {
            setDIdx(3);
        } else {
            setDIdx(0);
        }
        setLastInvalidKeyCode(null);
        if (invalidInputTimeoutRef.current !== null) {
            clearTimeout(invalidInputTimeoutRef.current);
            invalidInputTimeoutRef.current = null;
        }
        pressedKeysRef.current.clear();
        setShowKeyLabels(true);
        setIsRandomMode(false);
     };

    // ランダムモード切り替えハンドラ
    const toggleRandomMode = useCallback(() => {
        if (practiceRef.current === 'かな入力１分間トレーニング' || practiceRef.current === '記号入力１分間トレーニング' || practiceRef.current === '短文入力３分間トレーニング') {
            console.warn("Cannot toggle random mode during challenge.");
            return;
        }
        const nextIsRandomMode = !isRandomMode;
        setIsRandomMode(nextIsRandomMode);
        activePracticeRef.current?.reset?.();
     }, [setIsRandomMode, isRandomMode]);

    // ボタンのスタイル
    const buttonStyle: React.CSSProperties = {
        marginBottom: '0.5rem',
        padding: '5px 10px',
        display: 'block',
        minWidth: '120px',
        textAlign: 'center',
     };

    const displayLayerIndices = useMemo(() => {
        if (training) {
            if (practice === '記号入力１分間トレーニング' && activePractice?.targetLayerIndex !== null && activePractice?.targetLayerIndex !== undefined) {
                return [activePractice.targetLayerIndex];
            }
            else if (practice === '記号の基本練習１') return [6];
            else if (practice === '記号の基本練習２') return [7];
            else if (practice === '記号の基本練習３') return [8];
            else if (practice && practice !== '記号入力１分間トレーニング' && practice !== '短文入力３分間トレーニング') {
                return [2, 3];
            }
            else if (practice === '記号入力１分間トレーニング') {
                return [2];
            } else {
                if (practice === '短文入力３分間トレーニング') {
                    return [];
                }
                return [];
            }
        }
        return [];
    }, [training, practice, activePractice?.targetLayerIndex]);

    const keyboardLayers = useMemo(() => {
        const baseLayers = sampleJson[kb]?.[side]?.layers ?? [];

        if (practice === '記号入力１分間トレーニング' && activePractice?.displayLayers) {
            return activePractice.displayLayers;
        }

        if (practice === '記号の基本練習３') {
            return baseLayers;
        }
        return baseLayers;

    }, [practice, activePractice, kb, side]);

    // ヘッダーに表示する文字配列
    const headingChars = useMemo(() => {
        if (!training || !practice || !activePractice) return [];

        let data: any[] = [];
        let groupKey: string | null = null;

        switch (practice) {
            case '清音の基本練習': data = gyouList.map(gyou => danOrder[gyou]); break;
            case '拗音の基本練習': data = youonGyouList.map((gyou: string) => youonGyouChars[gyou]); break;
            case '濁音の基本練習': data = dakuonGyouList.map((gyou: string) => dakuonGyouChars[gyou]); break;
            case '半濁音の基本練習': data = [handakuonGyouChars['は行']]; break;
            case '拗音拡張': data = youonGyouList.map((gyou: string) => youonKakuchoChars[gyou]); break;
            case 'かな入力１分間トレーニング': {
                return activePractice.headingChars;
            }
            case '記号入力１分間トレーニング': {
                return activePractice.headingChars;
            }
            case '短文入力３分間トレーニング': {
                return activePractice.headingChars;
            }
            case '小文字(促音)の基本練習': data = sokuonKomojiData; groupKey = 'chars'; break;
            case '記号の基本練習１': data = kigoPractice1Data; groupKey = 'chars'; break;
            case '記号の基本練習２': data = kigoPractice2Data; groupKey = 'chars'; break;
            case '記号の基本練習３': data = kigoPractice3Data; groupKey = 'chars'; break;
            case '拗濁音の練習': data = youdakuonPracticeData; groupKey = 'chars'; break;
            case '拗半濁音の練習': data = youhandakuonPracticeData; groupKey = 'chars'; break;
            case '外来語の発音補助':
                data = gairaigoPracticeData;
                groupKey = 'headerChars';
                break;
            default: return [];
        }

        const result = (() => {
            if (isRandomMode) {
                const targetChar = activePractice.headingChars?.[0];
                return targetChar ? [targetChar] : [];
            }

            if (gIdx >= 0 && gIdx < data.length) {
                const group = data[gIdx];
                if (Array.isArray(group)) { return group; }
                else if (typeof group === 'object' && group !== null && groupKey && group[groupKey]) { return group[groupKey]; }
            }
            return [];
        })();
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

                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div className={`${
                                    'col-start-1 justify-self-center w-full'
                                }`}>
                                    {activePractice?.status === 'countdown' && activePractice?.countdownValue && activePractice.countdownValue > 0 && (
                                        <div className="flex items-center justify-center mb-4">
                                            <div className="text-5xl font-bold">
                                                {activePractice.countdownValue}
                                            </div>
                                        </div>
                                    )}
                                    {activePractice?.status !== 'countdown' && (
                                        <PracticeHeading
                                            isRandomMode={(practice === 'かな入力１分間トレーニング' || practice === '記号入力１分間トレーニング' || practice === '短文入力３分間トレーニング') ? true : isRandomMode}
                                            practice={practice}
                                            gIdx={gIdx}
                                            dIdx={dIdx}
                                            headingChars={headingChars}
                                            isFinished={isChallengeFinished}
                                            typedEndIndex={activePractice?.typedEndIndex}
                                            status={activePractice?.status}
                                        />
                                    )}
                                </div>
                                {isChallengeFinished ? (
                                    <div className="flex items-center p-4 border rounded bg-gray-50 col-start-1 justify-self-center" style={{ minHeight: '15rem' }}>
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
                                    <>
                                        {displayLayerIndices.length === 1 ? (
                                            keyboardLayers[displayLayerIndices[0]] && (
                                                <KeyboardLayout
                                                    key={displayLayerIndices[0]}
                                                    layerData={keyboardLayers[displayLayerIndices[0]]}
                                                    layoutIndex={displayLayerIndices[0]}
                                                    className="col-start-1 justify-self-center"
                                                    layoutTitle={layerNames[displayLayerIndices[0]] ?? `レイヤー ${displayLayerIndices[0]}`}
                                                    cols={cols} fixedWidth={fixedWidth} showKeyLabels={showKeyLabels} lastInvalidKeyCode={lastInvalidKeyCode} activePractice={activePractice} practice={practice} currentFunctionKeyMap={currentFunctionKeyMap} training={training}
                                                />
                                            )
                                        ) : displayLayerIndices.length === 2 && displayLayerIndices.includes(2) && displayLayerIndices.includes(3) ? (
                                            displayLayerIndices.map((layerIndex) => {
                                                const gridColClass = layerIndex === 2 ? 'col-start-1 justify-self-center' : 'col-start-2 justify-self-center';
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
                                            null
                                        )}
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
                            </div>
                        </div>
                    )}
                </>
            ) : (
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
