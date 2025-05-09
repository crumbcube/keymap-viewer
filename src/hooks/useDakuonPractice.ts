// /home/coffee/my-keymap-viewer/src/hooks/useDakuonPractice.ts
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
  dakuonGyouList,
  dakuonGyouChars,
  CharInfoDakuon,
  allDakuonCharInfos,
  PracticeHighlightResult,
} from './usePracticeCommons';
import { dakuonDanMapping } from '../data/keymapData';

type DakuonStage = 'gyouInput' | 'dakuonInput' | 'danInput';

export default function useDakuonPractice({
  isActive,
  gIdx,
  dIdx,
  side,
  kb,
  isRandomMode
}: PracticeHookProps): PracticeHookResult {
  const [stage, setStage] = useState<DakuonStage>('gyouInput');
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

  // 濁音キーのコードを取得
  const dakuonKeyCode = useMemo(() => {
      const gyouMap = kb === 'tw-20v'
          ? (side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana)
          : (side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana);
      // 押下コードのみを対象とする (<= 0x14 or 0x10)
      const maxPressCode = kb === 'tw-20v' ? 0x10 : 0x14;
      const entry = Object.entries(gyouMap).find(([codeStr, name]) => name === '濁音' && parseInt(codeStr) <= maxPressCode);
      return entry ? parseInt(entry[0]) : null;
  }, [side, kb]);

  const [randomTarget, setRandomTarget] = useState<CharInfoDakuon | null>(null);
  const prevGIdxRef = useRef(gIdx);
  const prevDIdxRef = useRef(dIdx);
  const isInitialMount = useRef(true);
  const prevIsActiveRef = useRef(isActive);
  const prevIsRandomModeRef = useRef(isRandomMode);

  const selectNextRandomTarget = useCallback(() => {
      if (allDakuonCharInfos.length > 0) {
          const randomIndex = Math.floor(Math.random() * allDakuonCharInfos.length);
          setRandomTarget(allDakuonCharInfos[randomIndex]);
          setStage('gyouInput');
      } else {
          setRandomTarget(null);
      }
  }, [setRandomTarget, setStage]);

  const reset = useCallback(() => {
    setStage('gyouInput');
    setRandomTarget(null);
    prevGIdxRef.current = -1;
    prevDIdxRef.current = -1;
    isInitialMount.current = true;
    prevIsRandomModeRef.current = false;
  }, [setStage, setRandomTarget]);

  useEffect(() => {
      if (!isActive && prevIsActiveRef.current) {
          reset();
      }

      if (isActive) {
          if (isActive && !prevIsActiveRef.current) {
              isInitialMount.current = true;
          }

          const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
          const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
          const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

          if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
              setStage('gyouInput');
              setRandomTarget(null);
              prevGIdxRef.current = gIdx;
              prevDIdxRef.current = dIdx;
              isInitialMount.current = false;
          }
          else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
               selectNextRandomTarget();
               isInitialMount.current = false;
               prevGIdxRef.current = gIdx;
               prevDIdxRef.current = dIdx;
          }
      }
      prevIsActiveRef.current = isActive;
      prevIsRandomModeRef.current = isRandomMode;
  }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]);

  const currentGyouKey = useMemo(() => {
    if (!isActive || isRandomMode || gIdx < 0 || gIdx >= dakuonGyouList.length) return null;
    return dakuonGyouList[gIdx];
  }, [isActive, isRandomMode, gIdx]);

  const currentDan = useMemo(() => {
    if (!isActive || isRandomMode || !currentGyouKey || !dakuonDanMapping[currentGyouKey]) return null;
    const danList = dakuonDanMapping[currentGyouKey];
    if (!danList || dIdx < 0 || dIdx >= danList.length) return null;
    return danList[dIdx];
  }, [isActive, isRandomMode, currentGyouKey, dIdx]);

  const headingChars = useMemo(() => {
    if (!isActive) return [];
    if (isRandomMode) {
        return randomTarget ? [randomTarget.char] : [];
    } else {
        if (!currentGyouKey || !dakuonGyouChars[currentGyouKey]) return [];
        const charsForGyou = dakuonGyouChars[currentGyouKey];
        return charsForGyou || [];
    }
  }, [isActive, isRandomMode, randomTarget, currentGyouKey]);

  const expectedGyouKey = useMemo(() => (isRandomMode ? randomTarget?.gyouKey : currentGyouKey) ?? null, [isRandomMode, randomTarget, currentGyouKey]);
  const expectedDanKey = useMemo(() => (isRandomMode ? randomTarget?.danKey : currentDan) ?? null, [isRandomMode, randomTarget, currentDan]);

  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {
      if (!isActive || !expectedGyouKey || !expectedDanKey || dakuonKeyCode === null || input.type !== 'release') {
          return { isExpected: false, shouldGoToNext: undefined };
      }

      const pressCode = input.pressCode;
      let isExpected = false;
      let shouldGoToNext_final: boolean | undefined = undefined;
      let nextStage: DakuonStage = stage;

      switch (stage) {
        case 'gyouInput':
          const expectedGyouKeyCodes = Object.entries(hid2Gyou)
              .filter(([_, name]) => name === expectedGyouKey)
              .map(([codeStr, _]) => parseInt(codeStr));
          if (expectedGyouKeyCodes.includes(pressCode)) {
              nextStage = 'dakuonInput';
              isExpected = true;
              shouldGoToNext_final = undefined; // 文字入力はまだ完了していない
          } else {
              isExpected = false;
              shouldGoToNext_final = undefined; // 不正解、文字入力は完了していない
          }
          break;
        case 'dakuonInput':
          if (pressCode === dakuonKeyCode) {
            nextStage = 'danInput';
            isExpected = true;
            shouldGoToNext_final = undefined; // 文字入力はまだ完了していない
          } else {
              isExpected = false;
              nextStage = 'gyouInput'; // 不正解なら行入力からやり直し
              shouldGoToNext_final = undefined; // 不正解、文字入力は完了していない
          }
          break;
        case 'danInput':
          const expectedDanKeyCodes = Object.entries(hid2Dan)
              .filter(([_, name]) => name === expectedDanKey)
              .map(([codeStr, _]) => parseInt(codeStr));
          nextStage = 'gyouInput'; // 次の文字/ターゲットのためにステージをリセット (正誤に関わらず)
          if (expectedDanKeyCodes.includes(pressCode)) {
            isExpected = true;
            if (isRandomMode) {
                selectNextRandomTarget();
                shouldGoToNext_final = false; // App.tsx は gIdx/dIdx を進めない
            } else {
                // 通常モード: 現在の文字がその行の最後かどうかを判定
                const currentGyouKeyFromProps = dakuonGyouList[gIdx]; // props の gIdx を使用
                const charsInCurrentGyou = dakuonGyouChars[currentGyouKeyFromProps];
                if (charsInCurrentGyou && dIdx >= charsInCurrentGyou.length - 1) {
                    shouldGoToNext_final = true; // 行の最後の文字なら App.tsx は gIdx を進める
                } else {
                    shouldGoToNext_final = false; // 行の途中の文字なら App.tsx は dIdx を進める
                }
            }
          } else {
              isExpected = false;
              // shouldGoToNext_final は undefined のまま (不正解、文字入力は完了していない)
          }
          break;
      }

      if (nextStage !== stage) {
          setStage(nextStage);
      } else if (!isExpected && stage !== 'gyouInput') {
          // 不正解で、かつ現在のステージが最初の入力ステージでない場合、最初の入力ステージに戻す
          // (danInput で不正解の場合、上のロジックで既に gyouInput に戻しているので、この条件は dakuonInput での不正解時に効く)
          setStage('gyouInput');
      }
      // console.log(`[DakuonPractice handleInput] Returning: isExpected=${isExpected}, shouldGoToNext=${shouldGoToNext_final}, currentStage=${stage}`);
      return { isExpected, shouldGoToNext: shouldGoToNext_final };
    }, [
        isActive, stage, expectedGyouKey, expectedDanKey,
        hid2Gyou, hid2Dan, dakuonKeyCode, isRandomMode, selectNextRandomTarget, setStage,
        gIdx, dIdx
    ]);

  const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
      const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
      if (!isActive || !expectedGyouKey || !expectedDanKey) {
          return noHighlight;
      }

      const indicesJustChanged = !isRandomMode && (gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current);
      const currentStageForHighlight = indicesJustChanged ? 'gyouInput' : stage;

      let expectedKeyName: string | null = null;
      let targetLayoutIndex: number | null = null;

      switch (currentStageForHighlight) {
        case 'gyouInput':
          expectedKeyName = expectedGyouKey;
          targetLayoutIndex = 2;
          break;
        case 'dakuonInput':
          expectedKeyName = '濁音';
          targetLayoutIndex = 2;
          break;
        case 'danInput':
          expectedKeyName = expectedDanKey;
          targetLayoutIndex = 3;
          break;
      }

      if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
          return { className: 'bg-blue-100', overrideKey: null };
      }
      return noHighlight;
    }, [isActive, stage, expectedGyouKey, expectedDanKey, gIdx, dIdx, isRandomMode]);

  const isInvalidInputTarget = useCallback((pressCode: number, layoutIndex: number, keyIndex: number): boolean => {
      if (!isActive) return false;
      const targetKeyIndex = pressCode - 1;

      let expectedLayoutIndex: number | null = null;
      switch (stage) {
          case 'gyouInput':
          case 'dakuonInput':
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
