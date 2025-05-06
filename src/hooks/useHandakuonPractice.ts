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


      if (isActive) {
          const indicesChanged = dIdx !== prevDIdxRef.current;
          const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
          const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

          // --- リセット条件 ---
          if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
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

  // handleInput
  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {

      if (!isActive || !currentDan || hGyouKeyCode === null || dakuonKeyCode === null) {
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
          if (pressCode === hGyouKeyCode) {
            setStage('handakuonInput');
            inputCount.current = 0; // カウントリセット
            isExpected = true;
          } else {
            isExpected = false;
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
            } else if (inputCount.current === 1 && !isBlinking) {
              inputCount.current = 0;
              setStage('danInput');
              isExpected = true;
            } else if (inputCount.current === 1 && isBlinking) {
                isExpected = true;
            }
          } else {
              isExpected = false;
          }
          break;
        case 'danInput':
          const expectedDanKeyCodes = Object.entries(hid2Dan)
              .filter(([_, name]) => name === currentDan)
              .map(([codeStr, _]) => parseInt(codeStr));
          if (expectedDanKeyCodes.includes(pressCode)) {
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
          break;
      }

      if (!isExpected && stage !== 'gyouInput') {
          setStage('gyouInput');
          resetBlinkingState();
      }

      return { isExpected, shouldGoToNext };
    }, [
        isActive, stage, currentGyouKey, currentDan, isBlinking,
        hid2Gyou, hid2Dan, hGyouKeyCode, dakuonKeyCode, resetBlinkingState,
        isRandomMode, selectNextRandomTarget, setStage
    ]);

  const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
      const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
      if (!isActive || !currentDan) {
          return noHighlight;
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
              return noHighlight;
          }
          return { className: 'bg-blue-100', overrideKey: null };
      }
      return noHighlight;
    }, [isActive, currentDan, stage, isBlinking, isRandomMode, dIdx]);

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
  };
}
