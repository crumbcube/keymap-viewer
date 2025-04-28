// /home/coffee/my-keymap-viewer/src/hooks/useKigoPractice1.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { kigoPractice1Data, functionKeyMaps } from '../data/keymapData';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    hid2GyouHRight_Kigo1,
    hid2GyouHLeft_Kigo1,
    hid2GyouVRight_Kigo1,
    hid2GyouVLeft_Kigo1,
    CharInfoKigo1,
    allKigo1CharInfos,
} from './usePracticeCommons';

// 長押し判定時間 (ミリ秒)
const LONG_PRESS_DURATION = 600;

const useKigoPractice1 = ({
    gIdx,
    dIdx,
    isActive,
    okVisible,
    side,
    kb,
    layers,
    isRandomMode
}: PracticeHookProps): PracticeHookResult => {
    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kigo1 : hid2GyouVRight_Kigo1;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kigo1 : hid2GyouHRight_Kigo1;
        }
    }, [side, kb]);

    const currentFunctionKeyMap = useMemo(() => {
        return functionKeyMaps[kb]?.[side] ?? {};
    }, [kb, side]);

    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);
    const prevIsRandomModeRef = useRef(isRandomMode);

    const pressInfoRef = useRef<{ code: number; timestamp: number } | null>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const [isLongPressSuccess, setIsLongPressSuccess] = useState(false);

    const [randomTarget, setRandomTarget] = useState<CharInfoKigo1 | null>(null);
    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current !== null) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const selectNextRandomTarget = useCallback(() => {
        if (allKigo1CharInfos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allKigo1CharInfos.length);
            const nextTarget = allKigo1CharInfos[randomIndex];
            console.log(">>> Selecting new random target (Kigo1):", nextTarget);
            setRandomTarget(nextTarget);
            // Kigo1 はステージがないのでステージリセットは不要
            pressInfoRef.current = null; // 状態リセット
            clearLongPressTimer();
            setIsLongPressSuccess(false);
        } else {
            setRandomTarget(null);
        }
    }, [setRandomTarget, clearLongPressTimer]);

    // reset 関数
    const reset = useCallback(() => {
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        pressInfoRef.current = null;
        clearLongPressTimer();
        setIsLongPressSuccess(false);
        setRandomTarget(null);
        prevIsRandomModeRef.current = false; // reset 時は false
    }, [clearLongPressTimer, setRandomTarget]);

    useEffect(() => {
        console.log("Kigo1 useEffect run. isActive:", isActive, "isRandomMode:", isRandomMode, "randomTarget:", randomTarget?.char);

        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                console.log("Resetting Kigo1 to normal mode or index changed");
                reset(); // reset 関数を呼び出す
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }

            if (isRandomMode && !randomTarget && (randomModeChangedToTrue || isInitialMount.current)) {
                 selectNextRandomTarget();
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            } else if (!isRandomMode && isInitialMount.current) {
                 reset(); // 通常モード初期化
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }

            prevIsRandomModeRef.current = isRandomMode;

        } else {
            reset(); // 非アクティブ時もリセット
        }
        return () => {
            clearLongPressTimer();
        };
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, clearLongPressTimer, selectNextRandomTarget]); // internalOkVisible を削除

    // 通常モード用
    const currentGroup = useMemo(() => {
        if (isRandomMode || !isActive || gIdx < 0 || gIdx >= kigoPractice1Data.length) return null;
        return kigoPractice1Data[gIdx];
    }, [isActive, isRandomMode, gIdx]);

    const currentInputDef = useMemo(() => {
        if (isRandomMode || !currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) {
            return null;
        }
        return currentGroup.inputs[dIdx];
    }, [isRandomMode, currentGroup, dIdx]);

    // ランダム/通常モード共通
    const expectedKeyName = useMemo(() => {
        if (isRandomMode) return randomTarget?.keyName ?? null;
        return currentInputDef?.keyName ?? null;
    }, [isRandomMode, randomTarget, currentInputDef]);

    // ヘッダー文字
    const headingChars = useMemo(() => {
        if (!isActive) return [];
        if (isRandomMode) {
            return randomTarget ? [randomTarget.char] : [];
        } else {
            return currentGroup?.chars ?? [];
        }
    }, [isActive, isRandomMode, randomTarget, currentGroup]);

    const currentOkVisible = okVisible;

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        const pressCode = inputInfo.pressCode;
        const inputKeyName = hid2Gyou[pressCode] ?? null;

        console.log("Kigo1 Input:", inputInfo, "Expected Key:", expectedKeyName, "Input Key:", inputKeyName, "RandomMode:", isRandomMode, "PropOK:", okVisible);

        if (!isActive || okVisible || !expectedKeyName) {
            console.log("Kigo1 Input Ignored: Inactive, OK visible, or expectedKeyName invalid");
            return { isExpected: false, shouldGoToNext: false };
        }

        let isExpected = false;
        let shouldGoToNext = false;

        if (inputInfo.type === 'press') {
            if (pressInfoRef.current || longPressTimerRef.current) {
                clearLongPressTimer();
                setIsLongPressSuccess(false);
            }
            pressInfoRef.current = { code: pressCode, timestamp: inputInfo.timestamp };

            longPressTimerRef.current = window.setTimeout(() => {
                if (pressInfoRef.current && hid2Gyou[pressInfoRef.current.code] === expectedKeyName) {
                    setIsLongPressSuccess(true);
                    console.log("Long press success flag set");
                } else {
                    console.log("Long press timer expired but key mismatch or pressInfo cleared");
                }
                longPressTimerRef.current = null;
            }, LONG_PRESS_DURATION);

            isExpected = false;
            shouldGoToNext = false;

        } else if (inputInfo.type === 'release') {
            if (pressInfoRef.current && pressCode === pressInfoRef.current.code) {
                const pressTimestamp = pressInfoRef.current.timestamp;
                const releaseTimestamp = inputInfo.timestamp;
                const duration = releaseTimestamp - pressTimestamp;

                clearLongPressTimer();

                console.log("Kigo1 Release Check: InputKey:", inputKeyName, "ExpectedKey:", expectedKeyName, "Duration:", duration, "LongPressSuccess:", isLongPressSuccess);

                if (inputKeyName === expectedKeyName && duration >= LONG_PRESS_DURATION && isLongPressSuccess) {
                    isExpected = true;
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                    }
                    console.log("Correct long press input");
                } else {
                    isExpected = false;
                    console.log("Incorrect input or duration too short or long press flag not set");
                }
            } else {
                isExpected = false;
                console.log("Release key mismatch with pressed key");
            }
            pressInfoRef.current = null;
            setIsLongPressSuccess(false);
        } else {
            return { isExpected: false, shouldGoToNext: false };
        }

        console.log("Kigo1 Result:", { isExpected, shouldGoToNext });
        return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, expectedKeyName, hid2Gyou, clearLongPressTimer, isLongPressSuccess,
        isRandomMode, selectNextRandomTarget // handleCorrectAndGoNextRandom, internalOkVisible, reset を削除
    ]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): string | null => {
        if (!isActive || okVisible || !expectedKeyName) {
            return null;
        }

        const targetLayoutIndex = 6; // 記号1はレイヤー6のみ

        const isMatchingDisplayKey = key === expectedKeyName;

        if (layoutIndex === targetLayoutIndex && isMatchingDisplayKey) {
            return isLongPressSuccess ? 'bg-green-200' : 'bg-blue-100';
        }
        return null;
    }, [
        isActive, okVisible, expectedKeyName, isLongPressSuccess // internalOkVisible, isRandomMode, hid2Gyou を削除
    ]);

    // ▼▼▼ isInvalidInputTarget 関数を修正 ▼▼▼
    const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        // 記号1はレイヤー6のみ表示・ハイライト対象
        if (layoutIndex !== 6) return false;

        const targetKeyIndex = pressCode - 1;

        // 押されたキーが機能キーかどうかを判定
        const isFunctionKey = currentFunctionKeyMap.hasOwnProperty(targetKeyIndex);

        if (isFunctionKey) {
            // 機能キーが押された場合、そのキーの位置が一致すればハイライト対象
            return keyIndex === targetKeyIndex;
        } else {
            // 機能キー以外の場合、レイヤー6の記号キーマッピングに存在するかどうかで判定
            // (hid2Gyou は Kigo1 用のマッピング)
            const isKigo1Key = hid2Gyou.hasOwnProperty(pressCode);
            // 記号キーが押された場合、そのキーの位置が一致すればハイライト対象
            // (ただし、本来押すべきキーではないので不正入力扱い)
            return isKigo1Key && keyIndex === targetKeyIndex;
        }
    }, [isActive, hid2Gyou, currentFunctionKeyMap]);
    // ▲▲▲ 修正完了 ▲▲▲

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
        isOkVisible: currentOkVisible,
    };
};

export default useKigoPractice1;
