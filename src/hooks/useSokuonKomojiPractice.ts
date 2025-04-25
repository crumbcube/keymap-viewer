// src/hooks/useSokuonKomojiPractice.ts
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
import { sokuonKomojiData } from '../data/keymapData';

type SokuonKomojiStage = 'gyouInput' | 'sokuonInput' | 'danInput' | 'tsuInput';

const komojiChars = ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'];

export default function useSokuonKomojiPractice({
  isActive,
  gIdx,
  dIdx,
  okVisible,
  side,
  kb
}: PracticeHookProps): PracticeHookResult {
  const [stage, setStage] = useState<SokuonKomojiStage>('gyouInput');
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
  const sokuonKeyCode = useMemo(() => {
      if (kb === 'tw-20v') {
          // TW-20V の促音コード (仮 - 正確な値に要修正)
          // usePracticeCommons.ts の仮マッピングに合わせる
          return side === 'left' ? 0x02 : 0x01; // Left: 0x02, Right: 0x01
      } else { // TW-20H
          // TW-20H の促音コードは Left: 0x02, Right: 0x02
          return 0x02;
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

  const currentSet = useMemo(() => {
    if (!isActive || gIdx < 0 || gIdx >= sokuonKomojiData.length) return null;
    return sokuonKomojiData[gIdx];
  }, [isActive, gIdx]);

  const currentChar = useMemo(() => currentSet?.chars[dIdx], [currentSet, dIdx]);
  const currentInputInfo = useMemo(() => currentSet?.inputs[dIdx], [currentSet, dIdx]);
  const isTsu = useMemo(() => currentChar === 'っ', [currentChar]);

  const isKomoji = useMemo(() => {
    return typeof currentChar === 'string' && komojiChars.includes(currentChar);
  }, [currentChar]);

  const headingChars = useMemo(() => {
    if (!isActive || !currentSet) return [];
    return currentSet.chars;
  }, [isActive, currentSet]);

  const getInitialStage = useCallback((checkIsTsu: boolean): SokuonKomojiStage => {
      return checkIsTsu ? 'tsuInput' : 'gyouInput';
  }, []);

  useEffect(() => {
      if (isActive) {
          const indicesChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
          if (isInitialMount.current || indicesChanged) {
              const initialStage = getInitialStage(isTsu);
              setStage(initialStage);
              prevGIdxRef.current = gIdx;
              prevDIdxRef.current = dIdx;
              isInitialMount.current = false;
          }
      } else {
          prevGIdxRef.current = -1;
          prevDIdxRef.current = -1;
          isInitialMount.current = true;
      }
  }, [isActive, gIdx, dIdx, isTsu, getInitialStage]);

  const handleInput = useCallback(
    (input: PracticeInputInfo): PracticeInputResult => {
      // デバッグログ追加
      console.log("SokuonKomoji Input:", input, "Stage:", stage, "Char:", currentChar, "InputInfo:", currentInputInfo);
      console.log("Expected Sokuon Code:", sokuonKeyCode);
      console.log("Expected Dakuon Code:", dakuonKeyCode);

      if (!isActive || okVisible || !currentSet || (!isTsu && !currentInputInfo)) {
          console.log("SokuonKomoji Input Ignored: Inactive, OK visible, or data invalid");
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

      if (isTsu) {
        console.log("Stage: tsuInput, Input Code:", pressCode, "Expected Code:", sokuonKeyCode);
        if (stage === 'tsuInput' && pressCode === sokuonKeyCode) {
          isExpected = true;
          shouldGoToNext = true;
          console.log("Correct tsu input, should go next");
        } else {
            console.log("Incorrect tsu input");
            isExpected = false; // MODIFIED: 明示的に false を設定
        }
      } else if (currentInputInfo) { // 小文字の場合
        const expectedGyouKey = currentInputInfo.gyouKey;
        const expectedDan = currentInputInfo.dan;

        switch (stage) {
          case 'gyouInput':
            const expectedGyouKeyCodes = Object.entries(hid2Gyou)
              .filter(([_, name]) => name === expectedGyouKey)
              .map(([codeStr, _]) => parseInt(codeStr));
            console.log("Stage: gyouInput, Input Gyou:", inputGyou, "Expected Gyou:", expectedGyouKey, "Input Code:", pressCode, "Expected Codes:", expectedGyouKeyCodes);
            // MODIFIED: inputGyou のチェックは不要 (pressCode の一致で十分)
            if (expectedGyouKeyCodes.includes(pressCode)) {
              setStage('sokuonInput'); // 小文字なので次は濁音キー入力へ
              isExpected = true;
              console.log("Transition to sokuonInput stage (for komoji)");
            } else {
                console.log("Incorrect gyou input");
                isExpected = false; // MODIFIED: 明示的に false を設定
            }
            break;
          case 'sokuonInput': // 小文字入力のための濁音キー入力ステージ
            console.log("Stage: sokuonInput, Input Code:", pressCode, "Expected Code (dakuonKeyCode):", dakuonKeyCode);
            if (pressCode === dakuonKeyCode) {
              setStage('danInput');
              isExpected = true;
              console.log("Transition to danInput stage (for komoji)");
            } else {
                console.log("Incorrect dakuon key input for komoji");
                isExpected = false; // MODIFIED: 明示的に false を設定
            }
            break;
          case 'danInput':
             // 期待するキーコードを取得 (hid2Dan の逆引き)
            const expectedDanKeyCodes = Object.entries(hid2Dan)
                .filter(([_, name]) => name === expectedDan)
                .map(([codeStr, _]) => parseInt(codeStr));
            console.log("Stage: danInput, Input Dan:", inputDan, "Expected Dan:", expectedDan, "Input Code:", pressCode, "Expected Codes:", expectedDanKeyCodes);
            // 押されたキーコードが期待される段キーコードのいずれかと一致するか
            if (expectedDanKeyCodes.includes(pressCode)) {
              isExpected = true;
              shouldGoToNext = true;
              console.log("Correct dan input for komoji, should go next");
            } else {
                console.log("Incorrect dan input for komoji");
                isExpected = false; // MODIFIED: 明示的に false を設定
            }
            break;
          case 'tsuInput':
            // isTsu=false の場合はここに来ないはず
            console.error("Invalid state: stage is tsuInput but isTsu is false");
            isExpected = false;
            break;
        }
      } else {
          // currentInputInfo がない場合 (データエラーなど)
          console.error("Invalid state: currentInputInfo is null when not isTsu");
          isExpected = false;
      }

      // MODIFIED: 不正解だった場合のステージリセットロジックを修正
      if (!isExpected) {
          if (isTsu) {
              // 促音入力で不正解の場合、ステージはリセットしない (単打なので)
              console.log("Incorrect input in tsuInput, stage remains tsuInput");
          } else { // 小文字入力の場合
              if (stage === 'sokuonInput') {
                  console.log("Incorrect input in sokuonInput, resetting to gyouInput stage");
                  setStage('gyouInput');
              } else if (stage === 'danInput') {
                  console.log("Incorrect input in danInput, stage remains danInput");
                  // danInput で不正解の場合、ステージはリセットしない
              } else { // stage === 'gyouInput'
                  console.log("Incorrect input in gyouInput, stage remains gyouInput");
                  // gyouInput で不正解の場合もステージはリセットしない
              }
          }
          isExpected = false; // 念のため false を設定
      }

      console.log("SokuonKomoji Result:", { isExpected, shouldGoToNext });
      return { isExpected, shouldGoToNext };
    },
    [isActive, okVisible, stage, currentSet, currentInputInfo, isTsu, isKomoji, hid2Gyou, hid2Dan, sokuonKeyCode, dakuonKeyCode, getInitialStage, currentChar]
  );

  const getHighlightClassName = (key: string, layoutIndex: number): string | null => {
      const indicesJustChanged = gIdx !== prevGIdxRef.current || dIdx !== prevDIdxRef.current;
      const isProblemSwitch = indicesJustChanged && !okVisible;

      if (!isActive || okVisible || !currentSet || (!isTsu && !currentInputInfo)) {
          return null;
      }

      const currentStageForHighlight = isProblemSwitch ? getInitialStage(isTsu) : stage;

      let expectedKeyName: string | null = null;
      let targetLayoutIndex: number | null = null;

      if (isTsu) {
        if (currentStageForHighlight === 'tsuInput') {
            expectedKeyName = '促音';
            targetLayoutIndex = 2; // スタートレイヤー
        }
      } else if (currentInputInfo) { // 小文字の場合
        const expectedGyouKey = currentInputInfo.gyouKey;
        const expectedDan = currentInputInfo.dan;

        switch (currentStageForHighlight) {
            case 'gyouInput':
                expectedKeyName = expectedGyouKey;
                targetLayoutIndex = 2; // スタートレイヤー
                break;
            case 'sokuonInput': // 小文字入力のための濁音キー
                expectedKeyName = '濁音';
                targetLayoutIndex = 2; // スタートレイヤー
                break;
            case 'danInput':
                expectedKeyName = expectedDan;
                targetLayoutIndex = 3; // エンドレイヤー
                break;
            case 'tsuInput': // isTsu=false の場合はここに来ない
                 break;
        }
      }

      if (expectedKeyName !== null && layoutIndex === targetLayoutIndex && key === expectedKeyName) {
          return 'bg-blue-100';
      }
      return null;
    };

  const reset = useCallback(() => {
    const initialStage = getInitialStage(isTsu);
    setStage(initialStage);
    prevGIdxRef.current = -1;
    prevDIdxRef.current = -1;
    isInitialMount.current = true;
  }, [isTsu, getInitialStage]);

  // MODIFIED: isInvalidInputTarget をステージに応じて修正
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
          case 'sokuonInput': // 小文字入力のための濁音キーもスタートレイヤー
          case 'tsuInput':    // 促音キーもスタートレイヤー
              expectedLayoutIndex = 2; // スタートレイヤー
              break;
          case 'danInput':
              expectedLayoutIndex = 3; // エンドレイヤー
              break;
      }

      // 期待されるレイヤーの、押されたキーコードに対応するキーであるか？
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
