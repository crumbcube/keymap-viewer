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
          // usePracticeCommons.ts の仮マッピングに合わせる
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
          // 期待するキーコードを取得 (hid2Gyou の逆引き)
          const expectedGyouKeyCodes = Object.entries(hid2Gyou)
              .filter(([_, name]) => name === currentGyouKey)
              .map(([codeStr, _]) => parseInt(codeStr));
          console.log("Stage: gyouInput, Input Gyou:", inputGyou, "Expected Gyou:", currentGyouKey, "Input Code:", pressCode, "Expected Codes:", expectedGyouKeyCodes);
          // 押されたキーコードが期待される行キーコードのいずれかと一致するか
          if (expectedGyouKeyCodes.includes(pressCode)) {
              setStage('dakuonInput');
              isExpected = true;
              console.log("Transition to dakuonInput stage");
          } else {
              console.log("Incorrect gyou input");
              isExpected = false; // MODIFIED: 明示的に false を設定
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
              isExpected = false; // MODIFIED: 明示的に false を設定
          }
          break;
        case 'danInput':
          // 期待するキーコードを取得 (hid2Dan の逆引き)
          const expectedDanKeyCodes = Object.entries(hid2Dan)
              .filter(([_, name]) => name === currentDan)
              .map(([codeStr, _]) => parseInt(codeStr));
          console.log("Stage: danInput, Input Dan:", inputDan, "Expected Dan:", currentDan, "Input Code:", pressCode, "Expected Codes:", expectedDanKeyCodes);
          // 押されたキーコードが期待される段キーコードのいずれかと一致するか
          if (expectedDanKeyCodes.includes(pressCode)) {
            isExpected = true;
            shouldGoToNext = true;
            console.log("Correct dan input, should go next");
          } else {
              console.log("Incorrect dan input");
              isExpected = false; // MODIFIED: 明示的に false を設定
          }
          break;
      }

      // MODIFIED: 不正解だった場合のステージリセットロジックを修正
      if (!isExpected) {
          if (stage === 'dakuonInput') {
              console.log("Incorrect input in dakuonInput, resetting to gyouInput stage");
              setStage('gyouInput');
          } else if (stage === 'danInput') {
              console.log("Incorrect input in danInput, stage remains danInput");
              // danInput で不正解の場合、ステージはリセットしない
          } else { // stage === 'gyouInput'
              console.log("Incorrect input in gyouInput, stage remains gyouInput");
              // gyouInput で不正解の場合もステージはリセットしない
          }
          isExpected = false; // 念のため false を設定
      }

      console.log("Dakuon Result:", { isExpected, shouldGoToNext });
      return { isExpected, shouldGoToNext };
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
          targetLayoutIndex = 2; // スタートレイヤー
          break;
        case 'dakuonInput':
          expectedKeyName = '濁音';
          targetLayoutIndex = 2; // スタートレイヤー
          break;
        case 'danInput':
          expectedKeyName = currentDan;
          targetLayoutIndex = 3; // エンドレイヤー
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

  // MODIFIED: isInvalidInputTarget をステージに応じて修正
  const isInvalidInputTarget = useCallback((keyCode: number, layoutIndex: number, keyIndex: number): boolean => {
      if (!isActive) return false;
      // TW-20H/V の最大キーコード (0x14 or 0x28) に応じて調整が必要な場合がある
      // ここでは TW-20H の 0x14 (20) を基準とするが、TW-20V では異なる可能性がある
      const maxStartLayoutKeyCode = kb === 'tw-20v' ? 0x10 : 0x14; // TW-20V は 16キー (0x10) と仮定
      const isStartLayoutInput = keyCode <= maxStartLayoutKeyCode;
      const pressCode = isStartLayoutInput ? keyCode : keyCode - maxStartLayoutKeyCode;
      const targetKeyIndex = pressCode - 1; // HIDコードは1始まりと仮定

      let expectedLayoutIndex: number | null = null;
      switch (stage) {
          case 'gyouInput':
          case 'dakuonInput': // 濁音キーもスタートレイヤーにあるため
              expectedLayoutIndex = 2; // スタートレイヤー
              break;
          case 'danInput':
              expectedLayoutIndex = 3; // エンドレイヤー
              break;
      }

      const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
      return isTarget;
  // MODIFIED: stage と kb を依存配列に追加
  }, [isActive, stage, kb]);

  return {
    headingChars,
    handleInput,
    getHighlightClassName,
    reset,
    isInvalidInputTarget, // 修正された関数を返す
  };
}
