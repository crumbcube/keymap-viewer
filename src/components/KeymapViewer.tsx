import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HIDDevice, HIDInputReportEvent } from '../types/hid';
import {
    sampleJson,
    layerNames,
    practiceMenuItems, // 更新されたメニュー項目
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
    kigoPractice3Data, // 変更されたデータ構造をインポート
    kigoMapping3
} from '../data/keymapData';
import { getKeyStyle, isLargeSymbol } from '../utils/styleUtils';
import {
    PracticeMode, // 更新された型
    PracticeInputInfo, // inputGyou/Dan が削除された型
    PracticeInputResult,
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
    const pressedKeysRef = useRef<Map<number, number>>(new Map()); // keyCode => timestamp
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
    // nextStage は gIdx, dIdx の更新のみなので side, kb の影響は受けない (変更なし)
    const nextStage = useCallback(() => {
        setOK(true);
        setTimeout(() => {
            let nextGIdx = gIdx;
            let nextDIdx = dIdx;

            if (practice === '清音の基本練習') {
                const currentGyouKey = gyouList[gIdx];
                if (!currentGyouKey || !gyouList.includes(currentGyouKey)) { console.error("Invalid gIdx or currentGyouKey in Seion practice"); return; }
                const list = danOrder[currentGyouKey];
                if (dIdx < list.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = (gIdx + 1) % gyouList.length; }
            } else if (practice === '拗音の基本練習') {
                if (gIdx < 0 || gIdx >= youonGyouList.length) { console.error("Invalid gIdx in Youon practice"); return; }
                const currentGyouKey = youonGyouList[gIdx];
                const currentChars = youonGyouChars[currentGyouKey] || [];
                if (dIdx < currentChars.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = (gIdx + 1) % youonGyouList.length; }
            } else if (practice === '濁音の基本練習') {
                 if (gIdx < 0 || gIdx >= dakuonGyouList.length) { console.error("Invalid gIdx in Dakuon practice"); return; }
                const currentGyouKey = dakuonGyouList[gIdx];
                const currentChars = dakuonGyouChars[currentGyouKey] || [];
                if (dIdx < currentChars.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = (gIdx + 1) % dakuonGyouList.length; }
            } else if (practice === '半濁音の基本練習') {
                 if (gIdx < 0 || gIdx >= handakuonGyouList.length) { console.error("Invalid gIdx in Handakuon practice"); return; }
                const currentGyouKey = handakuonGyouList[gIdx];
                const currentChars = handakuonGyouChars[currentGyouKey] || [];
                if (dIdx < currentChars.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = 0; }
            } else if (practice === '小文字(促音)の基本練習') {
                 if (gIdx < 0 || gIdx >= sokuonKomojiData.length) { console.error("Invalid gIdx in Sokuon/Komoji practice"); return; }
                const currentSet = sokuonKomojiData[gIdx];
                const currentChars = currentSet.chars;
                 if (dIdx < 0 || dIdx >= currentChars.length) { console.error("Invalid dIdx in Sokuon/Komoji practice"); nextGIdx = 0; nextDIdx = 0; }
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
                if (gIdx < 0 || gIdx >= kigoPractice1Data.length) { console.error("Invalid gIdx in Kigo practice 1"); return; }
                const currentGroup = kigoPractice1Data[gIdx];
                if (dIdx < currentGroup.chars.length - 1) { nextDIdx = dIdx + 1; }
                else { nextDIdx = 0; nextGIdx = (gIdx + 1) % kigoPractice1Data.length; }
            } else if (practice === '記号の基本練習２') {
                if (gIdx < 0 || gIdx >= kigoPractice2Data.length) { console.error("Invalid gIdx in Kigo practice 2"); return; }
                const currentGroup = kigoPractice2Data[gIdx];
                if (dIdx < 0 || dIdx >= currentGroup.chars.length) { console.error("Invalid dIdx in Kigo practice 2"); return; }

                if (dIdx < currentGroup.chars.length - 1) {
                    nextDIdx = dIdx + 1;
                } else {
                    nextDIdx = 0;
                    nextGIdx = (gIdx + 1) % kigoPractice2Data.length;
                }
            } else if (practice === '記号の基本練習３') {
                if (gIdx < 0 || gIdx >= kigoPractice3Data.length) { console.error("Invalid gIdx in Kigo practice 3"); return; }
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
    // sendHid も side, kb の影響は受けない (変更なし)
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
            // このレポート送信 (0x02, 0x01/0x00) が全モデル/サイドで共通か要確認
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
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setTraining, setPractice, setGIdx, setDIdx, setOK, setLastInvalidKeyCode, activePractice /* onInput を削除 */]);

    /* HID input */
    const onInput: (ev: HIDInputReportEvent) => void = useCallback((ev) => {
        const data = new Uint8Array(ev.data.buffer);
        const reportId = data[0];
        const keyCode = data[1];
        const timestamp = Date.now();

        // 特殊キー処理 (練習モードON) - このコードもモデル/サイド依存か要確認
        if (reportId === 0x14 && keyCode === 0x03) {
            if (!training) {
                sendHid(true);
            }
            return;
        }

        // 通常のキー入力処理 - この reportId もモデル/サイド依存か要確認
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
                    // デバッグログ: 対応するプレスがないリリースイベント
                    console.warn(`Release event for keyCode 0x${keyCode.toString(16)} (derived pressCode 0x${pressCode.toString(16)}) without corresponding press event.`);
                }
            }
        }
    }, [training, practice, activePractice, handleInvalidInput, nextStage, sendHid]);


    /* 初期化 */
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        // URLのパスを '/' で分割。[0]は空文字, [1]がレイアウト名?, [2]がサイド?
        const pathParts = window.location.pathname.split('/').filter(p => p); // 空要素を除去
        const kbRaw = pathParts[0]; // 最初のパス部分 (例: 'tw-20h', 'tw-20v', または空)
        const sideRaw = pathParts[1] ?? 'right'; // 2番目のパス部分、なければ 'right'

        const currentKb = kbRaw === 'tw-20h' ? 'tw-20h' : 'tw-20v';
        setKb(currentKb);

        const currentSide = sideRaw === 'left' ? 'left' : 'right'; // サイドを決定
        setSide(currentSide); // 状態を更新

        const kbKey = currentKb as keyof typeof sampleJson;
        const sideKey = currentSide as keyof typeof sampleJson[typeof kbKey];
        if (sampleJson[kbKey] && sampleJson[kbKey][sideKey]) {
            const sel = sampleJson[kbKey][sideKey];
            setLayers(sel.layers); // 決定したレイアウトのデータを設定
            setTitle(`${currentKb.toUpperCase()} レイアウト (${currentSide})`); // タイトルを設定
            setCols(currentKb === 'tw-20v' ? 4 : 5); // カラム数を設定
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

    // 練習モード選択時のリセット処理 (変更なし)
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
    };

    /* heading（見出し） */
    const headingChars = activePractice?.headingChars ?? [];

    const heading = (
      <div className="flex justify-center">
        {headingChars.map((char: string, index: number) => { // ここで headingChars を使用
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
    // renderKana は表示のみなので side, kb の影響は直接受けない (変更なし)
    // ただし、activePractice.getHighlightClassName や isInvalidInputTarget が side, kb を考慮するようになる
    const renderKana = useCallback((layoutIndex: number) => (key: string, idx: number) => {
        let k = (key ?? '').trim();
        if (!k) return <div key={idx} className='p-3' />;

        const kigoMapping2: Record<string, string> = {
            'あ行': '＋', 'か行': '＿', 'さ行': '＊', 'た行': '－', 'な行': '＠',
            'は行': '・', 'ま行': '＆', 'や行': '｜', 'ら行': '％', 'わ行': '￥',
            '記号': '後押し',
        };

        let cName = '';
        let isInvalid = false;

        // 記号練習用の表示文字調整
        if (practice === '記号の基本練習１') {
            if (layoutIndex === 2) {
                const kigo1Char = layers[6]?.[idx]?.trim();
                if (kigo1Char && kigo1Char !== '____') {
                    k = kigo1Char;
                }
            }
        } else if (practice === '記号の基本練習２') {
            if (layoutIndex === 2) {
                k = kigoMapping2[key.trim()] ?? k;
            }
        } else if (practice === '記号の基本練習３') {
            if (layoutIndex === 2) {
                k = kigoMapping3[key.trim()] ?? k;
            }
        } else if (layoutIndex === 3) { // かなモード（エンド）での拗音キー非表示
            if (['拗１', '拗２', '拗３', '拗４'].includes(key.trim())) {
                k = '____';
            }
        }

        // 不正入力ハイライト
        if (lastInvalidKeyCode !== null) {
            const isStartLayoutInput = lastInvalidKeyCode <= 0x14; // 押下コードか？
            const pressCode = isStartLayoutInput ? lastInvalidKeyCode : lastInvalidKeyCode - 0x14; // 対応する押下コードを取得
            const targetKeyIndex = pressCode - 1; // 物理インデックス (0始まり) に変換
            let isTargetLayout = false;
            if (activePractice) {
                const logicLayoutIndex = practice === '記号の基本練習１' ? 6 : layoutIndex;
                // isInvalidInputTarget には押下/離上を示す元の keyCode と、レイアウト、物理インデックスを渡す
                isTargetLayout = activePractice.isInvalidInputTarget(lastInvalidKeyCode, logicLayoutIndex, idx);
            } else {
                 // 練習モード以外でのデフォルト動作 (あまり意味はないかも)
                 isTargetLayout = (isStartLayoutInput && layoutIndex === 2) || (!isStartLayoutInput && layoutIndex === 3);
            }
            // 不正入力されたキーの物理インデックスと、現在描画中のキーの物理インデックスが一致するか
            if (isTargetLayout && idx === targetKeyIndex) {
                cName = 'bg-red-100'; isInvalid = true;
            }
        }

        // 正解キーハイライト
        if (!isInvalid && !okVisible && activePractice) {
            const logicLayoutIndex = practice === '記号の基本練習１' ? 6 : layoutIndex;
            // 記号練習1以外は、現在のキーの文字列表現を渡す
            const highlightTargetKey = practice === '記号の基本練習１' ? layers[6]?.[idx]?.trim() ?? '' : key.trim();

            // getHighlightClassName には、キーの文字列表現とレイアウトインデックスを渡す
            const highlightClass = activePractice.getHighlightClassName(highlightTargetKey, logicLayoutIndex);
            cName = highlightClass ?? '';
        }

        return (
            <div key={idx} className={`border rounded p-3 text-center text-sm shadow flex justify-center items-center whitespace-pre-line ${cName}`}>
                {k}
            </div>
        );
    }, [activePractice, okVisible, lastInvalidKeyCode, practice, layers]);

    return (
        <div className='p-4 relative'>
            {showTrainingButton && (
                <button
                    className={`absolute top-4 right-4 px-4 py-1 rounded shadow text-white ${training ? 'bg-gray-600' : 'bg-green-600'}`}
                    onClick={() => { sendHid(!training); }}
                >
                    {training ? '練習モード OFF' : '練習モード ON'}
                </button>
            )}

            {!training && <h1 className='text-lg font-semibold mb-4'>{title}</h1>}
            {(fw || sn) && !training && (
                <div className='mb-4 text-sm text-gray-700 space-y-1'>
                    <p>FW: {fw ?? '不明'}</p>
                    <p>SN: {sn ?? '不明'}</p>
                </div>
            )}

            {training ? (
                <>
                    {practice && (
                        <div className='flex justify-center mb-6'>
                            {heading}
                        </div>
                    )}

                    <div className='grid grid-cols-3 gap-4 items-start'>
                        {/* メニュー (1列目) */}
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

                        {/* キーマップ表示部分 */}
                        {/* キーボードが1つの場合 (記号1, 2, 3) */}
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
                        /* キーボードが2つの場合 (その他) */
                        ) : practice ? (
                            <> {/* Fragment */}
                                {/* 2列目 */}
                                <div className="justify-self-center">
                                    <div style={{ width: fixedWidth }}>
                                        <h3 className='text-lg font-semibold mb-2 text-center'>かなモード（スタート）</h3>
                                        <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
                                            {layers[2]?.map(renderKana(2))}
                                        </div>
                                    </div>
                                </div>
                                {/* 3列目 */}
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
                                 {layerNames[li] ?? `Layer ${li}`}
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
