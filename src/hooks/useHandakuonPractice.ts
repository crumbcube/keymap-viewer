// /home/coffee/my-keymap-viewer/src/hooks/useHandakuonPractice.ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  PracticeHookProps,
  PracticeHookResult,
  PracticeInputInfo,
  PracticeInputResult,
  hid2GyouHRight_Kana,
  hid2GyouHLeft_Kana,
  hid2DanHRight_Kana,
  hid2DanHLeft_Kana,
  hid2GyouVRight_Kana,
  hid2GyouVLeft_Kana,
  hid2DanVRight_Kana,
  hid2DanVLeft_Kana,
  CharInfoHandakuon,
  allHandakuonCharInfos,
  PracticeHighlightResult,
} from './usePracticeCommons';
import { handakuonGyouList, handakuonGyouChars, handakuonDanMapping } from '../data/keymapData';

type HandakuonStage = 'gyouInput' | 'handakuonInput' | 'danInput';

export default function useHandakuonPractice({
  isActive,
  gIdx, // 半濁音は gIdx を使わないが、props としては受け取る
  dIdx,
  side,
  kb,
  isRandomMode
}: PracticeHookProps): PracticeHookResult {
  const [stage, setStage] = useState<HandakuonStage>('gyouInput');
  const [isBlinking, setIsBlinking] = useState(false);
  const inputCount = useRef<number>(0);
  const blinkTimeoutRef = useRef<number | null>(null);
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

  const hGyouKeyCode = useMemo(() => {
      const entry = Object.entries(hid2Gyou).find(([_, name]) => name === 'は行');
      return entry ? parseInt(entry[0]) : null;
  }, [hid2Gyou]);

  const dakuonKeyCode = useMemo(() => {
      const gyouMap = kb === 'tw-20v'
          ? (side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana)
          : (side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana);
      const entry = Object.entries(gyouMap).find(([_, name]) => name === '濁音');
      return entry ? parseInt(entry[0]) : null;
  }, [side, kb]);

  const [randomTarget, setRandomTarget] = useState<CharInfoHandakuon | null>(null);
  const prevDIdxRef = useRef(dIdx); // gIdx は常に0なので prevGIdxRef は不要
  const isInitialMount = useRef(true);
  const prevIsActiveRef = useRef(isActive);
  const prevIsRandomModeRef = useRef(isRandomMode);

  const resetBlinkingState = useCallback(() => {
    setIsBlinking(false);
    inputCount.current = 0;
    if (blinkTimeoutRef.current !== null) {
      clearTimeout(blinkTimeoutRef.current);
      blinkTimeoutRef.current = null;
    }
  }, []);

  const selectNextRandomTarget = useCallback(() => {
      if (allHandakuonCharInfos.length > 0) {
          const randomIndex = Math.floor(Math.random() * allHandakuonCharInfos.length);
          setRandomTarget(allHandakuonCharInfos[randomIndex]);
          setStage('gyouInput');
          resetBlinkingState();
      } else {
          setRandomTarget(null);
      }
  }, [setRandomTarget, setStage, resetBlinkingState]);

  const reset = useCallback(() => {
    setStage('gyouInput');
    resetBlinkingState();
    setRandomTarget(null);
    prevDIdxRef.current = -1; // dIdx の前回値をリセット
    isInitialMount.current = true;
    prevIsRandomModeRef.current = false;
  }, [resetBlinkingState, setStage, setRandomTarget]);

  useEffect(() => {
    if (!isActive && prevIsActiveRef.current) {
        reset();
    }

    if (isActive) {
        const justActivated = isActive && !prevIsActiveRef.current;
        const indicesChangedInNormalMode = !isRandomMode && (dIdx !== prevDIdxRef.current);
        const switchedToNormalMode = !isRandomMode && prevIsRandomModeRef.current;
        const switchedToRandomMode = isRandomMode && !prevIsRandomModeRef.current;

        if (justActivated) {
            isInitialMount.current = true;
        }

        if (switchedToNormalMode || (!isRandomMode && (isInitialMount.current || indicesChangedInNormalMode))) {
            setStage('gyouInput');
            resetBlinkingState();
            setRandomTarget(null);
            prevDIdxRef.current = dIdx;
            isInitialMount.current = false;
        } else if (isRandomMode && (switchedToRandomMode || isInitialMount.current || !randomTarget)) {
            selectNextRandomTarget();
            isInitialMount.current = false;
            // prevDIdxRef.current = dIdx; // ランダムモードでは dIdx の追跡は必須ではない
        }
    }
    prevIsActiveRef.current = isActive;
    prevIsRandomModeRef.current = isRandomMode;

    return () => {
        if (blinkTimeoutRef.current !== null) {
            clearTimeout(blinkTimeoutRef.current);
        }
    };
  }, [isActive, isRandomMode, dIdx, reset, selectNextRandomTarget, resetBlinkingState, randomTarget, setStage]);


  const currentDan = useMemo(() => {
      if (isRandomMode) return randomTarget?.danKey ?? null;
      if (!isActive) return null;
      const danList = handakuonDanMapping['は行'];
      if (!danList || dIdx < 0 || dIdx >= danList.length) return null;
      return danList[dIdx];
  }, [isActive, isRandomMode, randomTarget, dIdx]);

  const headingChars = useMemo(() => {
    if (!isActive) return [];
    const charsForGyou = handakuonGyouChars['は行'];
    if (!charsForGyou || charsForGyou.length === 0) return [];

    if (isRandomMode) {
        return randomTarget ? [randomTarget.char] : [];
    } else {
        return charsForGyou;
    }
  }, [isActive, isRandomMode, randomTarget]);

  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {
      if (!isActive || !currentDan || hGyouKeyCode === null || dakuonKeyCode === null) {
          return { isExpected: false, shouldGoToNext: undefined };
      }
      if (input.type !== 'release') {
          return { isExpected: false, shouldGoToNext: undefined };
      }

      const pressCode = input.pressCode;
      let isExpected = false;
      let shouldGoToNext_final: boolean | undefined = undefined;
      let nextStage: HandakuonStage = stage;

      switch (stage) {
        case 'gyouInput':
          if (pressCode === hGyouKeyCode) {
            nextStage = 'handakuonInput';
            inputCount.current = 0;
            isExpected = true;
            shouldGoToNext_final = undefined;
          } else {
            isExpected = false;
            shouldGoToNext_final = undefined;
          }
          break;
        case 'handakuonInput':
          if (pressCode === dakuonKeyCode) {
            if (inputCount.current === 0) {
              inputCount.current = 1;
              setIsBlinking(true);
              if (blinkTimeoutRef.current !== null) clearTimeout(blinkTimeoutRef.current);
              blinkTimeoutRef.current = window.setTimeout(() => {
                setIsBlinking(false);
                blinkTimeoutRef.current = null;
              }, 500);
              isExpected = true;
              shouldGoToNext_final = undefined;
            } else if (inputCount.current === 1) {
              inputCount.current = 0;
              setIsBlinking(false);
              if (blinkTimeoutRef.current !== null) {
                clearTimeout(blinkTimeoutRef.current);
                blinkTimeoutRef.current = null;
              }
              nextStage = 'danInput';
              isExpected = true;
              shouldGoToNext_final = undefined;
            }
          } else {
              isExpected = false;
              shouldGoToNext_final = undefined;
          }
          break;
        case 'danInput':
          const expectedDanKeyCodes = Object.entries(hid2Dan)
              .filter(([_, name]) => name === currentDan)
              .map(([codeStr, _]) => parseInt(codeStr));
          nextStage = 'gyouInput'; // Reset stage for the next character/target
          resetBlinkingState();    // Also reset blinking state

          if (expectedDanKeyCodes.includes(pressCode)) {
            isExpected = true;
            if (isRandomMode) {
                selectNextRandomTarget();
                shouldGoToNext_final = false;
            } else {
                const charsInCurrentGyou = handakuonGyouChars['は行'];
                if (dIdx >= charsInCurrentGyou.length - 1) {
                    shouldGoToNext_final = true;
                } else {
                    shouldGoToNext_final = false;
                }
            }
          } else {
              isExpected = false;
              shouldGoToNext_final = undefined;
          }
          break;
      }

      if (nextStage !== stage) {
          setStage(nextStage);
      } else if (!isExpected && stage !== 'gyouInput') {
          setStage('gyouInput');
          resetBlinkingState(); // Ensure blinking is reset on error if not already gyouInput
      }

      return { isExpected, shouldGoToNext: shouldGoToNext_final };
    }, [
        isActive, stage, currentDan, hGyouKeyCode, dakuonKeyCode, hid2Dan, resetBlinkingState,
        isRandomMode, selectNextRandomTarget, setStage, dIdx, setIsBlinking // hid2Gyou is implicitly used by hGyouKeyCode
    ]);

  const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
      const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
      if (!isActive || !currentDan) {
          return noHighlight;
      }

      const indicesJustChanged = !isRandomMode && dIdx !== prevDIdxRef.current;
      const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

      let expectedKeyName: string | null = null;
      let targetLayoutIndex: number | null = null;

      switch (currentStageForHighlight) {
        case 'gyouInput':
          expectedKeyName = 'は行';
          targetLayoutIndex = 2;
          break;
        case 'handakuonInput':
          expectedKeyName = '濁音';
          targetLayoutIndex = 2;
          break;
        case 'danInput':
          expectedKeyName = currentDan;
          targetLayoutIndex = 3;
          break;
      }

      if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
          if (currentStageForHighlight === 'handakuonInput' && isBlinking) {
            return noHighlight;
          }
          return { className: 'bg-blue-100', overrideKey: null };
      }
      return noHighlight;
    }, [isActive, currentDan, stage, isBlinking, isRandomMode, dIdx]);

  const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
      if (!isActive) return false;
      const targetKeyIndex = pressCode - 1;

      let expectedLayoutIndex: number | null = null;
      switch (stage) {
          case 'gyouInput':
          case 'handakuonInput':
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
}
