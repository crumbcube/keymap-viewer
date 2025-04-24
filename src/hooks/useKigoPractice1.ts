// src/hooks/useKigoPractice1.ts
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { kigoPractice1Data, sampleJson } from '../data/keymapData';
import {
    PracticeHookProps,
    PracticeInputInfo,
    PracticeInputResult,
    PracticeHookResult,
    KeyboardModel,
    hid2GyouHRight_Kigo1,
    hid2GyouHLeft_Kigo1,
    hid2GyouVRight_Kigo1,
    hid2GyouVLeft_Kigo1,
} from './usePracticeCommons';

// 長押し判定時間 (ミリ秒)
const LONG_PRESS_DURATION = 600;

const useKigoPractice1 = ({ gIdx, dIdx, isActive, okVisible, side, kb }: PracticeHookProps): PracticeHookResult => {
    const hid2Gyou = useMemo(() => {
        if (kb === 'tw-20v') {
            return side === 'left' ? hid2GyouVLeft_Kigo1 : hid2GyouVRight_Kigo1;
        } else { // TW-20H
            return side === 'left' ? hid2GyouHLeft_Kigo1 : hid2GyouHRight_Kigo1;
        }
    }, [side, kb]);

    const prevGIdxRef = useRef(gIdx);
    const prevDIdxRef = useRef(dIdx);
    const isInitialMount = useRef(true);

    const pressInfoRef = useRef<{ code: number; timestamp: number } | null>(null);
    const longPressTimerRef = useRef<number | null>(null);
    const [isLongPressSuccess, setIsLongPressSuccess] = useState(false);

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current !== null) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        prevGIdxRef.current = -1;
        prevDIdxRef.current = -1;
        isInitialMount.current = true;
        pressInfoRef.current = null;
        clearLongPressTimer();
        setIsLongPressSuccess(false);
    }, [clearLongPressTimer]);

    useEffect(() => {
        if (isActive) {
            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            if (isInitialMount.current || indicesChanged) {
                reset();
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            }
        } else {
            reset();
        }
        // クリーンアップ処理
        return () => {
            clearLongPressTimer();
        };
    }, [isActive, gIdx, dIdx, reset, clearLongPressTimer]);


    const currentGroup = useMemo(() => {
        if (!isActive || gIdx < 0 || gIdx >= kigoPractice1Data.length) return null;
        return kigoPractice1Data[gIdx];
    }, [isActive, gIdx]);

    const currentInputDef = useMemo(() => {
        if (!currentGroup?.inputs || dIdx < 0 || dIdx >= currentGroup.inputs.length) {
            return null;
        }
        return currentGroup.inputs[dIdx];
    }, [currentGroup, dIdx]);

    const headingChars = useMemo(() => {
        return currentGroup?.chars ?? [];
    }, [currentGroup]);

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        const expectedKeyName = currentInputDef?.keyName ?? null;
        const pressCode = inputInfo.pressCode;
        const inputKeyName = hid2Gyou[pressCode] ?? null;

        if (!isActive || !currentInputDef || okVisible) {
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

                // 正誤判定: 正しいキー かつ 0.6秒以上の長押し かつ 長押し成功フラグが立っている
                if (inputKeyName === expectedKeyName && duration >= LONG_PRESS_DURATION && isLongPressSuccess) {
                    isExpected = true;
                    shouldGoToNext = true;
                } else {
                    isExpected = false;
                }
            } else {
                isExpected = false; // 不正解扱い
            }
            pressInfoRef.current = null;
            setIsLongPressSuccess(false);
        } else {
            return { isExpected: false, shouldGoToNext: false };
        }

        if (inputInfo.type === 'release' && !isExpected) {
            // reset(); // 必要に応じてリセット
        }

        return { isExpected, shouldGoToNext };
    }, [isActive, currentInputDef, okVisible, hid2Gyou, kb, side, clearLongPressTimer, reset, isLongPressSuccess]);

    const getHighlightClassName = (key: string, layoutIndex: number): string | null => {
        if (!isActive || !currentInputDef || okVisible) {
            return null;
        }

        const expectedKeyName = currentInputDef.keyName;
        const targetLayoutIndex = 6; // 記号・長押しレイヤー

        if (layoutIndex === targetLayoutIndex && key === expectedKeyName) {
            // 長押し成功中は緑色、そうでなければ通常の青色ハイライト
            return isLongPressSuccess ? 'bg-green-200' : 'bg-blue-100';
        }
        return null;
    };

    const isInvalidInputTarget = useCallback((keyCode: number, layoutIndex: number, keyIndex: number): boolean => {
        if (!isActive) return false;
        // HIDコードが1始まりと仮定
        const targetKeyIndex = keyCode - 1;
        // layoutIndex や stage による絞り込みを行わない
        const isTarget = keyIndex === targetKeyIndex;
        return isTarget;
    }, [isActive]);

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget
    };
};

export default useKigoPractice1;
