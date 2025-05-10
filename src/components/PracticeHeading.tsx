// /home/coffee/my-keymap-viewer/src/components/PracticeHeading.tsx
import React, { useMemo } from 'react';
import { PracticeMode, PracticeStatus } from '../hooks/usePracticeCommons'; // PracticeMode, PracticeStatus をインポート

interface PracticeHeadingProps {
  practice: PracticeMode;
  headingChars: string[];
  gIdx: number;
  dIdx: number;
  isRandomMode?: boolean;
  isFinished?: boolean;
  typedEndIndex?: number;
  status?: PracticeStatus;
  currentTargetCharForHighlight?: string | null; // 外来語練習用のハイライト対象文字
}

// --- 外来語練習モード用ハイライトインデックス決定ヘルパー関数 ---
const getGairaigoHighlightIndex = (
  gIdx: number,
  dIdx: number,
  headingChars: string[]
): number => {
  let currentIndex = -1;
  const isIaGroup = gIdx === 0;
  const isUaGroup = gIdx === 1;
  const isTargetKuGroup = gIdx === 2; // 「くぁ」グループ
  const isTargetTsuGroup = gIdx === 4; // 「つぁ」グループ
  const isTargetTeGroup = headingChars.length === 5 && headingChars[0] === 'てぁ';
  const isToGroup = headingChars.length === 5 && headingChars[0] === 'とぁ';
  const isFuGroup = headingChars.length === 5 && headingChars[0] === 'ふぁ';
  const isVaGroup = headingChars.length === 5 && headingChars[0] === 'ヴァ';

  if (isIaGroup) {
    currentIndex = dIdx;
  } else if (isUaGroup) {
    if (dIdx === 0 || dIdx === 1) currentIndex = 1;
    else if (dIdx === 2 || dIdx === 3) currentIndex = 3;
    else if (dIdx === 4) currentIndex = 4;
  } else if (isTargetKuGroup) {
    if (dIdx === 2) currentIndex = -1; // くぅはハイライトしない
    else currentIndex = dIdx;
  } else if (isTargetTsuGroup) {
    if (dIdx === 2) currentIndex = -1; // つぅはハイライトしない
    else currentIndex = dIdx;
  } else if (isTargetTeGroup) {
    currentIndex = 1; // てぃ をハイライト
  } else if (isToGroup) {
    currentIndex = 2; // とぅ をハイライト
  } else if (isFuGroup) {
    if (dIdx === 2) currentIndex = -1; // ふぅはハイライトしない
    else currentIndex = dIdx;
  } else if (isVaGroup) {
    // 「ヴ」(index 2) はハイライトしないので、dIdx をそのまま使う
    // ただし、headingChars の "ヴ" は index 2 にある想定
    if (dIdx === 2 && headingChars[dIdx] === 'ヴ') currentIndex = -1;
    else currentIndex = dIdx;
  } else {
    currentIndex = dIdx;
  }
  return currentIndex;
};

// --- 外来語練習モード用 特別ハイライト条件ヘルパー関数 ---
const shouldApplySpecialGairaigoHighlight = (
  gIdx: number,
  dIdx: number,
  index: number,
  headingChars: string[]
): boolean => {
  const isTargetKuGroup = gIdx === 2;
  const isTargetTsuGroup = gIdx === 4;
  const isTargetFuGroup = headingChars.length === 5 && headingChars[0] === 'ふぁ';
  const isTargetTeGroup = headingChars.length === 5 && headingChars[0] === 'てぁ';
  const isToGroup = headingChars.length === 5 && headingChars[0] === 'とぁ';

  const isTargetKuNext = isTargetKuGroup && dIdx === 2 && index === 3; // 「くぅ」の次「くぇ」
  const isTargetTsuNext = isTargetTsuGroup && dIdx === 2 && index === 3; // 「つぅ」の次「つぇ」
  const isTargetFuNext = isTargetFuGroup && dIdx === 2 && index === 3; // 「ふぅ」の次「ふぇ」
  const isTargetTeTi = isTargetTeGroup && index === 1; // 「てぃ」
  const isTargetToTu = isToGroup && index === 2; // 「とぅ」

  return isTargetKuNext || isTargetTsuNext || isTargetFuNext || isTargetTeTi || isTargetToTu;
};


const PracticeHeading: React.FC<PracticeHeadingProps> = ({
  practice,
  headingChars,
  gIdx,
  dIdx,
  isRandomMode = false,
  isFinished = false, // デフォルトは false
  typedEndIndex = 0, // デフォルトは 0
  status = 'idle', // デフォルトは idle
  currentTargetCharForHighlight, // propsから受け取る
}) => {
  const isGairaigo = practice === '外来語の発音補助';

  const displayChars = useMemo(() => {
    if (isFinished) {
      return ['終了！'];
    }
    if (practice === '短文入力３分間トレーニング') {
      return headingChars.length > 0 ? headingChars[0].split('') : [];
    }
    if (practice === '拗音の基本練習') {
      return headingChars.flatMap(char => char.split(''));
    }
    return headingChars;
  }, [practice, headingChars, isFinished]);

  const getHighlightClass = (index: number): string => {
    if (status === 'countdown' || isFinished) {
      return '';
    }

    if (practice === '短文入力３分間トレーニング') {
      if (typedEndIndex === undefined || typedEndIndex === null) return '';
      const baseYouonChars = ['き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'ぢ', 'び', 'ぴ'];
      const smallYouonChars = ['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'];
      const isSecondCharOfTargetYouon =
        index === typedEndIndex + 1 &&
        typedEndIndex >= 0 &&
        baseYouonChars.includes(displayChars[typedEndIndex]) &&
        smallYouonChars.includes(displayChars[index]);
      if (index < typedEndIndex) return 'text-gray-400';
      if (index === typedEndIndex || isSecondCharOfTargetYouon) return 'text-blue-500';
      return '';
    }

    if (practice === '拗音の基本練習') {
      const targetBaseIndex = dIdx * 2;
      if (index === targetBaseIndex || index === targetBaseIndex + 1) {
        return 'text-blue-500';
      }
      return '';
    }

    const challengeModeSet = new Set<PracticeMode>([
      'かな入力１分間トレーニング',
      '記号入力１分間トレーニング',
      '短文入力３分間トレーニング',
    ]);
    const isChallengeMode = challengeModeSet.has(practice);
    if (!isChallengeMode && isRandomMode && index === 0) {
      return 'text-blue-500';
    }

    // 通常モードのハイライトロジック
    let currentIndex = -1;

    if (isGairaigo && currentTargetCharForHighlight) {
      if (displayChars[index] === currentTargetCharForHighlight) {
        return 'text-blue-500';
      }
      return '';
    }

    if (practice === '拗音拡張') {
      currentIndex = dIdx;
    } else if (isGairaigo) {
      currentIndex = getGairaigoHighlightIndex(gIdx, dIdx, headingChars);
    } else {
      currentIndex = dIdx;
    }

    let determinedHighlightClass = '';
    if (index === currentIndex && !isRandomMode) {
      // 外来語モードで特定の文字（例：「くぅ」など）をハイライトしないための条件
      const isGairaigoNoHighlightChar = isGairaigo &&
        ( (gIdx === 2 && index === 2) || // くぁグループの「くぅ」
          (gIdx === 4 && index === 2) || // つぁグループの「つぅ」
          (headingChars.length === 5 && headingChars[0] === 'ふぁ' && index === 2) || // ふぁグループの「ふぅ」
          (headingChars.length === 5 && headingChars[0] === 'ヴァ' && index === 2 && headingChars[index] === 'ヴ') // ヴァグループの「ヴ」
        );

      if (!isGairaigoNoHighlightChar) {
        determinedHighlightClass = 'text-blue-500';
      }
    }

    if (isGairaigo && shouldApplySpecialGairaigoHighlight(gIdx, dIdx, index, headingChars)) {
      determinedHighlightClass = 'text-blue-500';
    }

    return determinedHighlightClass;
  };

  const isTanbunChallenge = practice === '短文入力３分間トレーニング';

  return (
      <div className={`mb-4 flex items-center text-4xl ${
        isFinished ? 'font-bold justify-center space-x-1'
        : (isTanbunChallenge ? 'font-semibold justify-start'
          : (practice === '拗音の基本練習' ? 'font-bold justify-center'
            : 'font-bold justify-center space-x-1')
          )
      }`}>
      {displayChars.map((char, index) => {
        const isYouonPractice = practice === '拗音の基本練習';
        let paddingClass = 'px-1';

        if (isTanbunChallenge) {
          if (index === 0) paddingClass = 'pl-1';
          else if (index === displayChars.length - 1) paddingClass = 'pr-1';
          else paddingClass = 'px-0';
        } else if (isYouonPractice) {
          if (index % 2 === 0) paddingClass = 'pl-1'; // 拗音の1文字目
          else paddingClass = 'pr-1'; // 拗音の2文字目
        }

        return (
          <span
            key={index}
            className={`${paddingClass} py-1 rounded transition-colors duration-150 ${
              getHighlightClass(index)
            }`}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

export default PracticeHeading;
