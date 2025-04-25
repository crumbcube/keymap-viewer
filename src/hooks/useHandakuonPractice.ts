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

  // side と kb に応じたキーコードを取得
  const hGyouKeyCode = useMemo(() => {
      // MODIFIED: hid2Gyou は既に side と kb に応じて選択されているため、直接使用する
      // const gyouMap = side === 'left' ? hid2Gyou.left : hid2Gyou.right; // <- 削除
      const entry = Object.entries(hid2Gyou).find(([_, name]) => name === 'は行');
      return entry ? parseInt(entry[0]) : null; // 見つからない場合は null
  // MODIFIED: 依存配列から side を削除
  }, [hid2Gyou]);

  const dakuonKeyCode = useMemo(() => {
      if (kb === 'tw-20v') {
          return side === 'left' ? 0x04 : 0x03; // TW-20V 仮
      } else { // TW-20H
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

      if (!isActive || okVisible || !currentDan || hGyouKeyCode === null) { // hGyouKeyCode のチェック追加
          console.log("Handakuon Input Ignored: Inactive, OK visible, keys invalid, or hGyouKeyCode not found");
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
          // MODIFIED: inputGyou のチェックは不要 (pressCode の一致で十分)
          if (pressCode === hGyouKeyCode) {
            setStage('handakuonInput');
            inputCount.current = 0;
            isExpected = true;
            console.log("Transition to handakuonInput stage");
          } else {
            console.log("Incorrect gyou input");
            isExpected = false;
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
              isExpected = true; // 1回目の濁音キーは期待通り
              console.log("First dakuon key press, start blinking");
            } else if (inputCount.current === 1 && !isBlinking) { // 点滅が終わった後の2打目
              inputCount.current = 0; // カウントリセット
              setStage('danInput');
              isExpected = true; // 2回目の濁音キーも期待通り
              console.log("Second dakuon key press after blink, transition to danInput");
            } else if (inputCount.current === 1 && isBlinking) { // 点滅中の2打目
                console.log("Second dakuon key press during blink, ignored");
                isExpected = true; // 点滅中の入力も期待通りとして扱う（無視されるだけ）
            }
          } else {
              console.log("Incorrect dakuon key input");
              isExpected = false;
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
              isExpected = false;
          }
          break;
      }

      // 不正解だった場合のステージリセットロジック
      if (!isExpected) {
          if (stage === 'handakuonInput') {
              // handakuonInput 中の不正解 (dakuonKeyCode 以外が押された場合)
              console.log("Incorrect input during handakuonInput, resetting to gyouInput stage");
              setStage('gyouInput');
              resetBlinkingState(); // 点滅状態もリセット
          } else if (stage === 'danInput') {
              console.log("Incorrect input in danInput, stage remains danInput");
              // danInput で不正解の場合、ステージはリセットしない
          } else { // stage === 'gyouInput'
              console.log("Incorrect input in gyouInput, stage remains gyouInput");
              // gyouInput で不正解の場合もステージはリセットしない
          }
          isExpected = false; // 念のため false を設定
      }

      console.log("Handakuon Result:", { isExpected, shouldGoToNext });
      return { isExpected, shouldGoToNext };
    },
    [isActive, okVisible, stage, currentGyouKey, currentDan, isBlinking, hid2Gyou, hid2Dan, hGyouKeyCode, dakuonKeyCode, resetBlinkingState]
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
          targetLayoutIndex = 2; // スタートレイヤー
          break;
        case 'handakuonInput':
          expectedKeyName = '濁音';
          targetLayoutIndex = 2; // スタートレイヤー
          break;
        case 'danInput':
          expectedKeyName = currentDan;
          targetLayoutIndex = 3; // エンドレイヤー
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

  // isInvalidInputTarget をステージに応じて修正
  const isInvalidInputTarget = useCallback((keyCode: number, layoutIndex: number, keyIndex: number): boolean => {
      if (!isActive) return false;
      // TW-20H/V の最大キーコード (0x14 or 0x10) に応じて調整
      const maxStartLayoutKeyCode = kb === 'tw-20v' ? 0x10 : 0x14; // TW-20V は 16キー (0x10) と仮定
      const isStartLayoutInput = keyCode <= maxStartLayoutKeyCode;
      // HIDコードは1始まりと仮定してキーインデックスを計算
      const pressCode = isStartLayoutInput ? keyCode : keyCode - maxStartLayoutKeyCode;
      const targetKeyIndex = pressCode - 1; // 0-origin index

      let expectedLayoutIndex: number | null = null;
      switch (stage) {
          case 'gyouInput':
          case 'handakuonInput': // 半濁音(濁音)キーもスタートレイヤーにあるため
              expectedLayoutIndex = 2; // スタートレイヤー
              break;
          case 'danInput':
              expectedLayoutIndex = 3; // エンドレイヤー
              break;
      }

      // 期待されるレイヤーの、押されたキーコードに対応するキーであるか？
      const isTarget = layoutIndex === expectedLayoutIndex && keyIndex === targetKeyIndex;
      return isTarget;
  }, [isActive, stage, kb]);

  return {
    headingChars,
    handleInput,
    getHighlightClassName,
    reset,
    isInvalidInputTarget,
  };
}
