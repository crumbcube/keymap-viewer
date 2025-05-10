// /home/coffee/my-keymap-viewer/src/App.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HIDDevice, HIDInputReportEvent } from './types/hid';
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
    basicPracticeMenuItems, // PracticeMenu で使うためインポート
    stepUpPracticeMenuItems, // PracticeMenu で使うためインポート
    challengeMenuItems, // PracticeMenu で使うためインポート
    youonDanMapping, // calculateNextIndices で使用 (現在は未使用だが、将来的に使う可能性のため残す)
    dakuonDanMapping, // calculateNextIndices で使用 (現在は未使用だが、将来的に使う可能性のため残す)
    handakuonDanMapping, // calculateNextIndices で使用 (現在は未使用だが、将来的に使う可能性のため残す)
    youdakuonDanMapping, // calculateNextIndices で使用 (現在は未使用だが、将来的に使う可能性のため残す)
    youhandakuonDanMapping, // calculateNextIndices で使用 (現在は未使用だが、将来的に使う可能性のため残す)
} from './data/keymapData';

import {
    PracticeMode,
    PracticeInputInfo,
    KeyboardSide,
    CharInfoGairaigo, // currentTarget の型チェック用
    KeyboardModel, // PracticeHeading に渡すためインポート
    PracticeStatus, // PracticeHeading に渡すためインポート
    isChallengeMode // isChallengeMode を usePracticeCommons からインポート
} from './hooks/usePracticeCommons';
import { useUrlAndKeyboardSetup } from './hooks/useUrlAndKeyboardSetup'; // 作成したフックをインポート


// 作成したコンポーネントをインポート
import AppLayout from './components/AppLayout'; // AppLayout をインポート
import { usePracticeManagement } from './hooks/usePracticeManagement'; // 新しいフックをインポート
import { useAppInteractions } from './hooks/useAppInteractions'; // 新しいフックをインポート
import { useAppCoreState } from './hooks/useAppCoreState'; // 新しいフックをインポート


export default function App() {
    // --- URLとキーボード設定の初期化 (useUrlAndKeyboardSetup フックを使用) ---
    const {
        initialKb, initialSide, initialLayers, initialTitle, initialCols,
        initialFw, initialSn, initialShowTrainingButton
    } = useUrlAndKeyboardSetup();

    // --- App Core State Hook ---
    const {
        layers, // setLayers is available if needed
        title,  // setTitle is available if needed
        fw,     // setFW is available if needed
        sn,     // setSN is available if needed
        cols,   // setCols is available if needed
        training, setTraining,
        showTrainingButton, // setShowTrainingButton is available if needed
        side,   // setSide is available if needed
        kb,     // setKb is available if needed
        fixedWidth,
        currentFunctionKeyMap,
    } = useAppCoreState({
        initialKb, initialSide, initialLayers, initialTitle, initialCols,
        initialFw, initialSn, initialShowTrainingButton
    });


    // --- App Interactions Hook ---
    const {
        showKeyLabels, setShowKeyLabels,
        isRandomMode, setIsRandomMode,
        lastInvalidKeyCode, setLastInvalidKeyCodeWithTimeout, clearLastInvalidKeyCode
    } = useAppInteractions(true, false);

    /* HID / カウンタ */
    const devRef = useRef<HIDDevice | null>(null);
    const opening = useRef(false);
    const pressedKeysRef = useRef<Map<number, number>>(new Map());
    const lastInvalidInputTime = useRef<number>(0);

    const trainingRef = useRef(training);
    
    // --- Practice Management Hook ---
    const practiceManager = usePracticeManagement({
        initialPracticeMode: '', // Initial practice mode
        initialGIdx: 0,
        initialDIdx: 0,
        isRandomMode,
        layers,
        side,
        kb,
        showKeyLabels,
        training,
        sampleJson,      // Imported in App.tsx from keymapData
        layerNames,      // Imported in App.tsx from keymapData
    });

    const {
        practice,
        gIdx,
        dIdx,
        activePractice,
        handlePracticeSelect: practiceManagerHandlePracticeSelect,
        nextStage,
        headingChars,
        isChallengeFinished,
        displayLayerIndices,
        keyboardLayersForDisplay,
    } = practiceManager;

    // Refs for HID callback (onInput)
    const practiceRef = useRef(practice);
    const activePracticeRef = useRef(activePractice);

    useEffect(() => {
        trainingRef.current = training;
    }, [training]);

    useEffect(() => {
        practiceRef.current = practice;
    }, [practice]);

    useEffect(() => {
        activePracticeRef.current = activePractice;
    }, [activePractice]);    

    // --- 不正入力処理 ---
    const handleInvalidInput = useCallback((pressCode: number) => {
        const now = Date.now();
        if (now - lastInvalidInputTime.current < 50) {
            return;
        }
        lastInvalidInputTime.current = now;
        setLastInvalidKeyCodeWithTimeout(pressCode);
    }, [setLastInvalidKeyCodeWithTimeout]);

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
                        const isNonSelfAdvancingPractice = !isChallengeMode(practiceRef.current); // Use ref here

                        if (result.shouldGoToNext === true && isNonSelfAdvancingPractice) {
                            // Call nextStage from practiceManager (which is already in scope)
                            nextStage(); 
                        }
                        // The line `setDIdx(prevDIdx => prevDIdx + 1)` for `shouldGoToNext === false` was removed
                        // as dIdx advancement for character sequence is handled by nextStage.
                   } else {
                        handleInvalidInput(pressCode);
                    }
                } else {
                    console.warn(`[App.onInput] Matching press event NOT FOUND for calculated pressCode: 0x${pressCode.toString(16)}. Current pressedKeys:`, Array.from(pressedKeysRef.current.keys()).map(k => `0x${k.toString(16)}`));
                }
            }
        }
    }, [handleInvalidInput, nextStage, setTraining, setShowKeyLabels, setIsRandomMode]); // Removed kb, side as they are not directly used

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
            practiceManagerHandlePracticeSelect(''); // Reset practice via hook
            clearLastInvalidKeyCode(); // Clear invalid key code highlight
            pressedKeysRef.current.clear();
            activePracticeRef.current?.reset?.();
            setShowKeyLabels(true);
            setIsRandomMode(false);
        }
     }, [setTraining, practiceManagerHandlePracticeSelect, clearLastInvalidKeyCode, setShowKeyLabels, setIsRandomMode]);

    /* 初期化 */
    useEffect(() => {
        // URLパラメータとキーボード設定の初期化は useUrlAndKeyboardSetup フックに移動したので、
        // ここでは主にHIDデバイスの初期化処理を行う。
        // もし、useUrlAndKeyboardSetup の結果に依存して何かをする必要がある場合は、
        // initialKb, initialSide などをこの useEffect の依存配列に追加し、
        // setKb(initialKb) のような処理をここで行うこともできるが、
        // useState の初期値として渡す方がシンプル。

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
                // devRef.current = null; // コンポーネントアンマウント時に null にするのは良いが、再接続ロジックとの兼ね合い
            }
        };
     }, [onInput]);

    // 練習モード選択時のリセット処理 (wrapper for hook's handlePracticeSelect)
    const handlePracticeSelect = (item: PracticeMode) => {
        practiceManagerHandlePracticeSelect(item); // Hook handles practice, gIdx, dIdx, and activePractice.reset()

        // UI feedback and state resets still in App.tsx
        clearLastInvalidKeyCode();
        pressedKeysRef.current.clear();
        setShowKeyLabels(true);
        setIsRandomMode(false); // 練習モード変更時はランダムモードをOFFにする
    };

    // ランダムモード切り替えハンドラ
    const toggleRandomMode = useCallback(() => {
        if (isChallengeMode(practiceRef.current)) { // Use ref for current practice
            console.warn("Cannot toggle random mode during challenge.");
            return;
        }
        const nextIsRandomMode = !isRandomMode;
        setIsRandomMode(nextIsRandomMode);
        // activePracticeRef.current?.reset?.(); // Hook's useEffect for isRandomMode will handle this
     }, [setIsRandomMode, isRandomMode]); // practiceRef は ref なので依存配列に不要

    const isChallengeModeActive = isChallengeMode(practice);

    // コンポーネント全体のJSX
    return (
        <AppLayout
            training={training}
            showTrainingButton={showTrainingButton}
            title={title}
            fw={fw}
            sn={sn}
            practice={practice}
            showKeyLabels={showKeyLabels}
            isRandomMode={isRandomMode}
            isChallengeModeActive={isChallengeModeActive}
            gIdx={gIdx}
            dIdx={dIdx}
            headingChars={headingChars}
            isChallengeFinished={isChallengeFinished}
            activePractice={activePractice}
            displayLayerIndices={displayLayerIndices}
            keyboardLayersForDisplay={keyboardLayersForDisplay}
            layers={layers}
            layerNames={layerNames}
            cols={cols}
            fixedWidth={fixedWidth}
            lastInvalidKeyCode={lastInvalidKeyCode}
            currentFunctionKeyMap={currentFunctionKeyMap}
            onToggleTraining={() => sendHid(!training)}
            onToggleShowKeyLabels={() => setShowKeyLabels(prev => !prev)}
            onToggleRandomMode={toggleRandomMode}
            onPracticeSelect={handlePracticeSelect}
        />
    );
}
