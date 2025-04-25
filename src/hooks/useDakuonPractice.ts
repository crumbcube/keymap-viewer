// src/hooks/useDakuonPractice.ts
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
import { dakuonGyouList, dakuonGyouChars, dakuonDanMapping } from '../data/keymapData';

type DakuonStage = 'gyouInput' | 'dakuonInput' | 'danInput';

export default function useDakuonPractice({
  isActive,
  gIdx,
  dIdx,
  okVisible,
  side,
  kb
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

  // side と kb に応じたキーコードを取得 (TW-20V は仮)
  const dakuonKeyCode = useMemo(() => {
      if (kb === 'tw-20v') {
          // TW-20V の濁音コード (仮 - 正確な値に要修正)
          // MODIFIED: usePracticeCommons.ts の仮マッピングに合わせる
          return side === 'left' ? 0x04 : 0x03; // Left: 0x04, Right: 0x03
      } else { // TW-20H
          // TW-20H は Left/Right ともに 0x04
          return 0x04;
      }
  }, [kb, side]);

  const prevGIdxRef = useRef(gIdx);
  const prevDIdxRef = useRef(dIdx);
  const isInitialMount = useRef(true);

  useEffect(() => {
      if (isActive) {
          const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
          if (isInitialMount.current || indicesChanged) {
              setStage('gyouInput');
              prevGIdxRef.current = gIdx;
              prevDIdxRef.current = dIdx;
              isInitialMount.current = false;
          }
      } else {
          prevGIdxRef.current = -1;
          prevDIdxRef.current = -1;
          isInitialMount.current = true;
      }
  }, [isActive, gIdx, dIdx]);

  const currentGyouKey = useMemo(() => {
    if (!isActive || gIdx < 0 || gIdx >= dakuonGyouList.length) return null;
    return dakuonGyouList[gIdx];
  }, [isActive, gIdx]);

  const currentDan = useMemo(() => {
    if (!isActive || !currentGyouKey || !dakuonDanMapping[currentGyouKey]) return null;
    const danList = dakuonDanMapping[currentGyouKey];
    if (!danList || dIdx < 0 || dIdx >= danList.length) return null;
    return danList[dIdx];
  }, [isActive, currentGyouKey, dIdx]);

  const headingChars = useMemo(() => {
    if (!isActive || !currentGyouKey || !dakuonGyouChars[currentGyouKey]) return [];
    return dakuonGyouChars[currentGyouKey] || [];
  }, [isActive, currentGyouKey]);

  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {
      // デバッグログ追加
      console.log("Dakuon Input:", input, "Stage:", stage, "Gyou:", currentGyouKey, "Dan:", currentDan);
      console.log("Expected Dakuon Key Code:", dakuonKeyCode); // 期待される濁音キーコード

      if (!isActive || okVisible || !currentGyouKey || !currentDan) {
          console.log("Dakuon Input Ignored: Inactive, OK visible, or keys invalid");
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
          console.log("Stage: gyouInput, Input Gyou:", inputGyou, "Expected Gyou:", currentGyouKey);
          if (inputGyou === currentGyouKey) {
              setStage('dakuonInput');
              isExpected = true;
              console.log("Transition to dakuonInput stage");
          } else {
              console.log("Incorrect gyou input");
          }
          break;
        case 'dakuonInput':
          console.log("Stage: dakuonInput, Input Code:", pressCode, "Expected Code (dakuonKeyCode):", dakuonKeyCode);
          // 期待するキーコード (dakuonKeyCode) と比較
          if (pressCode === dakuonKeyCode) {
            setStage('danInput');
            isExpected = true;
            console.log("Transition to danInput stage");
          } else {
              console.log("Incorrect dakuon key input");
          }
          break;
        case 'danInput':
          console.log("Stage: danInput, Input Dan:", inputDan, "Expected Dan:", currentDan);
          if (inputDan === currentDan) {
            isExpected = true;
            shouldGoToNext = true;
            console.log("Correct dan input, should go next");
          } else {
              console.log("Incorrect dan input");
          }
          break;
      }

      // 不正解だった場合、最初のステージに戻す
      if (!isExpected && (stage === 'dakuonInput' || stage === 'danInput')) {
           console.log("Incorrect input, resetting to gyouInput stage");
           setStage('gyouInput');
           isExpected = false;
      } else if (!isExpected && stage === 'gyouInput') {
          // gyouInput での不正解は何もしない (stage はそのまま)
      }

      console.log("Dakuon Result:", { isExpected, shouldGoToNext });
      return { isExpected, shouldGoToNext };
    // MODIFIED: dakuonKeyCode を依存配列に追加
    // MODIFIED: kb, side は dakuonKeyCode の計算に使われているため不要
    }, [isActive, okVisible, stage, currentGyouKey, currentDan, hid2Gyou, hid2Dan, dakuonKeyCode]
  );

  const getHighlightClassName = (key: string, layoutIndex: number): string | null => {
      const indicesJustChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
      const isProblemSwitch = indicesJustChanged && !okVisible;

      if (!isActive || okVisible || !currentGyouKey || !currentDan) {
          return null;
      }

      // 問題切り替え直後は強制的に 'gyouInput' として扱う
      const currentStageForHighlight = isProblemSwitch ? 'gyouInput' : stage;

      let expectedKeyName: string | null = null;
      let targetLayoutIndex: number | null = null;

      switch (currentStageForHighlight) {
        case 'gyouInput':
          expectedKeyName = currentGyouKey;
          targetLayoutIndex = 2;
          break;
        case 'dakuonInput':
          expectedKeyName = '濁音';
          targetLayoutIndex = 2;
          break;
        case 'danInput':
          expectedKeyName = currentDan;
          targetLayoutIndex = 3;
          break;
      }

      if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
          return 'bg-blue-100';
      }
      return null;
    };

  const reset = useCallback(() => {
    setStage('gyouInput');
    prevGIdxRef.current = -1;
    prevDIdxRef.current = -1;
    isInitialMount.current = true;
  }, []);

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
