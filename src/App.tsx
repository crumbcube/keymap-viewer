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
} from './data/keymapData';
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
    const [okVisible, setOK] = useState(false);
    const okTimerRef = useRef<number | null>(null); // OK表示用タイマーref
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

        const timerId = window.setTimeout((codeToClear: number) => {
            setLastInvalidKeyCode(prevCode => {
                if (prevCode === codeToClear) {
                    return null;
                }
                return prevCode;
            });
            invalidInputTimeoutRef.current = null;
        }, 500, pressCode);
        invalidInputTimeoutRef.current = timerId;
     }, []); // 依存配列を空に修正

    // --- OK表示処理 ---
    const showOkFeedback = useCallback(() => {
        // 既存のタイマーがあればクリア
        if (okTimerRef.current !== null) {
            clearTimeout(okTimerRef.current);
        }
        // OKを表示
        setOK(true);
        // 0.6秒後にOKを非表示にするタイマーを設定
        okTimerRef.current = window.setTimeout(() => {
            setOK(false);
            okTimerRef.current = null; // タイマーIDをクリア
        }, 600); // 600ミリ秒 = 0.6秒
    }, [setOK]); // setOK は依存関係として安定

    const nextStage = useCallback(() => {
        // ランダムモードの場合、リセットのみ行う（OK表示は showOkFeedback で行う）
        if (isRandomMode) {
            activePracticeRef.current?.reset?.();
            return;
        }

        const currentGIdx = gIdxRef.current;
        const currentDIdx = dIdxRef.current;
        let nextGIdx = currentGIdx;
        let nextDIdx = currentDIdx;

        if (practiceRef.current === '清音の基本練習') {
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
            }
        }
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

        setGIdx(nextGIdx);
        setDIdx(nextDIdx);

    }, [isRandomMode, gyouList, danOrder, youonGyouList, youonGyouChars, dakuonGyouList, dakuonGyouChars, handakuonGyouList, handakuonGyouChars, sokuonKomojiData, kigoPractice1Data, kigoPractice2Data, kigoPractice3Data, youdakuonPracticeData, youhandakuonPracticeData, youonKakuchoChars, gairaigoPracticeData]);

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
                    const result = activePracticeRef.current.handleInput(inputInfo); // ← ref を使用

                    if (result.isExpected) {
                        if (result.shouldGoToNext && practiceRef.current !== 'かな入力１分間トレーニング' && practiceRef.current !== '記号入力１分間トレーニング' && practiceRef.current !== '短文入力３分間トレーニング') { // ★★★ 短文チャレンジも除外 ★★★
                            nextStage(); // 次の練習問題へ
                            showOkFeedback(); // OK表示を開始/延長
                        }
                    } else {
                        handleInvalidInput(pressCode);
                    }
                } else {
                    console.warn(`[App.onInput] Matching press event NOT FOUND for calculated pressCode: 0x${pressCode.toString(16)}. Current pressedKeys:`, Array.from(pressedKeysRef.current.keys()).map(k => `0x${k.toString(16)}`));
                }
            }
        }
     }, [handleInvalidInput, nextStage, showOkFeedback, setTraining, setShowKeyLabels, setIsRandomMode, kb, side]); // showOkFeedback を追加

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
            setOK(false);
            setLastInvalidKeyCode(null); // 不正入力ハイライトもクリア
            if (invalidInputTimeoutRef.current !== null) {
                clearTimeout(invalidInputTimeoutRef.current);
                invalidInputTimeoutRef.current = null;
            }
            pressedKeysRef.current.clear();
            activePracticeRef.current?.reset?.(); // ← ref を使用
            setShowKeyLabels(true);
            // OK表示タイマーもクリア
            if (okTimerRef.current !== null) {
                clearTimeout(okTimerRef.current);
                okTimerRef.current = null;
            }
            setIsRandomMode(false);
        }
     }, [setTraining, setPractice, setGIdx, setDIdx, setOK, setLastInvalidKeyCode, setShowKeyLabels, setIsRandomMode]);

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
        setOK(false);
        if (okTimerRef.current !== null) {
            clearTimeout(okTimerRef.current);
            okTimerRef.current = null;
        }
        if (item === 'かな入力１分間トレーニング' || item === '記号入力１分間トレーニング' || item === '短文入力３分間トレーニング') {
            // 特有の初期化があればここに追加
            setDIdx(0); // dIdx は使わないかもしれないが念のためリセット
        } else if (item === '拗音拡張') {
            setDIdx(1);
        } else {
            setDIdx(0); // 外来語含む他のモードは 0
        }
        setOK(false);
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

                            {/* 練習モードに応じたキーボード表示 */}
                            <div className={`col-span-2 grid ${
                                displayLayerIndices.length === 2 && displayLayerIndices.includes(2) && displayLayerIndices.includes(3)
                                ? 'grid-cols-2' // かなスタート/エンドの横並び
                                : 'grid-cols-1 justify-items-center' // それ以外は中央に1つ表示 (ヘッダーとキーボードを中央揃え)
                            } gap-4`}> {/* justify-items-center は縦並びの場合のみ適用 */}
                                <div className={`${
                                    displayLayerIndices.length === 2 && displayLayerIndices.includes(2) && displayLayerIndices.includes(3)
                                    ? 'col-start-1 justify-self-center' // 横並び時は1列目の中央
                                    : 'justify-self-center' // 縦並び時は(親が中央揃えなので)中央
                                }`}>
                                    <PracticeHeading
                                        activePractice={activePractice}
                                        isRandomMode={(practice === 'かな入力１分間トレーニング' || practice === '記号入力１分間トレーニング' || practice === '短文入力３分間トレーニング') ? true : isRandomMode}
                                        practice={practice}
                                        gIdx={gIdx}
                                        dIdx={dIdx}
                                        currentFunctionKeyMap={currentFunctionKeyMap}
                                        fixedWidthNum={fixedWidthNum}
                                        okVisible={okVisible}
                                    />
                                </div>
                                {isChallengeFinished ? (
                                    <div className={`flex items-center justify-center p-4 border rounded bg-gray-50 ${
                                        displayLayerIndices.length === 2 && displayLayerIndices.includes(2) && displayLayerIndices.includes(3)
                                        ? 'col-start-1' // 横並び時は1列目に配置
                                        : '' // 縦並び時は親が中央揃えなので指定不要
                                    }`} style={{ minHeight: '15rem' }}>
                                        {activePractice?.challengeResults && (
                                            <pre className="text-lg text-left font-semibold">
                                                {`【${practice} 結果】\n`}
                                                {`問題数：${activePractice.challengeResults.totalQuestions}問クリア\n`}
                                                {practice !== '記号入力１分間トレーニング' && `入力文字数：${activePractice.challengeResults.totalCharsTyped}文字\n`}
                                                {`正答率：${(activePractice.challengeResults.accuracy * 100).toFixed(1)}%\n`} {/* ★★★ 正答率の表示を統一 ★★★ */}
                                                {`スコア：${activePractice.challengeResults.score}点\n`}
                                                {`\n${activePractice.challengeResults.rankMessage}`}
                                            </pre>
                                        )}
                                    </div>
                                ) : (
                                    <> {/* map の結果を直接レンダリングするため、不要な div を削除 */}
                                        {displayLayerIndices.map((layerIndex, mapIndex) => {
                                            // 横並びの場合、レイヤー2は1列目、レイヤー3は2列目に配置
                                            const gridColClass = displayLayerIndices.length === 2 && displayLayerIndices.includes(2) && displayLayerIndices.includes(3)
                                                ? (layerIndex === 2 ? 'col-start-1' : 'col-start-2')
                                                : ''; // 縦並び時は指定不要
                                            return (
                                            keyboardLayers[layerIndex] ? (
                                            <KeyboardLayout
                                                key={layerIndex} // ループでレンダリングする際は key が必要
                                                layerData={keyboardLayers[layerIndex]}
                                                layoutIndex={layerIndex}
                                                className={`${gridColClass} justify-self-center`}
                                                layoutTitle={layerNames[layerIndex] ?? `レイヤー ${layerIndex}`}
                                                cols={cols}
                                                fixedWidth={fixedWidth}
                                                showKeyLabels={showKeyLabels}
                                                lastInvalidKeyCode={lastInvalidKeyCode}
                                                activePractice={activePractice}
                                                practice={practice}
                                                // currentFunctionKeyMap は KeyboardLayout 内で使われていないようなので削除検討
                                                currentFunctionKeyMap={currentFunctionKeyMap}
                                                training={training}
                                                // clearInvalidHighlight={clearInvalidHighlight} // KeyboardLayout に渡す必要があれば追加
                                            />
                                        ) : (
                                            // レイヤーデータが見つからない場合のフォールバック
                                            <div key={layerIndex}>レイヤー {layerIndex} のデータが見つかりません。</div>
                                        )
                                    );})}
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
