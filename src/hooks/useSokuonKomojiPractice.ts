// src/hooks/useSokuonKomojiPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  PracticeHookProps,
  PracticeHookResult,
  PracticeInputInfo,
  PracticeInputResult,
  KeyboardModel,
  hid2GyouHRight_Kana,
  hid2GyouHLeft_Kana,
  hid2DanHRight_Kana,
  hid2DanHLeft_Kana,
  hid2GyouVRight_Kana,
  hid2GyouVLeft_Kana,
  hid2DanVRight_Kana,
  hid2DanVLeft_Kana,
} from './usePracticeCommons';
import { sokuonKomojiData } from '../data/keymapData';

type SokuonKomojiStage = 'gyouInput' | 'sokuonInput' | 'danInput' | 'tsuInput';

const komojiChars = ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'];

export default function useSokuonKomojiPractice({
  isActive,
  gIdx,
  dIdx,
  okVisible,
  side,
  kb
}: PracticeHookProps): PracticeHookResult {
  const [stage, setStage] = useState<SokuonKomojiStage>('gyouInput');
  const { hid2Gyou, hid2Dan } = useMemo(() => {
      if (kb === 'tw-20v') {
          return side === 'left'
              ? { hid2Gyou: hid2GyouVLeft_Kana, hid2Dan: hid2DanVLeft_Kana }
              : { hid2Gyou: hid2GyouVRight_Kana, hid2Dan: hid2DanVRight_Kana };
      } else { // TW-20H
          return side === 'left'
              ? { hid2Gyou: hid2GyouHLeft_Kana, hid2Dan: hid2DanHLeft_Kana }
              : { hid2Gyou: hid2GyouHRight_Kana, hid2Dan: hid2DanHRight_Kana };
      }
  }, [side, kb]);

  // side と kb に応じたキーコードを取得 (TW-20V は仮)
  const sokuonKeyCode = useMemo(() => {
      if (kb === 'tw-20v') {
          // TW-20V の促音コード (仮 - 正確な値に要修正)
          return side === 'left' ? 0x04 : 0x02;
      } else { // TW-20H
          // TW-20H の促音コードは Left: 0x02, Right: 0x02
          return 0x02;
      }
  }, [kb, side]);

  const dakuonKeyCode = useMemo(() => {
      if (kb === 'tw-20v') {
          // TW-20V の濁音コード (仮 - 正確な値に要修正)
          return side === 'left' ? 0x02 : 0x04;
      } else { // TW-20H
          // TW-20H は Left/Right ともに 0x04
          return 0x04;
      }
  }, [kb, side]);

  const prevGIdxRef = useRef(gIdx);
  const prevDIdxRef = useRef(dIdx);
  const isInitialMount = useRef(true);

  const currentSet = useMemo(() => {
    if (!isActive || gIdx < 0 || gIdx >= sokuonKomojiData.length) return null;
    return sokuonKomojiData[gIdx];
  }, [isActive, gIdx]);

  const currentChar = useMemo(() => currentSet?.chars[dIdx], [currentSet, dIdx]);
  const currentInputInfo = useMemo(() => currentSet?.inputs[dIdx], [currentSet, dIdx]);
  const isTsu = useMemo(() => currentChar === 'っ', [currentChar]);

  const isKomoji = useMemo(() => {
    return typeof currentChar === 'string' && komojiChars.includes(currentChar);
  }, [currentChar]);

  const headingChars = useMemo(() => {
    if (!isActive || !currentSet) return [];
    return currentSet.chars;
  }, [isActive, currentSet]);

  const getInitialStage = useCallback((checkIsTsu: boolean): SokuonKomojiStage => {
      return checkIsTsu ? 'tsuInput' : 'gyouInput';
  }, []);

  useEffect(() => {
      if (isActive) {
          const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
          if (isInitialMount.current || indicesChanged) {
              const initialStage = getInitialStage(isTsu);
              setStage(initialStage);
              prevGIdxRef.current = gIdx;
              prevDIdxRef.current = dIdx;
              isInitialMount.current = false;
          }
      } else {
          prevGIdxRef.current = -1;
          prevDIdxRef.current = -1;
          isInitialMount.current = true;
      }
  }, [isActive, gIdx, dIdx, isTsu, getInitialStage]);

  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {
      if (!isActive || okVisible || !currentSet || (!isTsu && !currentInputInfo)) {
          return { isExpected: false, shouldGoToNext: false };
      }
      if (input.type !== 'release') {
          return { isExpected: false, shouldGoToNext: false };
      }

      const inputGyou = hid2Gyou[input.pressCode] ?? null;
      const inputDan = hid2Dan[input.pressCode] ?? null;
      const pressCode = input.pressCode;
      let isExpected = false;
      let shouldGoToNext = false;

      if (isTsu) {
        if (stage === 'tsuInput' && pressCode === sokuonKeyCode) {
          isExpected = true;
          shouldGoToNext = true;
        }
      } else if (currentInputInfo) {
        const expectedGyouKey = currentInputInfo.gyouKey;
        const expectedDan = currentInputInfo.dan;

        switch (stage) {
          case 'gyouInput':
            const expectedGyouKeyCodes = Object.entries(hid2Gyou)
              .filter(([_, name]) => name === expectedGyouKey)
              .map(([codeStr, _]) => parseInt(codeStr));
            if (inputGyou === expectedGyouKey && expectedGyouKeyCodes.includes(pressCode)) {
              setStage('sokuonInput');
              isExpected = true;
            }
            break;
          case 'sokuonInput':
            if (pressCode === dakuonKeyCode) {
              setStage('danInput');
              isExpected = true;
            }
            break;
          case 'danInput':
            if (inputDan === expectedDan) {
              isExpected = true;
              shouldGoToNext = true;
            }
            break;
          case 'tsuInput':
            // isTsu=false の場合はここに来ないはず
            break;
        }
      }

      if (!isExpected) {
           const initialStage = getInitialStage(isTsu);
           setStage(initialStage);
           isExpected = false;
      }

      return { isExpected, shouldGoToNext };
    },
    [isActive, okVisible, stage, currentSet, currentInputInfo, isTsu, isKomoji, hid2Gyou, hid2Dan, sokuonKeyCode, dakuonKeyCode, getInitialStage, kb, side, currentChar]
  );

  const getHighlightClassName = (key: string, layoutIndex: number): string | null => {
      const indicesJustChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
      const isProblemSwitch = indicesJustChanged && !okVisible;

      if (!isActive || okVisible || !currentSet || (!isTsu && !currentInputInfo)) {
          return null;
      }

      const currentStageForHighlight = isProblemSwitch ? getInitialStage(isTsu) : stage;

      let expectedKeyName: string | null = null;
      let targetLayoutIndex: number | null = null;

      if (isTsu) {
        if (currentStageForHighlight === 'tsuInput') {
            expectedKeyName = '促音';
            targetLayoutIndex = 2;
        }
      } else if (currentInputInfo) {
        const expectedGyouKey = currentInputInfo.gyouKey;
        const expectedDan = currentInputInfo.dan;

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = expectedGyouKey;
                targetLayoutIndex = 2;
                break;
            case 'sokuonInput':
                expectedKeyName = '濁音';
                targetLayoutIndex = 2;
                break;
            case 'danInput':
                expectedKeyName = expectedDan;
                targetLayoutIndex = 3;
                break;
            case 'tsuInput':
                 break;
        }
      }

      if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
          return 'bg-blue-100';
      }
      return null;
    };

  const reset = useCallback(() => {
    const initialStage = getInitialStage(isTsu);
    setStage(initialStage);
    prevGIdxRef.current = -1;
    prevDIdxRef.current = -1;
    isInitialMount.current = true;
  }, [isTsu, getInitialStage]);

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
    isInvalidInputTarget,
  };
}
