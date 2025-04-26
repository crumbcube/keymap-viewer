// src/hooks/useHandakuonPractice.ts
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
} from './usePracticeCommons';
import { handakuonGyouList, handakuonGyouChars, handakuonDanMapping } from '../data/keymapData';

type HandakuonStage = 'gyouInput' | 'handakuonInput' | 'danInput';

export default function useHandakuonPractice({
  isActive,
  gIdx, // 半濁音は gIdx を使わないが、props としては受け取る
  dIdx,
  okVisible,
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

  // は行キーのコードを取得
  const hGyouKeyCode = useMemo(() => {
      const entry = Object.entries(hid2Gyou).find(([_, name]) => name === 'は行');
      return entry ? parseInt(entry[0]) : null;
  }, [hid2Gyou]);

  // 濁音キーのコードを取得 (半濁音入力に使用)
  const dakuonKeyCode = useMemo(() => {
      const gyouMap = kb === 'tw-20v'
          ? (side === 'left' ? hid2GyouVLeft_Kana : hid2GyouVRight_Kana)
          : (side === 'left' ? hid2GyouHLeft_Kana : hid2GyouHRight_Kana);
      const entry = Object.entries(gyouMap).find(([_, name]) => name === '濁音');
      return entry ? parseInt(entry[0]) : null;
  }, [side, kb]);

  const [randomTarget, setRandomTarget] = useState<CharInfoHandakuon | null>(null);
  const prevGIdxRef = useRef(gIdx);
  const prevDIdxRef = useRef(dIdx);
  const isInitialMount = useRef(true);
  const prevIsRandomModeRef = useRef(isRandomMode);

  // 点滅関連の状態をリセットする内部関数
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
          console.log(">>> Selecting new random target (Handakuon):", allHandakuonCharInfos[randomIndex]);
          setRandomTarget(allHandakuonCharInfos[randomIndex]);
          setStage('gyouInput'); // ステージもリセット
          resetBlinkingState(); // 点滅状態もリセット
      } else {
          setRandomTarget(null);
      }
  }, [setRandomTarget, setStage, resetBlinkingState]);

  // reset 関数
  const reset = useCallback(() => {
    setStage('gyouInput');
    resetBlinkingState(); // 点滅状態をリセット
    setRandomTarget(null);
    prevGIdxRef.current = -1;
    prevDIdxRef.current = -1;
    isInitialMount.current = true;
    prevIsRandomModeRef.current = false;
  }, [resetBlinkingState, setStage, setRandomTarget]);

  useEffect(() => {

      console.log("Handakuon useEffect run. isActive:", isActive, "isRandomMode:", isRandomMode, "randomTarget:", randomTarget?.char);

      if (isActive) {
          const indicesChanged = dIdx !== prevDIdxRef.current;
          const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
          const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

          // --- リセット条件 ---
          if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
              console.log("Resetting Handakuon to normal mode or index changed");
              reset(); // reset 関数を呼び出す
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
          if (blinkTimeoutRef.current !== null) {
              clearTimeout(blinkTimeoutRef.current);
          }
      };
  }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]);

  // 通常モード用 (変更なし)
  const currentGyouKey = useMemo(() => handakuonGyouList[0], []);
  const currentDan = useMemo(() => {
      if (isRandomMode) return randomTarget?.danKey ?? null;
      if (!isActive) return null;
      const danList = handakuonDanMapping['は行']; // 'は行' は固定
      if (!danList || dIdx < 0 || dIdx >= danList.length) return null; // danList チェック
      return danList[dIdx];
  }, [isActive, isRandomMode, randomTarget, dIdx]);

  // ヘッダー文字
  const headingChars = useMemo(() => {
    if (!isActive) return [];
    const charsForGyou = handakuonGyouChars['は行'];
    if (!charsForGyou || charsForGyou.length === 0) return []; // charsForGyou チェック

    if (isRandomMode) {
        return randomTarget ? [randomTarget.char] : [];
    } else {
        return charsForGyou;
    }
  }, [isActive, isRandomMode, randomTarget]);

  const currentOkVisible = okVisible;

  // handleInput
  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {
      console.log("Handakuon Input:", input, "Stage:", stage, "Gyou:", currentGyouKey, "Dan:", currentDan, "RandomMode:", isRandomMode, "PropOK:", okVisible);
      console.log("Expected H-Gyou Key Code:", hGyouKeyCode);
      console.log("Expected Dakuon Key Code:", dakuonKeyCode);

      if (!isActive || okVisible || !currentDan || hGyouKeyCode === null || dakuonKeyCode === null) {
          console.log("Handakuon Input Ignored: Inactive, Prop OK visible, keys invalid, or key codes not found");
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
          if (pressCode === hGyouKeyCode) {
            setStage('handakuonInput');
            inputCount.current = 0; // カウントリセット
            isExpected = true;
            console.log("Transition to handakuonInput stage");
          } else {
            console.log("Incorrect gyou input");
            isExpected = false;
          }
          break;
        case 'handakuonInput':
          console.log("Stage: handakuonInput, Input Code:", pressCode, "Expected Code:", dakuonKeyCode, "Input Count:", inputCount.current, "Is Blinking:", isBlinking);
          if (pressCode === dakuonKeyCode) {
            if (inputCount.current === 0) {
              inputCount.current = 1;
              setIsBlinking(true);
              if (blinkTimeoutRef.current !== null) clearTimeout(blinkTimeoutRef.current);
              blinkTimeoutRef.current = window.setTimeout(() => {
                setIsBlinking(false);
                blinkTimeoutRef.current = null;
                console.log("Blinking finished");
              }, 500);
              isExpected = true;
              console.log("First dakuon key press, start blinking");
            } else if (inputCount.current === 1 && !isBlinking) {
              inputCount.current = 0;
              setStage('danInput');
              isExpected = true;
              console.log("Second dakuon key press after blink, transition to danInput");
            } else if (inputCount.current === 1 && isBlinking) {
                console.log("Second dakuon key press during blink, ignored");
                isExpected = true;
            }
          } else {
              console.log("Incorrect dakuon key input");
              isExpected = false;
          }
          break;
        case 'danInput':
          const expectedDanKeyCodes = Object.entries(hid2Dan)
              .filter(([_, name]) => name === currentDan)
              .map(([codeStr, _]) => parseInt(codeStr));
          console.log("Stage: danInput, Input Dan:", inputDan, "Expected Dan:", currentDan, "Input Code:", pressCode, "Expected Codes:", expectedDanKeyCodes);
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
          resetBlinkingState();
      }

      console.log("Handakuon Result:", { isExpected, shouldGoToNext });
      return { isExpected, shouldGoToNext };
    }, [
        isActive, okVisible, stage, currentGyouKey, currentDan, isBlinking,
        hid2Gyou, hid2Dan, hGyouKeyCode, dakuonKeyCode, resetBlinkingState,
        isRandomMode, selectNextRandomTarget, setStage
    ]);

  // getHighlightClassName
  const getHighlightClassName = useCallback((key: string, layoutIndex: number): string | null => {
      if (!isActive || okVisible || !currentDan) {
          return null;
      }

      // 問題切り替え直後は強制的に 'gyouInput' として扱う (通常モードのみ)
      const indicesJustChanged = !isRandomMode && (dIdx !== prevDIdxRef.current);
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
              return null;
          }
          return 'bg-blue-100';
      }
      return null;
    }, [isActive, okVisible, currentDan, stage, isBlinking, isRandomMode, dIdx]);

  // isInvalidInputTarget
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
    isOkVisible: currentOkVisible,
  };
}
