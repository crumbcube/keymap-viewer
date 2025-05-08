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
      const entry = Object.entries(gyouMap).find(([_, name]) => name === '濁音');
      return entry ? parseInt(entry[0]) : null;
  }, [side, kb]);

  const [randomTarget, setRandomTarget] = useState<CharInfoDakuon | null>(null);
  const prevGIdxRef = useRef(gIdx);
  const prevDIdxRef = useRef(dIdx);
  const isInitialMount = useRef(true);
  const prevIsActiveRef = useRef(isActive); // isActive の前回の値を保持
  const prevIsRandomModeRef = useRef(isRandomMode);

  const selectNextRandomTarget = useCallback(() => {
      if (allDakuonCharInfos.length > 0) {
          const randomIndex = Math.floor(Math.random() * allDakuonCharInfos.length);
          setRandomTarget(allDakuonCharInfos[randomIndex]);
          setStage('gyouInput'); // ステージもリセット
      } else {
          setRandomTarget(null);
      }
  }, [setRandomTarget, setStage]);

  // reset 関数
  const reset = useCallback(() => {
    setStage('gyouInput');
    setRandomTarget(null);
    prevGIdxRef.current = -1;
    prevDIdxRef.current = -1;
    isInitialMount.current = true;
    prevIsRandomModeRef.current = false;
  }, [setStage, setRandomTarget]);

  useEffect(() => {
      // isActive が false になった最初のタイミングでリセット
      if (!isActive && prevIsActiveRef.current) {
          // console.log(`[Dakuon useEffect] Resetting state because isActive became false.`);
          reset(); // reset 関数内で必要なリセット処理を行う
      }

      if (isActive) {
          // isActive が true になった最初のタイミング、または依存関係の変更時
          if (isActive && !prevIsActiveRef.current) {
              isInitialMount.current = true; // 強制的に初期マウント扱い
          }

          const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
          const randomModeChangedToTrue = isRandomMode && !prevIsRandomModeRef.current;
          const randomModeChangedToFalse = !isRandomMode && prevIsRandomModeRef.current;

          // --- リセット条件 ---
          if (randomModeChangedToFalse || (!isRandomMode && (isInitialMount.current || indicesChanged))) {
              // console.log(`[Dakuon useEffect] Normal mode. isInitialMount=${isInitialMount.current}, indicesChanged=${indicesChanged}`);
              setStage('gyouInput'); // 通常モードやインデックス変更時はステージをリセット
              setRandomTarget(null); // ランダムターゲットはクリア
              prevGIdxRef.current = gIdx;
              prevDIdxRef.current = dIdx;
              isInitialMount.current = false;
          }
          // --- ランダムターゲット選択条件 (初回のみ or リセット後) ---
          // isInitialMount.current の条件を追加して、アクティブになった直後もターゲット選択
          else if (isRandomMode && (randomModeChangedToTrue || isInitialMount.current || !randomTarget)) {
               // console.log(`[Dakuon useEffect] Random mode. randomModeChangedToTrue=${randomModeChangedToTrue}, isInitialMount=${isInitialMount.current}, !randomTarget=${!randomTarget}`);
               selectNextRandomTarget();
               isInitialMount.current = false;
               // ランダムモードでは gIdx/dIdx は直接使わないが、記録はしておく
               prevGIdxRef.current = gIdx; 
               prevDIdxRef.current = dIdx;
          }
      }

      // 最後に前回の値を更新
      prevIsActiveRef.current = isActive;
      prevIsRandomModeRef.current = isRandomMode;

  }, [isActive, isRandomMode, gIdx, dIdx, randomTarget, reset, selectNextRandomTarget]);

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

  // handleInput
  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {

      if (!isActive || !expectedGyouKey || !expectedDanKey || dakuonKeyCode === null) {
          return { isExpected: false, shouldGoToNext: false };
      }
      if (input.type !== 'release') {
          return { isExpected: false, shouldGoToNext: false };
      }

      const pressCode = input.pressCode;
      let isExpected = false;
      let shouldGoToNext = false;

      switch (stage) {
        case 'gyouInput':
          const expectedGyouKeyCodes = Object.entries(hid2Gyou)
              .filter(([_, name]) => name === expectedGyouKey)
              .map(([codeStr, _]) => parseInt(codeStr));
          if (expectedGyouKeyCodes.includes(pressCode)) {
              setStage('dakuonInput');
              isExpected = true;
          } else {
              isExpected = false;
          }
          break;
        case 'dakuonInput':
          if (pressCode === dakuonKeyCode) {
            setStage('danInput');
            isExpected = true;
          } else {
              isExpected = false;
          }
          break;
        case 'danInput':
          const expectedDanKeyCodes = Object.entries(hid2Dan)
              .filter(([_, name]) => name === expectedDanKey)
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
      }

      return { isExpected, shouldGoToNext };
    }, [
        isActive, stage, expectedGyouKey, expectedDanKey,
        hid2Gyou, hid2Dan, dakuonKeyCode, isRandomMode, selectNextRandomTarget, setStage
    ]);

  const getHighlightClassName = useCallback((key: string, layoutIndex: number): PracticeHighlightResult => {
      const noHighlight: PracticeHighlightResult = { className: null, overrideKey: null };
      if (!isActive || !expectedGyouKey || !expectedDanKey) {
          return noHighlight;
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
          return { className: 'bg-blue-100', overrideKey: null };
      }
      return noHighlight;
    }, [isActive, stage, expectedGyouKey, expectedDanKey, gIdx, dIdx, isRandomMode]);

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
   };
}
