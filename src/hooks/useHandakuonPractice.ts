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
  // prevIsActiveRef は既に存在するので、それを利用します
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

  const prevIsActiveRef = useRef(isActive); // Track previous isActive state

  // isActive の変化と、それに伴う初期化やランダムターゲット選択を管理する useEffect
  useEffect(() => {
    // isActive が false になった最初のタイミングでリセット
    if (!isActive && prevIsActiveRef.current) {
        // console.log(`[Handakuon useEffect] Resetting state because isActive became false.`);
        reset(); // reset 関数内で必要なリセット処理を行う
    }

    if (isActive) {
        // isActive が true になった最初のタイミング、または依存関係の変更時
        if (isActive && !prevIsActiveRef.current) {
            isInitialMount.current = true; // 強制的に初期マウント扱い
            // console.log(`[HandakuonPractice] Transitioned to active. isRandomMode: ${isRandomMode}, dIdx: ${dIdx}`);
            setStage('gyouInput');
            resetBlinkingState(); // This also resets inputCount.current
        }

        const indicesChanged = dIdx !== prevDIdxRef.current; // gIdx は常に 0
        const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
        const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

        if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
            setStage('gyouInput');
            resetBlinkingState();
            setRandomTarget(null); // 通常モードではランダムターゲットをクリア
            prevDIdxRef.current = dIdx;
            isInitialMount.current = false;
        } else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
            selectNextRandomTarget();
            isInitialMount.current = false;
            prevDIdxRef.current = dIdx; // dIdx も記録
        }
    }
    prevIsActiveRef.current = isActive; // Update previous active state
    prevIsRandomModeRef.current = isRandomMode; // isRandomMode の前回値も更新
  }, [isActive, isRandomMode, dIdx, reset, selectNextRandomTarget, resetBlinkingState, randomTarget, setStage]);

  // Effect for random mode toggling *while active*
  const prevIsRandomModeActiveRef = useRef(isRandomMode); // Renamed to avoid conflict
  useEffect(() => {
    if (isActive) {
      if (isRandomMode !== prevIsRandomModeActiveRef.current) {
        //console.log(`[HandakuonPractice] Random mode changed to ${isRandomMode} while active. Resetting stage and selecting target if random.`);
        setStage('gyouInput');
        resetBlinkingState();
        if (isRandomMode) {
          selectNextRandomTarget();
        } else {
          setRandomTarget(null); // Clear random target if switching to normal mode
        }
        // prevIsRandomModeActiveRef.current = isRandomMode; // 上の useEffect で更新されるので不要
      }
    }
  }, [isActive, isRandomMode, selectNextRandomTarget, resetBlinkingState]);

  // Effect for dIdx changes in normal mode *while active*
  const prevDIdxActiveRef = useRef(dIdx); // Renamed to avoid conflict
  useEffect(() => {
    if (isActive && !isRandomMode) {
      if (dIdx !== prevDIdxActiveRef.current) {
        //console.log(`[HandakuonPractice] dIdx changed to ${dIdx} in normal mode while active. Resetting stage.`);
        setStage('gyouInput');
        resetBlinkingState();
        prevDIdxActiveRef.current = dIdx;
      }
    }
  }, [isActive, isRandomMode, dIdx, resetBlinkingState]);

  // Cleanup for blinkTimeoutRef
  useEffect(() => {
      return () => {
          if (blinkTimeoutRef.current !== null) {
              clearTimeout(blinkTimeoutRef.current);
          }
      };
  }, []);


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

      //console.log(`[HandakuonPractice handleInput] Received input: 0x${input.pressCode.toString(16)}, Current stage: ${stage}, Expected dakuonKeyCode: ${dakuonKeyCode === null ? 'null' : `0x${dakuonKeyCode.toString(16)}`}, Expected hGyouKeyCode: ${hGyouKeyCode === null ? 'null' : `0x${hGyouKeyCode.toString(16)}`}`);
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
            if (inputCount.current === 0) { // First Dakuon press
              inputCount.current = 1;
              setIsBlinking(true);
              if (blinkTimeoutRef.current !== null) clearTimeout(blinkTimeoutRef.current);
              blinkTimeoutRef.current = window.setTimeout(() => {
                setIsBlinking(false);
                blinkTimeoutRef.current = null;
              }, 500);
              isExpected = true;
            } else if (inputCount.current === 1) { // Second Dakuon press
              inputCount.current = 0;
              setIsBlinking(false); // Stop blinking
              if (blinkTimeoutRef.current !== null) { // Clear any pending blink timer
                clearTimeout(blinkTimeoutRef.current);
                blinkTimeoutRef.current = null;
              }
              setStage('danInput');
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

      // console.log(`[Handakuon getHighlightClassName] Current stage: ${stage}, dIdx: ${dIdx}, prevDIdxRef: ${prevDIdxRef.current}, isBlinking: ${isBlinking}`);

      let expectedKeyName: string | null = null;
      let targetLayoutIndex: number | null = null;

      switch (stage) { // Use stage directly
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
          if (stage === 'handakuonInput' && isBlinking) { // Use stage directly
            return noHighlight;
          }
          return { className: 'bg-blue-100', overrideKey: null };
      }
      return noHighlight;
    }, [isActive, currentDan, stage, isBlinking, isRandomMode, dIdx, prevDIdxRef]);

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
