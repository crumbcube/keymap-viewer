// /home/coffee/my-keymap-viewer/src/hooks/useYouhandakuonPractice.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
    youhandakuonPracticeData,
    functionKeyMaps,
    YouhandakuonInputDef,
} from '../data/keymapData';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    hid2GyouHRight_Kana,
    hid2GyouHLeft_Kana,
    hid2GyouVRight_Kana,
    hid2GyouVLeft_Kana,
    hid2DanHRight_Kana,
    hid2DanHLeft_Kana,
    hid2DanVRight_Kana,
    hid2DanVLeft_Kana,
    PracticeHighlightResult,
    CharInfoYouhandakuon, // CharInfoHandakuon -> CharInfoYouhandakuon
    allYouhandakuonCharInfos, // allHandakuonCharInfos -> allYouhandakuonCharInfos
    getHidKeyCodes, // <<< getHidKeyCodes をインポート
} from './usePracticeCommons';

type YouhandakuonStage =
    | 'gyouInput'
    | 'youonInput' | 'dakuonInput1' | 'waitAfterFirstDakuon' | 'dakuonInput2' | 'danInput';

const useYouhandakuonPractice = ({
    gIdx, // gIdx は常に 0
    dIdx,
    isActive,
    side,
    kb,
    layers, // layers は使わないが props として受け取る
    isRandomMode,
    showKeyLabels, // Destructure showKeyLabels
}: PracticeHookProps): PracticeHookResult => {
    const [stage, setStage] = useState<YouhandakuonStage>('gyouInput');
    const [showHighlightForSecondDakuon, setShowHighlightForSecondDakuon] = useState(true);
    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持
    const prevIsRandomModeRef = useRef(isRandomMode);
    const highlightDelayTimerRef = useRef<NodeJS.Timeout | null>(null); // Changed type to NodeJS.Timeout
    const highlightStateRef = useRef(true); // showHighlightForSecondDakuon の最新値を参照するための ref
    const [randomTarget, setRandomTarget] = useState<CharInfoYouhandakuon | null>(null);
    const waitTimerRef = useRef<number | null>(null); // 待機タイマー用の ref

    console.log(`[YouhandakuonPractice] Hook render. Props: gIdx=${gIdx}, dIdx=${dIdx}, isActive=${isActive}, isRandomMode=${isRandomMode}, stage=${stage}, showHighlightForSecondDakuon=${showHighlightForSecondDakuon}`);

    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana;
        }
    }, [side, kb]);

    const hid2Dan = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2DanVLeft_Kana : hid2DanVRight_Kana;
        } else { // TW-20H
            return side === 'left' ? hid2DanHLeft_Kana : hid2DanHRight_Kana;
        }
    }, [side, kb]);

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    const selectNextRandomTarget = useCallback(() => {
        if (allYouhandakuonCharInfos.length > 0) {
            console.log("[Youhandakuon selectNextRandomTarget] Selecting new random target.");
            const randomIndex = Math.floor(Math.random() * allYouhandakuonCharInfos.length);
            const nextTarget = allYouhandakuonCharInfos[randomIndex];
            setRandomTarget(nextTarget);
            setStage('gyouInput');
            setShowHighlightForSecondDakuon(true);
            if (highlightDelayTimerRef.current !== null) {
                clearTimeout(highlightDelayTimerRef.current);
                highlightDelayTimerRef.current = null;
            }
            if (waitTimerRef.current !== null) clearTimeout(waitTimerRef.current);
        } else {
            console.warn("[Youhandakuon selectNextRandomTarget] allYouhandakuonCharInfos is empty.");
            setRandomTarget(null);
        }
    }, [setRandomTarget, setStage, setShowHighlightForSecondDakuon]);

    const currentInputDef = useMemo((): YouhandakuonInputDef | null => {
        if (isRandomMode) {
            return randomTarget?.inputDef ?? null;
        }
        if (!isActive) return null;
        const currentGroup = youhandakuonPracticeData[0];
        if (!currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) return null;
        return currentGroup.inputs[dIdx];
    }, [isRandomMode, randomTarget, isActive, dIdx]);

    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            const currentGroup = youhandakuonPracticeData[0];
            return currentGroup?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget]);

    const reset = useCallback(() => {
        console.log("[Youhandakuon reset] Resetting practice state.");
        setStage('gyouInput');
        setShowHighlightForSecondDakuon(true);
        if (highlightDelayTimerRef.current !== null) {
            clearTimeout(highlightDelayTimerRef.current);
            highlightDelayTimerRef.current = null;
        }
        if (waitTimerRef.current !== null) clearTimeout(waitTimerRef.current);
        setRandomTarget(null);
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        prevIsRandomModeRef.current = false;
    }, [setStage, setShowHighlightForSecondDakuon, setRandomTarget]);

    useEffect(() => {
        console.log(`[Youhandakuon useEffect for props] Start. isActive=${isActive}, prevIsActive=${prevIsActiveRef.current}, isRandomMode=${isRandomMode}, prevIsRandomMode=${prevIsRandomModeRef.current}, dIdx=${dIdx}, prevDIdx=${prevDIdxRef.current}, isInitialMount=${isInitialMount.current}, randomTarget=${randomTarget?.char}`);
        if (!isActive && prevIsActiveRef.current) {
            reset();
        }

        if (isActive) {
            if (isActive && !prevIsActiveRef.current) {
                isInitialMount.current = true;
                console.log("[Youhandakuon useEffect for props] Just activated. Forcing initial mount logic.");
            }
            const indicesChanged = dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                console.log(`[Youhandakuon useEffect for props] Reset condition met (Normal mode or switched to Normal). isInitialMount=${isInitialMount.current}, indicesChanged=${indicesChanged}. Resetting state.`);
                reset(); // reset を呼ぶことでステージとハイライト状態が初期化される
                prevGIdxRef.current = 0;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }

            if (isRandomMode && (randomModeChangedToTrue || (isInitialMount.current && !randomTarget) || !randomTarget)) {
                console.log(`[Youhandakuon useEffect for props] Random mode condition met. randomModeChangedToTrue=${randomModeChangedToTrue}, isInitialMount.current=${isInitialMount.current}, !randomTarget=${!randomTarget}. Generating random target.`);
                selectNextRandomTarget();
                isInitialMount.current = false;
                prevGIdxRef.current = -1;
                prevDIdxRef.current = -1;
            } else if (!isRandomMode && isInitialMount.current) {
                console.log("[Youhandakuon useEffect for props] Normal mode initial mount.");
                reset();
                isInitialMount.current = false;
                prevGIdxRef.current = 0;
                prevDIdxRef.current = dIdx;
            }
        }
        prevIsActiveRef.current = isActive;
        prevIsRandomModeRef.current = isRandomMode; // prevIsRandomModeRef の更新をここに移動
        console.log(`[Youhandakuon useEffect for props] End. Updated refs: prevIsActive=${prevIsActiveRef.current}, prevIsRandomMode=${prevIsRandomModeRef.current}`);


        return () => {
            if (highlightDelayTimerRef.current !== null) {
                clearTimeout(highlightDelayTimerRef.current);
            }
            if (waitTimerRef.current !== null) {
                clearTimeout(waitTimerRef.current);
            }
        };
    }, [isActive, isRandomMode, dIdx, randomTarget, reset, selectNextRandomTarget]);

    useEffect(() => {
        return () => {
            if (waitTimerRef.current !== null) clearTimeout(waitTimerRef.current);
        };
    }, []);

    useEffect(() => {
        highlightStateRef.current = showHighlightForSecondDakuon;
        console.log(`[Youhandakuon useEffect for showHighlight] showHighlightForSecondDakuon changed to: ${showHighlightForSecondDakuon}`);
    }, [showHighlightForSecondDakuon]);

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        console.log(`[Youhandakuon handleInput] Start. Stage: ${stage}, Input pressCode: 0x${inputInfo.pressCode.toString(16)}, currentInputDef: ${currentInputDef?.gyouKey}-${currentInputDef?.dan}`);
        if (!isActive || !currentInputDef) {
            console.log(`[Youhandakuon handleInput] Not active or no currentInputDef. Returning.`);
            return { isExpected: false, shouldGoToNext: undefined };
        }
        if (inputInfo.type !== 'release') {
            console.log(`[Youhandakuon handleInput] Not release event. Returning.`);
            return { isExpected: false, shouldGoToNext: undefined };
        }

        const pressCode = inputInfo.pressCode;
        let isExpected = false;
        let shouldGoToNext_final: boolean | undefined = undefined;
        let nextStageInternal: YouhandakuonStage = stage;

        const youonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyCodeEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        const expectedYouonKeyCode = youonKeyCodeEntry ? parseInt(youonKeyCodeEntry[0]) + 1 : -1;
        const expectedDakuonKeyCode = dakuonKeyCodeEntry ? parseInt(dakuonKeyCodeEntry[0]) + 1 : -1;

        if (expectedYouonKeyCode === -1 || expectedDakuonKeyCode === -1) {
            console.error("useYouhandakuonPractice: Could not find key codes for '拗音' or '濁音'.");
            return { isExpected: false, shouldGoToNext: undefined };
        }

        // dakuonInput1 以外のステージでタイマーが残っていればクリア
        if (stage !== 'dakuonInput1' && highlightDelayTimerRef.current !== null) {
            console.log("[Youhandakuon handleInput] Clearing highlightDelayTimerRef because stage is not dakuonInput1.");
            clearTimeout(highlightDelayTimerRef.current);
            highlightDelayTimerRef.current = null;
        }
        // dakuonInput1 以外のステージでは常にハイライトを許可
        if (stage !== 'dakuonInput1') {
            if (!showHighlightForSecondDakuon) { // 状態が false の場合のみ true に設定
                console.log("[Youhandakuon handleInput] Setting showHighlightForSecondDakuon(true) because stage is not dakuonInput1 and it was false.");
                setShowHighlightForSecondDakuon(true);
            }
        }

        switch (stage) {
            case 'gyouInput':
                const expectedGyouKeyCodes = Object.entries(hid2Gyou)
                    .filter(([_, name]) => name === currentInputDef.gyouKey)
                    .map(([codeStr, _]) => parseInt(codeStr));
                if (expectedGyouKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    nextStageInternal = 'youonInput';
                    shouldGoToNext_final = undefined;
                    console.log(`[Youhandakuon handleInput] GyouInput correct. Next stage: ${nextStageInternal}`);
                } else {
                    nextStageInternal = 'gyouInput';
                    shouldGoToNext_final = undefined;
                    console.log(`[Youhandakuon handleInput] GyouInput incorrect. Staying in stage: ${nextStageInternal}`);
                }
                break;
            case 'youonInput':
                if (pressCode === expectedYouonKeyCode) {
                    isExpected = true;
                    nextStageInternal = 'dakuonInput1';
                    shouldGoToNext_final = undefined;
                    console.log(`[Youhandakuon handleInput] YouonInput correct. Next stage: ${nextStageInternal}`);
                } else {
                    nextStageInternal = 'gyouInput';
                    shouldGoToNext_final = undefined;
                    console.log(`[Youhandakuon handleInput] YouonInput incorrect. Resetting stage: ${nextStageInternal}`);
                }
                break;
            case 'dakuonInput1':
                console.log(`[Youhandakuon handleInput] dakuonInput1. pressCode: 0x${pressCode.toString(16)}, expectedDakuonKeyCode: ${expectedDakuonKeyCode}`);
                if (pressCode === expectedDakuonKeyCode) {
                    isExpected = true;
                    nextStageInternal = 'waitAfterFirstDakuon';
                    console.log("[Youhandakuon handleInput] DakuonInput1 correct. Setting showHighlightForSecondDakuon(false) and starting 500ms highlight timer.");
                    setShowHighlightForSecondDakuon(false);
                    if (highlightDelayTimerRef.current !== null) {
                        clearTimeout(highlightDelayTimerRef.current);
                    }
                    highlightDelayTimerRef.current = setTimeout(() => { // Use global setTimeout
                        console.log("[Youhandakuon handleInput] Highlight timer (500ms) finished. Setting showHighlightForSecondDakuon(true).");
                        setShowHighlightForSecondDakuon(true);
                        highlightDelayTimerRef.current = null;
                    }, 500);

                    const waitDuration = showKeyLabels ? 500 : 0;
                    console.log(`[Youhandakuon handleInput] DakuonInput1 correct. Starting waitTimer for stage transition (${waitDuration}ms).`);
                    if (waitTimerRef.current !== null) clearTimeout(waitTimerRef.current);
                    waitTimerRef.current = window.setTimeout(() => {
                        console.log(`[Youhandakuon handleInput] Wait timer (${waitDuration}ms) finished. Setting stage to dakuonInput2.`);
                        setStage('dakuonInput2'); // タイマー完了後にステージ遷移
                        waitTimerRef.current = null;
                    }, waitDuration);
                    shouldGoToNext_final = undefined;
                } else {
                    isExpected = false;
                    nextStageInternal = 'gyouInput';
                    shouldGoToNext_final = undefined;
                    console.log(`[Youhandakuon handleInput] DakuonInput1 incorrect. Resetting stage: ${nextStageInternal}. Resetting highlight timer.`);
                    setShowHighlightForSecondDakuon(true);
                    if (highlightDelayTimerRef.current !== null) {
                        clearTimeout(highlightDelayTimerRef.current);
                        highlightDelayTimerRef.current = null;
                    }
                }
                break;
            case 'waitAfterFirstDakuon':
                isExpected = false;
                shouldGoToNext_final = undefined;
                console.log("[Youhandakuon handleInput] Input received during waitAfterFirstDakuon. Ignoring input.");
                break;
            case 'dakuonInput2':
                console.log(`[Youhandakuon handleInput] dakuonInput2. pressCode: 0x${pressCode.toString(16)}, expectedDakuonKeyCode: ${expectedDakuonKeyCode}`);
                if (pressCode === expectedDakuonKeyCode) {
                    isExpected = true;
                    nextStageInternal = 'danInput';
                    shouldGoToNext_final = undefined;
                    console.log(`[Youhandakuon handleInput] DakuonInput2 correct. Next stage: ${nextStageInternal}`);
                } else {
                    nextStageInternal = 'gyouInput';
                    shouldGoToNext_final = undefined;
                    console.log(`[Youhandakuon handleInput] DakuonInput2 incorrect. Resetting stage: ${nextStageInternal}. Resetting highlight timer.`);
                    setShowHighlightForSecondDakuon(true);
                    if (highlightDelayTimerRef.current !== null) {
                        clearTimeout(highlightDelayTimerRef.current);
                        highlightDelayTimerRef.current = null;
                    }
                }
                break;
            case 'danInput':
                const expectedDanKeyCodes = Object.entries(hid2Dan)
                    .filter(([_, name]) => name === currentInputDef.dan)
                    .map(([codeStr, _]) => parseInt(codeStr));
                nextStageInternal = 'gyouInput';
                if (expectedDanKeyCodes.includes(pressCode)) {
                    isExpected = true;
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext_final = false;
                    } else {
                        const currentGroupChars = youhandakuonPracticeData[0]?.chars ?? [];
                        const isLastInGroup = dIdx >= currentGroupChars.length - 1;
                        shouldGoToNext_final = isLastInGroup;
                    }
                    console.log(`[Youhandakuon handleInput] DanInput correct. shouldGoToNext_final: ${shouldGoToNext_final}`);
                } else {
                    shouldGoToNext_final = undefined;
                    setShowHighlightForSecondDakuon(true);
                    if (highlightDelayTimerRef.current !== null) {
                        clearTimeout(highlightDelayTimerRef.current);
                        highlightDelayTimerRef.current = null;
                    }
                    console.log(`[Youhandakuon handleInput] DanInput incorrect. Resetting stage: ${nextStageInternal}. shouldGoToNext_final: ${shouldGoToNext_final}. Resetting highlight timer.`);
                }
                break;
        }

        if (nextStageInternal !== stage && stage !== 'dakuonInput1') {
            setStage(nextStageInternal);
            console.log(`[Youhandakuon handleInput] Stage changed from ${stage} to ${nextStageInternal}.`);
        } else if (!isExpected && stage !== 'gyouInput') {
             setStage('gyouInput');
             setShowHighlightForSecondDakuon(true);
             if (highlightDelayTimerRef.current !== null) {
                 clearTimeout(highlightDelayTimerRef.current);
                 highlightDelayTimerRef.current = null;
             }
             if (waitTimerRef.current !== null) {
                clearTimeout(waitTimerRef.current);
                waitTimerRef.current = null;
            }
            console.log(`[Youhandakuon handleInput] Incorrect input in stage ${stage}. Resetting stage to gyouInput.`);
        }
        console.log(`[Youhandakuon handleInput] Returning: isExpected=${isExpected}, shouldGoToNext=${shouldGoToNext_final}`);
        return { isExpected, shouldGoToNext: shouldGoToNext_final };
    }, [
        isActive, stage, currentInputDef, hid2Gyou, hid2Dan, currentFunctionKeyMap,
        isRandomMode, showKeyLabels, setStage, setShowHighlightForSecondDakuon, selectNextRandomTarget,
        dIdx
    ]);

    const getHighlightClassName = useCallback((keyName: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        console.log(`[Youhandakuon getHighlightClassName] Start. keyName: ${keyName}, layoutIndex: ${layoutIndex}, stage: ${stage}, showHighlightForSecondDakuon (state): ${showHighlightForSecondDakuon}, currentInputDef: ${currentInputDef?.gyouKey}-${currentInputDef?.dan}`);

        if (!isActive || !currentInputDef) {
            console.log(`[Youhandakuon getHighlightClassName] Not active or no currentInputDef. Returning noHighlight.`);
            return noHighlight;
        }
        if (stage === 'waitAfterFirstDakuon') {
            console.log("[Youhandakuon getHighlightClassName] Stage is waitAfterFirstDakuon. No highlight.");
            return noHighlight;
        }

        const indicesJustChanged = !isRandomMode && dIdx !== prevDIdxRef.current;
        const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;
        console.log(`[Youhandakuon getHighlightClassName] currentStageForHighlight: ${currentStageForHighlight}`);

        let expectedKeyName: string | null = null;
        let targetLayoutIndex: number | null = null;

        const youonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '拗音');
        const dakuonKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === '濁音');
        const youonDisplayName = youonKeyEntry ? currentFunctionKeyMap[parseInt(youonKeyEntry[0])] : '拗音';
        const dakuonDisplayName = dakuonKeyEntry ? currentFunctionKeyMap[parseInt(dakuonKeyEntry[0])] : '濁音';

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = currentInputDef.gyouKey;
                targetLayoutIndex = 2;
                break;
            case 'youonInput':
                expectedKeyName = youonDisplayName;
                targetLayoutIndex = 2;
                break;
            case 'dakuonInput1':
                console.log(`[Youhandakuon getHighlightClassName] Stage dakuonInput1. showHighlightForSecondDakuon (state): ${showHighlightForSecondDakuon}`);
                if (showHighlightForSecondDakuon) { // state の値を直接使用
                    expectedKeyName = dakuonDisplayName;
                    targetLayoutIndex = 2;
                } else {
                    // If showHighlightForSecondDakuon is false, explicitly return no highlight
                    return noHighlight;
                }
                break;
            case 'dakuonInput2':
                console.log(`[Youhandakuon getHighlightClassName] Stage dakuonInput2. showHighlightForSecondDakuon (state): ${showHighlightForSecondDakuon}`);
                if (showHighlightForSecondDakuon) { // state の値を直接使用
                    expectedKeyName = dakuonDisplayName;
                    targetLayoutIndex = 2;
                } else {
                    expectedKeyName = null;
                    targetLayoutIndex = null;
                }
                break;
            case 'danInput':
                expectedKeyName = currentInputDef.dan;
                targetLayoutIndex = 3;
                break;
        }
        console.log(`[Youhandakuon getHighlightClassName] Expected key: ${expectedKeyName}, Target layout: ${targetLayoutIndex}`);

        if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && keyName === expectedKeyName) {
            console.log(`[Youhandakuon getHighlightClassName] Match found! Highlighting key: ${keyName} at layout ${layoutIndex}.`);
            return { className: 'bg-blue-100', overrideKey: null };
        }
        console.log(`[Youhandakuon getHighlightClassName] No match. Returning noHighlight.`);
        return noHighlight;
    }, [
        isActive, stage, currentInputDef, isRandomMode, dIdx, currentFunctionKeyMap,
        showHighlightForSecondDakuon
    ]);

    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        const targetKeyIndex = pressCode - 1;

        let expectedLayoutIndex: number | null = null;
        switch (stage) {
            case 'gyouInput':
            case 'youonInput':
            case 'dakuonInput1':
            case 'waitAfterFirstDakuon':
            case 'dakuonInput2':
                expectedLayoutIndex = 2;
                break;
            case 'danInput':
                expectedLayoutIndex = 3;
                break;
        }
        const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive, stage]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
    };
};

export default useYouhandakuonPractice;
