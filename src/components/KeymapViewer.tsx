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
    kigoMapping3
} from '../data/keymapData';
import { getKeyStyle, isLargeSymbol } from '../utils/styleUtils';
import {
    PracticeMode,
    PracticeInputInfo,
    // PracticeInputResult, // MODIFIED: 未使用のためコメントアウト (ESLint Warning対応)
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
    const [showKeyLabels, setShowKeyLabels] = useState(true); // NEW: キーラベル表示状態 (true: 表示, false: 非表示)

    /* 現在の行/段/文字インデックス */
    const [gIdx, setGIdx] = useState(0);
    const [dIdx, setDIdx] = useState(0);

    /* UIフィードバック */
    const [okVisible, setOK] = useState(false);
    const [lastInvalidKeyCode, setLastInvalidKeyCode] = useState<number | null>(null);

    /* HID / カウンタ */
    const devRef = useRef<HIDDevice | null>(null);
    const opening = useRef(false);
    const invalidInputTimeoutRef = useRef<number | null>(null);
    const pressedKeysRef = useRef<Map<number, number>>(new Map());
    const lastInvalidInputTime = useRef<number>(0);

    // --- カスタムフックの呼び出し ---
    const commonHookProps: Omit<PracticeHookProps, 'isActive'> = useMemo(() => ({
        gIdx, dIdx, okVisible, side, layers, kb
    }), [gIdx, dIdx, okVisible, side, layers, kb]);
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

    // --- 不正入力処理 ---
    const handleInvalidInput = useCallback((keyCode: number) => {
        const now = Date.now();
        if (now - lastInvalidInputTime.current < 50) {
            return;
        }
        lastInvalidInputTime.current = now;
        setLastInvalidKeyCode(keyCode);

        if (invalidInputTimeoutRef.current !== null) {
            clearTimeout(invalidInputTimeoutRef.current);
        }

        const timerId = window.setTimeout((codeToClear: number) => {
            setLastInvalidKeyCode(prevCode => (prevCode === codeToClear ? null : prevCode));
            invalidInputTimeoutRef.current = null;
        }, 500, keyCode);
        invalidInputTimeoutRef.current = timerId;
    }, []);

    // --- 次のステージへ ---
    const nextStage = useCallback(() => {
        setOK(true);
        setTimeout(() => {
            let nextGIdx = gIdx;
            let nextDIdx = dIdx;

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
                const currentGyouKey = handakuonGyouList[gIdx];
                const currentChars = handakuonGyouChars[currentGyouKey] || [];
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
            setOK(false);
        }, 1000);
    }, [practice, gIdx, dIdx, setOK, setGIdx, setDIdx]);

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
                dev.oninputreport = onInput;
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
        if (!on) {
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
            setShowKeyLabels(true); // NEW: 練習モードOFF時にキー表示をリセット
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setTraining, setPractice, setGIdx, setDIdx, setOK, setLastInvalidKeyCode, activePractice, setShowKeyLabels /* onInput を依存配列から削除, setShowKeyLabels を追加 */]);

    /* HID input */
    const onInput: (ev: HIDInputReportEvent) => void = useCallback((ev) => {
        const data = new Uint8Array(ev.data.buffer);
        const reportId = data[0];
        const keyCode = data[1];
        const timestamp = Date.now();

        if (reportId === 0x14 && keyCode === 0x03) {
            if (!training) {
                sendHid(true);
            }
            return;
        }

        if (reportId === 0x15) {
            const isPressEvent = keyCode <= 0x14;
            const isReleaseEvent = keyCode >= 0x15;

            if (isPressEvent) {
                pressedKeysRef.current.set(keyCode, timestamp);
                if (!training || !practice || !activePractice) return;
                const pressCode = keyCode;
                const inputInfo: PracticeInputInfo = {
                    type: 'press', timestamp, pressCode,
                };
                activePractice.handleInput(inputInfo);

            } else if (isReleaseEvent) {
                const pressCode = keyCode - 0x14;
                const pressTimestamp = pressedKeysRef.current.get(pressCode);
                if (pressTimestamp) {
                    pressedKeysRef.current.delete(pressCode);
                    if (!training || !practice || !activePractice) return;
                    const inputInfo: PracticeInputInfo = {
                        type: 'release', timestamp, pressCode,
                    };
                    const result = activePractice.handleInput(inputInfo);

                    if (result.isExpected) {
                        if (result.shouldGoToNext) {
                            nextStage();
                        }
                    } else {
                        handleInvalidInput(pressCode);
                    }
                } else {
                    console.warn(`キーコード 0x${keyCode.toString(16)} (対応する押下コード 0x${pressCode.toString(16)}) の離上イベントがありましたが、対応する押下イベントが見つかりません。`);
                }
            }
        }
    }, [training, practice, activePractice, handleInvalidInput, nextStage, sendHid]);


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
    }, [onInput, setTitle, setCols, setLayers, setFW, setSN, setShowTrainingButton, setSide, setKb]);

    // 練習モード選択時のリセット処理
    const handlePracticeSelect = (item: PracticeMode) => {
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
        setShowKeyLabels(true); // NEW: 練習メニュー変更時にキー表示をリセット
    };

    /* heading（見出し） */
    const headingChars = activePractice?.headingChars ?? [];
    const heading = (
      <div className="flex justify-center">
        {headingChars.map((char: string, index: number) => {
          let className = 'text-2xl font-bold';
          if (practice === '記号の基本練習３') {
              if (gIdx >= 0 && gIdx < kigoPractice3Data.length && kigoPractice3Data[gIdx]?.chars && index === dIdx) {
                 className += ' bg-blue-100';
              }
          } else if (index === dIdx) {
            className += ' bg-blue-100';
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
    // MODIFIED: showKeyLabels を依存配列に追加
    const renderKana = useCallback((layoutIndex: number) => (key: string, idx: number) => {
        let originalKey = (key ?? '').trim(); // 元のキーデータ
        const isEmptyKey = originalKey === ''; // 元のキーデータが空か

        let k = originalKey; // 表示用のキー文字列 (初期値は元のキーデータ)

        const kigoMapping2: Record<string, string> = {
            'あ行': '＋', 'か行': '＿', 'さ行': '＊', 'た行': '－', 'な行': '＠',
            'は行': '・', 'ま行': '＆', 'や行': '｜', 'ら行': '％', 'わ行': '￥',
            '記号': '後押し',
        };
        // kigoMapping3 も定義しておく (useKigoPractice3 で使用)
        // const kigoMapping3: Record<string, string> = { /* ... kigoMapping3 の内容 ... */ };

        let cName = '';
        let isInvalid = false;

        // 練習モードに応じたキー表示の調整 (k が '____' になる可能性あり)
        // この調整はキー表示ONのときのみ意味を持つ
        if (showKeyLabels) {
            if (practice === '記号の基本練習１') {
                if (layoutIndex === 2) {
                    const kigo1Char = layers[6]?.[idx]?.trim();
                    if (kigo1Char && kigo1Char !== '____') {
                        k = kigo1Char;
                    }
                }
            } else if (practice === '記号の基本練習２') {
                if (layoutIndex === 2) {
                    k = kigoMapping2[originalKey] ?? k; // 元のキーでマッピング
                }
            } else if (practice === '記号の基本練習３') {
                if (layoutIndex === 2) {
                    // kigoMapping3 が data/keymapData.ts からインポートされている前提
                    k = kigoMapping3[originalKey] ?? k; // 元のキーでマッピング
                }
            } else if (layoutIndex === 3) {
                if (['拗１', '拗２', '拗３', '拗４'].includes(originalKey)) { // 元のキーで判定
                    k = '____'; // 表示を '____' にする
                }
            }
        }

        // 不正入力ハイライト処理 (キー表示ON/OFFに関わらず適用)
        if (lastInvalidKeyCode !== null) {
            const isStartLayoutInput = lastInvalidKeyCode <= 0x14;
            const pressCode = isStartLayoutInput ? lastInvalidKeyCode : lastInvalidKeyCode - 0x14;
            const targetKeyIndex = pressCode - 1;
            let isTargetLayout = false;
            if (activePractice) {
                const logicLayoutIndex = practice === '記号の基本練習１' ? 6 : layoutIndex;
                isTargetLayout = activePractice.isInvalidInputTarget(lastInvalidKeyCode, logicLayoutIndex, idx);
            } else {
                 isTargetLayout = (isStartLayoutInput && layoutIndex === 2) || (!isStartLayoutInput && layoutIndex === 3);
            }
            if (isTargetLayout && idx === targetKeyIndex) {
                cName = 'bg-red-100'; isInvalid = true;
            }
        }

        // 正解キーハイライト処理 (キー表示ONのときのみ適用、かつ '____' はハイライトしない)
        // isInvalid でない場合のみ青ハイライトを検討
        if (!isInvalid && showKeyLabels && !okVisible && activePractice) {
            const logicLayoutIndex = practice === '記号の基本練習１' ? 6 : layoutIndex;
            const highlightTargetKey = practice === '記号の基本練習１' ? layers[6]?.[idx]?.trim() ?? '' : originalKey;

            // 表示内容が '____' になるキーは青ハイライトしない
            // k は練習モードによって '____' に書き換えられる可能性があるため、k で判定
            const shouldHighlight = k !== '____';

            if (shouldHighlight) {
                const highlightClass = activePractice.getHighlightClassName(highlightTargetKey, logicLayoutIndex);
                // 青ハイライトクラスが返ってきた場合のみ cName を設定
                if (highlightClass === 'bg-blue-100') {
                     cName = highlightClass;
                }
            }
        }

        // 最終的な表示内容を決定
        let displayContent: string;
        if (showKeyLabels) {
            // ON: 空なら改行、それ以外は計算後の k を表示
            displayContent = isEmptyKey ? '\n' : k;
        } else {
            // OFF: 空なら改行、それ以外は '____' を表示
            displayContent = isEmptyKey ? '\n' : '____';
        }

        // キー要素のJSXを返す
        return (
            <div key={idx} className={`border rounded p-3 text-center text-sm shadow flex justify-center items-center whitespace-pre-line ${cName}`}>
                {/* MODIFIED: 最終的な表示内容 displayContent を使用 */}
                {displayContent}
            </div>
        );
    // MODIFIED: showKeyLabels を依存配列に追加
    }, [activePractice, okVisible, lastInvalidKeyCode, practice, layers, showKeyLabels]);

    // コンポーネント全体のJSX
    return (
        <div className='p-4 relative'>
            {/* MODIFIED: ボタンを縦に並べるためのコンテナ */}
            {showTrainingButton && (
                <div className="absolute top-4 right-4 flex flex-col space-y-2 items-end"> {/* items-end で右寄せ */}
                    <button
                        className={`px-4 py-1 rounded shadow text-white ${training ? 'bg-gray-600' : 'bg-green-600'}`}
                        onClick={() => { sendHid(!training); }}
                    >
                        {training ? '練習モード OFF' : '練習モード ON'}
                    </button>
                    {/* NEW: 練習モードONのときだけキー表示ボタンを表示 */}
                    {training && (
                        <button
                            className="px-4 py-1 rounded shadow text-white bg-blue-600 hover:bg-blue-700" // スタイル調整
                            onClick={() => setShowKeyLabels(prev => !prev)} // クリックで状態をトグル
                        >
                            {showKeyLabels ? 'キー表示 OFF' : 'キー表示 ON'} {/* 状態に応じてテキスト変更 */}
                        </button>
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

                        {['記号の基本練習１', '記号の基本練習２', '記号の基本練習３'].includes(practice) ? (
                            <div className="col-start-2 justify-self-center">
                                {practice === '記号の基本練習１' && (
                                    <div key={2} style={{ width: fixedWidth }}>
                                        <h3 className='text-lg font-semibold mb-2 text-center'>記号１ (長押し)</h3>
                                        <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                            {layers[2]?.map(renderKana(2))}
                                        </div>
                                    </div>
                                )}
                                {practice === '記号の基本練習２' && (
                                    <div key={2} style={{ width: fixedWidth }}>
                                        <h3 className='text-lg font-semibold mb-2 text-center'>記号２ (後押し)</h3>
                                        <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                            {layers[2]?.map(renderKana(2))}
                                        </div>
                                    </div>
                                )}
                                {practice === '記号の基本練習３' && (
                                    <div key={2} style={{ width: fixedWidth }}>
                                        <h3 className='text-lg font-semibold mb-2 text-center'>記号３（先押し）</h3>
                                        <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                            {layers[2]?.map(renderKana(2))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : practice ? (
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

                    {okVisible && (
                        <div className="flex justify-center mt-4">
                            <span className='text-3xl font-bold text-green-600' style={{ padding: '0.25rem' }}>OK</span>
                        </div>
                    )}
                </>
            ) : (
                 <div className='grid grid-cols-2 gap-4'>
                     {layers.map((layer: string[], li: number) => (
                         <div key={li} style={{ width: fixedWidth }}>
                             <h2 className='text-lg font-semibold mb-2'>
                                 {layerNames[li] ?? `レイヤー ${li}`}
                             </h2>
                             <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                 {layer.map((code: string, ki: number) => (
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
                                 ))}
                             </div>
                         </div>
                     ))}
                 </div>
            )}
        </div>
    );
}
