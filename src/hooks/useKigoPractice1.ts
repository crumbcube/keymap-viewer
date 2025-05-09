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
    PracticeHighlightResult,
} from './usePracticeCommons';

// 長押し判定時間 (ミリ秒)
const LONG_PRESS_DURATION = 600;

const useKigoPractice1 = ({
    gIdx,
    dIdx,
    isActive,
    side,
    kb,
    layers, // layers は使わないが props として受け取る
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
    const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持
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
        // isActive が false になった最初のタイミングでリセット
        if (!isActive && prevIsActiveRef.current) {
            console.log(`[Kigo1 useEffect] Resetting state because isActive became false.`);
            reset();
        }

        if (isActive) {
            // isActive が true になった最初のタイミング、または依存関係の変更時
            if (isActive && !prevIsActiveRef.current) {
                isInitialMount.current = true; // 強制的に初期マウント扱い
            }

            const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
            const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
            const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

            if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
                // 通常モードやインデックス変更時は reset の一部を実行 (ターゲット選択はしない)
                pressInfoRef.current = null;
                clearLongPressTimer();
                setIsLongPressSuccess(false);
                setRandomTarget(null); // 通常モードではランダムターゲットをクリア
                prevGIdxRef.current = gIdx;
                prevDIdxRef.current = dIdx;
                isInitialMount.current = false;
            } else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
                 console.log(`[Kigo1 useEffect] Random mode. randomModeChangedToTrue=${randomModeChangedToTrue}, isInitialMount=${isInitialMount.current}, !randomTarget=${!randomTarget}`);
                 selectNextRandomTarget();
                 isInitialMount.current = false;
                 prevGIdxRef.current = gIdx;
                 prevDIdxRef.current = dIdx;
            }
        }

        // 最後に前回の値を更新
        prevIsActiveRef.current = isActive;
        prevIsRandomModeRef.current = isRandomMode;

        return () => {
            clearLongPressTimer();
        };
    }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, clearLongPressTimer, selectNextRandomTarget]);

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

    const handleInput = useCallback((inputInfo: PracticeInputInfo): PracticeInputResult => {
        const pressCode = inputInfo.pressCode;
        const inputKeyName = hid2Gyou[pressCode] ?? null;

        if (!isActive || !expectedKeyName) {
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

                //console.log(`[Kigo1 handleInput Release] Key: ${inputKeyName}, Duration: ${duration}ms, isLongPressSuccess: ${isLongPressSuccess}, Expected: ${expectedKeyName}`);
                clearLongPressTimer();

                if (inputKeyName === expectedKeyName && duration >= LONG_PRESS_DURATION && isLongPressSuccess) {
                    isExpected = true;
                    if (isRandomMode) {
                        selectNextRandomTarget();
                        shouldGoToNext = false;
                    } else {
                        shouldGoToNext = true;
                    }
                } else {
                    isExpected = false;
                }
            } else {
                isExpected = false;
            }
            pressInfoRef.current = null;
            setIsLongPressSuccess(false);
        } else {
            return { isExpected: false, shouldGoToNext: false };
        }

        return { isExpected, shouldGoToNext };
    }, [
        isActive, expectedKeyName, hid2Gyou, clearLongPressTimer, isLongPressSuccess,
        isRandomMode, selectNextRandomTarget
    ]);

    const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
        const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
        if (!isActive || !expectedKeyName) {
            return noHighlight;
        }

        const targetLayoutIndex = 6; // 記号1はレイヤー6のみ

        const isMatchingDisplayKey = key === expectedKeyName;

        if (layoutIndex === targetLayoutIndex && isMatchingDisplayKey) {
            return { className: isLongPressSuccess ? 'bg-green-200' : 'bg-blue-100', overrideKey: null };
        }
        return noHighlight;
    }, [
        isActive, expectedKeyName, isLongPressSuccess
    ]);

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

    return {
        headingChars,
        handleInput,
        getHighlightClassName,
        reset,
        isInvalidInputTarget,
    };
};

export default useKigoPractice1;
