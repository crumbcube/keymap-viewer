// /home/coffee/my-keymap-viewer/src/components/KeymapViewer.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HIDDevice, HIDInputReportEvent } from '../types/hid';
import {
    sampleJson,
    layerNames,
    practiceMenuItems,
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
    kigoMapping2,
    kigoMapping3,
    functionKeyMaps,
} from '../data/keymapData';
import { getKeyStyle, isLargeSymbol } from '../utils/styleUtils';
import {
    PracticeMode,
    PracticeInputInfo,
    PracticeHookProps,
    PracticeHookResult,
    KeyboardSide,
    KeyboardModel
} from '../hooks/usePracticeCommons';
import useSeionPractice from '../hooks/useSeionPractice';
import useYouonPractice from '../hooks/useYouonPractice';
import useDakuonPractice from '../hooks/useDakuonPractice';
import useHandakuonPractice from '../hooks/useHandakuonPractice';
import useSokuonKomojiPractice from '../hooks/useSokuonKomojiPractice';
import useKigoPractice1 from '../hooks/useKigoPractice1';
import useKigoPractice2 from '../hooks/useKigoPractice2';
import useKigoPractice3 from '../hooks/useKigoPractice3';

export default function KeymapViewer() {
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
    const [gIdx, setGIdx] = useState(0);
    const [dIdx, setDIdx] = useState(0);

    /* UIフィードバック */
    const [okVisible, setOK] = useState(false); // 通常モード用のOK表示ステート
    const [lastInvalidKeyCode, setLastInvalidKeyCode] = useState<number | null>(null); // 不正入力されたキーの *押下コード* を保持

    /* HID / カウンタ */
    const devRef = useRef<HIDDevice | null>(null);
    const opening = useRef(false);
    const invalidInputTimeoutRef = useRef<number | null>(null);
    const pressedKeysRef = useRef<Map<number, number>>(new Map()); // キーコード(押下) -> タイムスタンプ
    const lastInvalidInputTime = useRef<number>(0);

    // --- カスタムフックの呼び出し ---
    const commonHookProps: Omit<PracticeHookProps, 'isActive'> = useMemo(() => ({
        gIdx, dIdx, okVisible, side, layers, kb, isRandomMode
    }), [gIdx, dIdx, okVisible, side, layers, kb, isRandomMode]);

    // 各練習フックの呼び出し
    const seionPractice = useSeionPractice({ ...commonHookProps, isActive: practice === '清音の基本練習' });
    const youonPractice = useYouonPractice({ ...commonHookProps, isActive: practice === '拗音の基本練習' });
    const dakuonPractice = useDakuonPractice({ ...commonHookProps, isActive: practice === '濁音の基本練習' });
    const handakuonPractice = useHandakuonPractice({ ...commonHookProps, isActive: practice === '半濁音の基本練習' });
    const sokuonKomojiPractice = useSokuonKomojiPractice({ ...commonHookProps, isActive: practice === '小文字(促音)の基本練習' });
    const kigoPractice1 = useKigoPractice1({ ...commonHookProps, isActive: practice === '記号の基本練習１' });
    const kigoPractice2 = useKigoPractice2({ ...commonHookProps, isActive: practice === '記号の基本練習２' });
    const kigoPractice3 = useKigoPractice3({ ...commonHookProps, isActive: practice === '記号の基本練習３' });

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
            default: return null;
        }
    }, [practice, seionPractice, youonPractice, dakuonPractice, handakuonPractice, sokuonKomojiPractice, kigoPractice1, kigoPractice2, kigoPractice3]) as PracticeHookResult | null;

    // キーボード表示の固定幅
    const fixedWidth = `${cols * 5.5}rem`;

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    // --- 不正入力処理 ---
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
    }, []);

    // --- 次のステージへ --- (通常モード用)
    const nextStage = useCallback(() => {
        if (isRandomMode) {
            console.warn("nextStage called in random mode. This should not happen.");
            return;
        }
        setOK(true); // 通常モードのOK表示をON
        setTimeout(() => {
            let nextGIdx = gIdx;
            let nextDIdx = dIdx;

            // ... (各練習モードの次の問題への遷移ロジック - 変更なし) ...
            if (practice === '清音の基本練習') {
                const currentGyouKey = gyouList[gIdx];
                if (!currentGyouKey || !gyouList.includes(currentGyouKey)) { console.error("清音練習で無効な gIdx または currentGyouKey"); return; }
                const list = danOrder[currentGyouKey];
                if (dIdx < list.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = (gIdx + 1) % gyouList.length; }
            } else if (practice === '拗音の基本練習') {
                if (gIdx < 0 || gIdx >= youonGyouList.length) { console.error("拗音練習で無効な gIdx"); return; }
                const currentGyouKey = youonGyouList[gIdx];
                const currentChars = youonGyouChars[currentGyouKey] || [];
                if (dIdx < currentChars.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = (gIdx + 1) % youonGyouList.length; }
            } else if (practice === '濁音の基本練習') {
                 if (gIdx < 0 || gIdx >= dakuonGyouList.length) { console.error("濁音練習で無効な gIdx"); return; }
                const currentGyouKey = dakuonGyouList[gIdx];
                const currentChars = dakuonGyouChars[currentGyouKey] || [];
                if (dIdx < currentChars.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = (gIdx + 1) % dakuonGyouList.length; }
            } else if (practice === '半濁音の基本練習') {
                 if (gIdx < 0 || gIdx >= handakuonGyouList.length) { console.error("半濁音練習で無効な gIdx"); return; }
                const currentChars = handakuonGyouChars['は行'] || [];
                if (dIdx < currentChars.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = 0; }
            } else if (practice === '小文字(促音)の基本練習') {
                 if (gIdx < 0 || gIdx >= sokuonKomojiData.length) { console.error("促音/小文字練習で無効な gIdx"); return; }
                const currentSet = sokuonKomojiData[gIdx];
                const currentChars = currentSet.chars;
                 if (dIdx < 0 || dIdx >= currentChars.length) { console.error("促音/小文字練習で無効な dIdx"); nextGIdx = 0; nextDIdx = 0; }
                 else {
                    const isTsu = currentChars[dIdx] === 'っ';
                    if (isTsu || dIdx === currentChars.length - 1) {
                        nextDIdx = 0;
                        nextGIdx = (gIdx + 1) % sokuonKomojiData.length;
                    } else {
                        nextDIdx = dIdx + 1;
                    }
                 }
            } else if (practice === '記号の基本練習１') {
                if (gIdx < 0 || gIdx >= kigoPractice1Data.length) { console.error("記号練習1で無効な gIdx"); return; }
                const currentGroup = kigoPractice1Data[gIdx];
                if (dIdx < currentGroup.chars.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = (gIdx + 1) % kigoPractice1Data.length; }
            } else if (practice === '記号の基本練習２') {
                if (gIdx < 0 || gIdx >= kigoPractice2Data.length) { console.error("記号練習2で無効な gIdx"); return; }
                const currentGroup = kigoPractice2Data[gIdx];
                if (dIdx < 0 || dIdx >= currentGroup.chars.length) { console.error("記号練習2で無効な dIdx"); return; }

                if (dIdx < currentGroup.chars.length - 1) {
                    nextDIdx = dIdx + 1;
                } else {
                    nextDIdx = 0;
                    nextGIdx = (gIdx + 1) % kigoPractice2Data.length;
                }
            } else if (practice === '記号の基本練習３') {
                if (gIdx < 0 || gIdx >= kigoPractice3Data.length) { console.error("記号練習3で無効な gIdx"); return; }
                const currentGroup = kigoPractice3Data[gIdx];
                if (dIdx < currentGroup.chars.length - 1) {
                    nextDIdx = dIdx + 1;
                } else {
                    if (gIdx < kigoPractice3Data.length - 1) {
                        nextGIdx = gIdx + 1;
                        nextDIdx = 0;
                    } else {
                        nextGIdx = 0;
                        nextDIdx = 0;
                    }
                }
            }

            setGIdx(nextGIdx);
            setDIdx(nextDIdx);
            setOK(false); // 通常モードのOK表示をOFF
        }, 1000);
    }, [practice, gIdx, dIdx, setOK, setGIdx, setDIdx, isRandomMode]);

    // onInput (releaseOffset と isReleaseEventAdjusted の計算を修正済み)
    const onInput: (ev: HIDInputReportEvent) => void = useCallback((ev) => {
        const data = new Uint8Array(ev.data.buffer);
        const reportId = data[0];
        const keyCode = data[1];
        const timestamp = Date.now();

        console.log(`onInput called. kb: ${kb}, reportId: 0x${reportId.toString(16)}, keyCode: 0x${keyCode.toString(16)}`);

        // 練習モード強制開始
        if (reportId === 0x14 && keyCode === 0x03) {
            if (!training) {
                console.log("Forcing training mode ON");
                setTraining(true);
                setShowKeyLabels(true);
                setIsRandomMode(false);
            }
            return;
        }

        // 練習中のキー入力処理
        if (reportId === 0x15 && training && practice && activePractice) {
            const releaseOffset = 0x14; // 常に 0x14

            const maxStartLayoutKeyCode = 0x14; // TW-20H も TW-20V も 0x14 まで

            const isPressEventAdjusted = keyCode <= maxStartLayoutKeyCode;
            const isReleaseEventAdjusted = keyCode >= (releaseOffset + 1); // 離上コードは 0x15 以上

            console.log(`maxStartLayoutKeyCode: 0x${maxStartLayoutKeyCode.toString(16)}, releaseOffset: 0x${releaseOffset.toString(16)}`);
            console.log(`isPressEventAdjusted: ${isPressEventAdjusted}, isReleaseEventAdjusted: ${isReleaseEventAdjusted}`);

            if (isPressEventAdjusted) {
                const pressCode = keyCode;
                console.log(`Press event detected. Recording pressCode: 0x${pressCode.toString(16)}`);
                pressedKeysRef.current.set(pressCode, timestamp);

                const inputInfo: PracticeInputInfo = {
                    type: 'press', timestamp, pressCode,
                };
                activePractice.handleInput(inputInfo);

            } else if (isReleaseEventAdjusted) {
                const pressCode = keyCode - releaseOffset; // 常に 0x14 を引く
                console.log(`Release event detected. Calculated pressCode: 0x${pressCode.toString(16)} (keyCode: 0x${keyCode.toString(16)})`);

                if (pressCode <= 0) {
                    console.warn(`Invalid calculated pressCode: 0x${pressCode.toString(16)}. Ignoring release event.`);
                    return;
                }

                const pressTimestamp = pressedKeysRef.current.get(pressCode);
                if (pressTimestamp) {
                    console.log(`Found matching press event for pressCode: 0x${pressCode.toString(16)}`);
                    pressedKeysRef.current.delete(pressCode);

                    const inputInfo: PracticeInputInfo = {
                        type: 'release', timestamp, pressCode,
                    };
                    const result = activePractice.handleInput(inputInfo);

                    if (result.isExpected) {
                        if (result.shouldGoToNext) { // 通常モードでのみ true
                            nextStage();
                        }
                        // ランダムモードのOK表示はフック内部で管理され、activePractice.isOkVisible で取得
                    } else {
                        handleInvalidInput(pressCode);
                    }
                } else {
                    console.warn(`Matching press event NOT FOUND for calculated pressCode: 0x${pressCode.toString(16)}. Current pressedKeys:`, Array.from(pressedKeysRef.current.keys()).map(k => `0x${k.toString(16)}`));
                    console.warn(`キーコード 0x${keyCode.toString(16)} (対応する押下コード 0x${pressCode.toString(16)}) の離上イベントがありましたが、対応する押下イベントが見つかりません。`);
                }
            }
        }
    }, [training, practice, activePractice, handleInvalidInput, nextStage, setTraining, setShowKeyLabels, setIsRandomMode, kb]);

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
        } catch (err) { console.error("HIDレポートの送信に失敗しました:", err); }

        setTraining(on);
        if (on) {
            setShowKeyLabels(true);
            setIsRandomMode(false);
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
            activePractice?.reset?.();
            setShowKeyLabels(true);
            setIsRandomMode(false);
        }
    }, [setTraining, setPractice, setGIdx, setDIdx, setOK, setLastInvalidKeyCode, activePractice, setShowKeyLabels, setIsRandomMode]);


    /* 初期化 */
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const kbRaw = params.get('kb') ?? 'tw-20h'; // デフォルト 'tw-20h'
        const sideRaw = params.get('side') ?? 'right';

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
                        device.oninputreport = onInput;
                        devRef.current = device;
                    } catch (err) { console.error("既存のHIDデバイスを開けませんでした:", err); }
                    finally { opening.current = false; }
                } else if ((device as any).opened) {
                    console.log("Existing HID device already opened. Setting oninputreport.");
                    device.oninputreport = onInput;
                    devRef.current = device;
                }
            } catch (err) { console.error("HIDデバイスの取得またはオープンに失敗:", err); }
        };
        initHid();

        // クリーンアップ関数
        return () => {
            const dev = devRef.current;
            if (dev && (dev as any).opened) {
                console.log("Closing HID device on cleanup.");
                dev.oninputreport = null;
                // dev.close();
            }
        };
    }, [onInput, setTitle, setCols, setLayers, setFW, setSN, setShowTrainingButton, setSide, setKb]);

    // 練習モード選択時のリセット処理
    const handlePracticeSelect = (item: PracticeMode) => {
        console.log(`Practice mode selected: ${item}`);
        activePractice?.reset?.();
        setPractice(item);
        setGIdx(0); setDIdx(0);
        setOK(false);
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
        const nextIsRandomMode = !isRandomMode;
        console.log(`Toggling random mode to: ${nextIsRandomMode}`);
        setIsRandomMode(nextIsRandomMode);
        activePractice?.reset?.();
    }, [activePractice, setIsRandomMode, isRandomMode]);

    /* heading（見出し） */
    const headingChars = activePractice?.headingChars ?? [];
    const heading = (
      <div className="flex justify-center">
        {headingChars.map((char: string, index: number) => {
          let className = 'text-2xl font-bold';
          if (!isRandomMode) {
              if (practice === '記号の基本練習３') {
                  if (gIdx >= 0 && gIdx < kigoPractice3Data.length && kigoPractice3Data[gIdx]?.chars && index === dIdx) {
                     className += ' bg-blue-100';
                  }
              } else if (index === dIdx) {
                className += ' bg-blue-100';
              }
          }
          return (
            <span key={index} className={className} style={{ padding: '0.25rem' }}>
              {char}
            </span>
          );
        })}
      </div>
    );

    /* キー描画 */
    const renderKana = useCallback((layoutIndex: number) => (key: string, idx: number) => {
        let originalKey = (key ?? '').trim();
        const isEmptyKey = originalKey === '';

        let k = originalKey;

        // ▼▼▼ kigoMapping2 の直接定義を削除 ▼▼▼
        // const kigoMapping2: Record<string, string> = {
        //     'あ行': '＋', 'か行': '＿', 'さ行': '＊', 'た行': '－', 'な行': '＠',
        //     'は行': '・', 'ま行': '＆', 'や行': '｜', 'ら行': '％', 'わ行': '￥',
        //     '記号': '記号',
        // };
        // ▲▲▲ 削除 ▲▲▲

        let cName = '';
        let isInvalid = false;

        if (showKeyLabels) {
            if (practice === '記号の基本練習１') {
                if (layoutIndex === 6 && currentFunctionKeyMap[idx]) {
                    k = currentFunctionKeyMap[idx];
                } else if (layoutIndex === 2) {
                     k = '____';
                }
            } else if (practice === '記号の基本練習２') {
                if (layoutIndex === 2) {
                    if (currentFunctionKeyMap[idx]) {
                        k = currentFunctionKeyMap[idx];
                    } else {
                        k = kigoMapping2[originalKey] ?? k;
                    }
                }
            } else if (practice === '記号の基本練習３') {
                if (layoutIndex === 2) {
                    if (currentFunctionKeyMap[idx]) {
                        k = currentFunctionKeyMap[idx];
                    } else {
                        k = kigoMapping3[originalKey] ?? k;
                    }
                }
            } else if (layoutIndex === 3) { // 通常のかな練習時のエンドレイヤー
                if (['拗１', '拗２', '拗３', '拗４'].includes(originalKey)) {
                    k = '____';
                }
            } else if (layoutIndex === 2) { // 通常のかな練習時のスタートレイヤー
                 if (currentFunctionKeyMap[idx]) {
                     k = currentFunctionKeyMap[idx];
                 }
            }
        }

        // 不正入力ハイライト処理
        if (lastInvalidKeyCode !== null) {
            const pressCode = lastInvalidKeyCode;
            const targetKeyIndex = pressCode - 1;

            let isTargetLayout = false;
            if (activePractice) {
                isTargetLayout = activePractice.isInvalidInputTarget(pressCode, layoutIndex, idx);
            }
            if (isTargetLayout && idx === targetKeyIndex) {
                cName = 'bg-red-100'; isInvalid = true;
                console.log(`Highlighting invalid key: pressCode=0x${pressCode.toString(16)}, layoutIndex=${layoutIndex}, idx=${idx}`);
            }
        }

        // 正解キーハイライト処理
        if (!isInvalid && showKeyLabels && !activePractice?.isOkVisible && activePractice) {
            const highlightTargetKey = k;
            const shouldHighlight = k !== '____';

            if (shouldHighlight) {
                const highlightClass = activePractice.getHighlightClassName(highlightTargetKey, layoutIndex);
                if (highlightClass === 'bg-blue-100') {
                     cName = highlightClass;
                }
            }
        }

        let displayContent: string;
        if (showKeyLabels) {
            displayContent = isEmptyKey ? '\n' : k;
        } else {
            displayContent = isEmptyKey ? '\n' : '____';
        }

        return (
            <div key={idx} className={`border rounded p-3 text-center text-sm shadow flex justify-center items-center whitespace-pre-line ${cName}`}>
                {displayContent}
            </div>
        );
    }, [activePractice, lastInvalidKeyCode, practice, showKeyLabels, currentFunctionKeyMap]);

    // ボタンのスタイル
    const buttonStyle: React.CSSProperties = {
        marginBottom: '0.5rem',
        padding: '5px 10px',
        display: 'block',
        minWidth: '120px',
        textAlign: 'center',
    };

    // コンポーネント全体のJSX
    return (
        <div className='p-4 relative'>
            {/* ボタンエリア */}
            {showTrainingButton && (
                <div className="absolute top-4 right-4 flex flex-col space-y-2 items-end">
                    <button
                        className={`px-4 py-1 rounded shadow text-white ${training ? 'bg-gray-600' : 'bg-green-600'}`}
                        onClick={() => { sendHid(!training); }}
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
                            <button
                                className="px-4 py-1 rounded shadow text-white bg-purple-600 hover:bg-purple-700"
                                onClick={toggleRandomMode}
                                style={buttonStyle}
                            >
                                ランダム {isRandomMode ? 'OFF' : 'ON'}
                            </button>
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
                    {practice && (
                        <div className='flex justify-center mb-6'>
                            {heading}
                        </div>
                    )}

                    <div className='grid grid-cols-3 gap-4 items-start'>
                        <div>
                            <h2 className='text-lg font-semibold mb-2'>基本練習メニュー</h2>
                            <ul>
                                {practiceMenuItems.map(item => (
                                    <li key={item}
                                        className={`cursor-pointer p-2 border-b hover:bg-gray-200 ${item === practice ? 'bg-gray-300' : ''}`}
                                        onClick={() => handlePracticeSelect(item as PracticeMode)}
                                    >
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 練習モードに応じたキーボード表示 */}
                        {practice === '記号の基本練習１' ? (
                            <div className="col-start-2 justify-self-center">
                                <div style={{ width: fixedWidth }}>
                                    <h3 className='text-lg font-semibold mb-2 text-center'>記号１ (長押し)</h3>
                                    <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                        {layers[6]?.map(renderKana(6))}
                                    </div>
                                </div>
                            </div>
                        ) : ['記号の基本練習２', '記号の基本練習３'].includes(practice) ? (
                            <div className="col-start-2 justify-self-center">
                                <div style={{ width: fixedWidth }}>
                                    <h3 className='text-lg font-semibold mb-2 text-center'>
                                        {practice === '記号の基本練習２' ? '記号２ (後押し)' : '記号３（先押し）'}
                                    </h3>
                                    <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                        {layers[2]?.map(renderKana(2))}
                                    </div>
                                </div>
                            </div>
                        ) : practice ? ( // 通常のかな練習
                            <>
                                <div className="justify-self-center">
                                    <div style={{ width: fixedWidth }}>
                                        <h3 className='text-lg font-semibold mb-2 text-center'>かなモード（スタート）</h3>
                                        <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                            {layers[2]?.map(renderKana(2))}
                                        </div>
                                    </div>
                                </div>
                                <div className="justify-self-center">
                                    <div style={{ width: fixedWidth }}>
                                        <h3 className='text-lg font-semibold mb-2 text-center'>かなモード（エンド）</h3>
                                        <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                            {layers[3]?.map(renderKana(3))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>

                    {/* ★★★ OK表示: activePractice?.isOkVisible を参照 ★★★ */}
                    {activePractice?.isOkVisible && (
                        <div className="flex justify-center mt-4">
                            <span className='text-3xl font-bold text-green-600' style={{ padding: '0.25rem' }}>OK</span>
                        </div>
                    )}
                </>
            ) : ( // 練習モードOFF時の表示
                 <div className='grid grid-cols-2 gap-4'>
                     {layers.map((layer: string[], li: number) => (
                         <div key={li} style={{ width: fixedWidth }}>
                             <h2 className='text-lg font-semibold mb-2'>
                                 {layerNames[li] ?? `レイヤー ${li}`}
                             </h2>
                             <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                 {layer.map((code: string, ki: number) => {
                                     return (
                                         <motion.div key={ki} className={`border rounded p-3 text-center text-sm shadow flex justify-center items-center ${getKeyStyle(code)}`}
                                             whileHover={{ scale: 1.05 }}
                                             style={{ minHeight: '3rem', fontSize: isLargeSymbol(code) ? '1.8rem' : undefined }}>
                                             <code style={{ whiteSpace: "pre-line" }}>
                                               {(code ?? "").split(/\r?\n/).map((l: string, i: number, a: string[]) => (
                                                 <span key={i}>
                                                   {l}
                                                   {i < a.length - 1 && <br />}
                                                 </span>
                                               ))}
                                             </code>
                                         </motion.div>
                                     );
                                 })}
                             </div>
                         </div>
                     ))}
                 </div>
            )}
        </div>
    );
}
