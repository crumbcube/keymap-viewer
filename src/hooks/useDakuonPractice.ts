// src/hooks/useDakuonPractice.ts
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
} from './usePracticeCommons';
import { dakuonDanMapping } from '../data/keymapData';

type DakuonStage = 'gyouInput' | 'dakuonInput' | 'danInput';

export default function useDakuonPractice({
  isActive,
  gIdx,
  dIdx,
  okVisible,
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
      const entry = Object.entries(gyouMap).find(([_, name]) => name === '濁音');
      return entry ? parseInt(entry[0]) : null;
  }, [side, kb]);

  const [randomTarget, setRandomTarget] = useState<CharInfoDakuon | null>(null);
  const prevGIdxRef = useRef(gIdx);
  const prevDIdxRef = useRef(dIdx);
  const isInitialMount = useRef(true);
  const prevIsRandomModeRef = useRef(isRandomMode);

  const selectNextRandomTarget = useCallback(() => {
      if (allDakuonCharInfos.length > 0) {
          const randomIndex = Math.floor(Math.random() * allDakuonCharInfos.length);
          console.log(">>> Selecting new random target (Dakuon):", allDakuonCharInfos[randomIndex]);
          setRandomTarget(allDakuonCharInfos[randomIndex]);
          setStage('gyouInput'); // ステージもリセット
      } else {
          setRandomTarget(null);
      }
  }, [setRandomTarget, setStage]);

  useEffect(() => {

      console.log("Dakuon useEffect run. isActive:", isActive, "isRandomMode:", isRandomMode, "randomTarget:", randomTarget?.char);

      if (isActive) {
          const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
          const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
          const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

          // --- リセット条件 ---
          if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
              console.log("Resetting Dakuon to normal mode or index changed");
              setStage('gyouInput');
              setRandomTarget(null);
              prevGIdxRef.current = gIdx;
              prevDIdxRef.current = dIdx;
              isInitialMount.current = false;
          }

          // --- ランダムターゲット選択条件 (初回のみ or リセット後) ---
          if (isRandomMode && !randomTarget && (randomModeChangedToTrue || isInitialMount.current)) {
               selectNextRandomTarget();
               isInitialMount.current = false;
               prevGIdxRef.current = gIdx;
               prevDIdxRef.current = dIdx;
          } else if (!isRandomMode && isInitialMount.current) {
               isInitialMount.current = false;
               prevGIdxRef.current = gIdx;
               prevDIdxRef.current = dIdx;
          }

          prevIsRandomModeRef.current = isRandomMode;

      } else {
          // 非アクティブになったら全てリセット
          setStage('gyouInput');
          setRandomTarget(null);
          prevGIdxRef.current = -1;
          prevDIdxRef.current = -1;
          isInitialMount.current = true;
          prevIsRandomModeRef.current = isRandomMode;
      }

  }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, selectNextRandomTarget]);

  // 通常モード用の現在行・段キー (変更なし)
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

  // ヘッダー文字 (変更なし)
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

  // 期待キー (変更なし)
  const expectedGyouKey = useMemo(() => (isRandomMode ? randomTarget?.gyouKey : currentGyouKey) ?? null, [isRandomMode, randomTarget, currentGyouKey]);
  const expectedDanKey = useMemo(() => (isRandomMode ? randomTarget?.danKey : currentDan) ?? null, [isRandomMode, randomTarget, currentDan]);
  const currentOkVisible = okVisible;

  // handleInput
  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {
      console.log("Dakuon Input:", input, "Stage:", stage, "Expected Gyou:", expectedGyouKey, "Expected Dan:", expectedDanKey, "RandomMode:", isRandomMode, "PropOK:", okVisible);
      console.log("Expected Dakuon Key Code:", dakuonKeyCode);

      if (!isActive || okVisible || !expectedGyouKey || !expectedDanKey || dakuonKeyCode === null) {
          console.log("Dakuon Input Ignored: Inactive, Prop OK visible, or keys/code invalid");
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

      switch (stage) {
        case 'gyouInput':
          const expectedGyouKeyCodes = Object.entries(hid2Gyou)
              .filter(([_, name]) => name === expectedGyouKey)
              .map(([codeStr, _]) => parseInt(codeStr));
          console.log("Stage: gyouInput, Input Gyou:", inputGyou, "Expected Gyou:", expectedGyouKey, "Input Code:", pressCode, "Expected Codes:", expectedGyouKeyCodes);
          if (expectedGyouKeyCodes.includes(pressCode)) {
              setStage('dakuonInput');
              isExpected = true;
              console.log("Transition to dakuonInput stage");
          } else {
              console.log("Incorrect gyou input");
              isExpected = false;
          }
          break;
        case 'dakuonInput':
          console.log("Stage: dakuonInput, Input Code:", pressCode, "Expected Code (dakuonKeyCode):", dakuonKeyCode);
          if (pressCode === dakuonKeyCode) {
            setStage('danInput');
            isExpected = true;
            console.log("Transition to danInput stage");
          } else {
              console.log("Incorrect dakuon key input");
              isExpected = false;
          }
          break;
        case 'danInput':
          const expectedDanKeyCodes = Object.entries(hid2Dan)
              .filter(([_, name]) => name === expectedDanKey)
              .map(([codeStr, _]) => parseInt(codeStr));
          console.log("Stage: danInput, Input Dan:", inputDan, "Expected Dan:", expectedDanKey, "Input Code:", pressCode, "Expected Codes:", expectedDanKeyCodes);
          if (expectedDanKeyCodes.includes(pressCode)) {
            isExpected = true;
            if (isRandomMode) {
                selectNextRandomTarget();
                shouldGoToNext = false;
            } else {
                shouldGoToNext = true;
            }
            console.log("Correct dan input");
          } else {
              console.log("Incorrect dan input");
              isExpected = false;
          }
          break;
      }

      if (!isExpected && stage !== 'gyouInput') {
          setStage('gyouInput');
      }

      console.log("Dakuon Result:", { isExpected, shouldGoToNext });
      return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, stage, expectedGyouKey, expectedDanKey,
        hid2Gyou, hid2Dan, dakuonKeyCode, isRandomMode, selectNextRandomTarget, setStage
    ]);

  // getHighlightClassName
  const getHighlightClassName = useCallback((key: string, layoutIndex: number): string | null => {
      if (!isActive || okVisible || !expectedGyouKey || !expectedDanKey) {
          return null;
      }

      // 問題切り替え直後は強制的に 'gyouInput' として扱う (通常モードのみ)
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
          return 'bg-blue-100';
      }
      return null;
    }, [isActive, okVisible, stage, expectedGyouKey, expectedDanKey, gIdx, dIdx, isRandomMode]);

  // reset
  const reset = useCallback(() => {
    console.log("Resetting Dakuon Practice Hook");
    setStage('gyouInput');
    setRandomTarget(null);
    prevGIdxRef.current = -1;
    prevDIdxRef.current = -1;
    isInitialMount.current = true;
    prevIsRandomModeRef.current = false;
  }, [setStage, setRandomTarget]);

  // isInvalidInputTarget
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
    isOkVisible: currentOkVisible,
  };
}
