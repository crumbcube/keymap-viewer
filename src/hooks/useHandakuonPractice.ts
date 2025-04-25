// src/hooks/useHandakuonPractice.ts
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
import { handakuonGyouList, handakuonGyouChars, handakuonDanMapping } from '../data/keymapData';

type HandakuonStage = 'gyouInput' | 'handakuonInput' | 'danInput';

export default function useHandakuonPractice({
  isActive,
  gIdx,
  dIdx,
  okVisible,
  side,
  kb
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

  // side と kb に応じたキーコードを取得 (TW-20V は仮)
  const hGyouKeyCode = useMemo(() => {
      if (kb === 'tw-20v') {
          // TW-20V の「は行」コード (仮 - 正確な値に要修正)
          // usePracticeCommons.ts の仮マッピングに合わせる
          return side === 'left' ? 0x0B : 0x0B; // Left: 0x0B, Right: 0x0B と仮定
      } else { // TW-20H
          // TW-20H の「は行」コードは Left: 0x0E, Right: 0x0E
          return 0x0E;
      }
  }, [kb, side]);

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

  // 点滅関連の状態をリセットする内部関数
  const resetBlinkingState = useCallback(() => {
    setIsBlinking(false);
    inputCount.current = 0;
    if (blinkTimeoutRef.current !== null) {
      clearTimeout(blinkTimeoutRef.current);
      blinkTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
      if (isActive) {
          const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
          if (isInitialMount.current || indicesChanged) {
              setStage('gyouInput');
              resetBlinkingState(); // 点滅状態もリセット
              prevGIdxRef.current = gIdx;
              prevDIdxRef.current = dIdx;
              isInitialMount.current = false;
          }
      } else {
          resetBlinkingState(); // 点滅状態もリセット
          prevGIdxRef.current = -1;
          prevDIdxRef.current = -1;
          isInitialMount.current = true;
      }
      // クリーンアップ処理
      return () => {
          if (blinkTimeoutRef.current !== null) {
              clearTimeout(blinkTimeoutRef.current);
          }
      };
  }, [isActive, gIdx, dIdx, resetBlinkingState]);

  const currentGyouKey = useMemo(() => handakuonGyouList[0], []); // 常に 'は行'

  const currentDan = useMemo(() => {
    if (!isActive) return null;
    return handakuonDanMapping['は行']?.[dIdx] ?? null;
  }, [isActive, dIdx]);

  const headingChars = useMemo(() => {
    if (!isActive) return [];
    return handakuonGyouChars['は行'] || [];
  }, [isActive]);

  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {
      // デバッグログ追加
      console.log("Handakuon Input:", input, "Stage:", stage, "Gyou:", currentGyouKey, "Dan:", currentDan);
      console.log("Expected H-Gyou Key Code:", hGyouKeyCode);
      console.log("Expected Dakuon Key Code:", dakuonKeyCode);

      if (!isActive || okVisible || !currentDan) {
          console.log("Handakuon Input Ignored: Inactive, OK visible, or keys invalid");
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
          console.log("Stage: gyouInput, Input Gyou:", inputGyou, "Expected Gyou:", currentGyouKey, "Input Code:", pressCode, "Expected Code:", hGyouKeyCode);
          // 期待するキーコード (hGyouKeyCode) と比較
          if (inputGyou === currentGyouKey && pressCode === hGyouKeyCode) {
            setStage('handakuonInput');
            inputCount.current = 0;
            isExpected = true;
            console.log("Transition to handakuonInput stage");
          } else {
            console.log("Incorrect gyou input");
          }
          break;
        case 'handakuonInput':
          console.log("Stage: handakuonInput, Input Code:", pressCode, "Expected Code:", dakuonKeyCode, "Input Count:", inputCount.current, "Is Blinking:", isBlinking);
          // 期待するキーコード (dakuonKeyCode) と比較
          if (pressCode === dakuonKeyCode) {
            if (inputCount.current === 0) {
              inputCount.current = 1;
              setIsBlinking(true);
              if (blinkTimeoutRef.current !== null) clearTimeout(blinkTimeoutRef.current);
              blinkTimeoutRef.current = window.setTimeout(() => {
                setIsBlinking(false);
                blinkTimeoutRef.current = null;
                console.log("Blinking finished"); // 点滅終了ログ
              }, 500);
              isExpected = true;
              console.log("First dakuon key press, start blinking");
            } else if (inputCount.current === 1 && !isBlinking) { // 点滅が終わった後の2打目
              inputCount.current = 0; // カウントリセット
              setStage('danInput');
              isExpected = true;
              console.log("Second dakuon key press after blink, transition to danInput");
            } else if (inputCount.current === 1 && isBlinking) { // 点滅中の2打目 (無視またはエラー)
                console.log("Second dakuon key press during blink, ignored or error");
                // isExpected = false; // 不正解とする場合
                isExpected = true; // 期待通りとして次の入力を待つ場合 (現状維持)
            }
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

      // 不正解だった場合、最初のステージに戻し、点滅状態もリセット
      if (!isExpected && stage !== 'handakuonInput') { // handakuonInput中の不正解はリセットしない場合がある
           console.log("Incorrect input, resetting to gyouInput stage");
           setStage('gyouInput');
           resetBlinkingState(); // 点滅状態をリセット
           isExpected = false;
      } else if (!isExpected && stage === 'handakuonInput') {
          // handakuonInput 中の不正解 (dakuonKeyCode 以外が押された場合)
          console.log("Incorrect input during handakuonInput, resetting to gyouInput stage");
          setStage('gyouInput');
          resetBlinkingState();
          isExpected = false;
      }

      console.log("Handakuon Result:", { isExpected, shouldGoToNext });
      return { isExpected, shouldGoToNext };
    },
    [isActive, okVisible, stage, currentGyouKey, currentDan, isBlinking, hid2Gyou, hid2Dan, hGyouKeyCode, dakuonKeyCode, resetBlinkingState] // kb, side は不要
  );

  const getHighlightClassName = (key: string, layoutIndex: number): string | null => {
      const indicesJustChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
      const isProblemSwitch = indicesJustChanged && !okVisible;

      if (!isActive || okVisible || !currentDan) {
          return null;
      }

      // 問題切り替え直後は強制的に 'gyouInput' として扱う
      const currentStageForHighlight = isProblemSwitch ? 'gyouInput' : stage;

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
          // 点滅中はハイライトしない (handakuonInput ステージのみ)
          if (currentStageForHighlight === 'handakuonInput' && isBlinking) {
              return null;
          }
          return 'bg-blue-100';
      }
      return null;
    };

  const reset = useCallback(() => {
    setStage('gyouInput');
    resetBlinkingState(); // 点滅状態をリセット
    prevGIdxRef.current = -1;
    prevDIdxRef.current = -1;
    isInitialMount.current = true;
  }, [resetBlinkingState]);

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
