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
  // console.log(`[PracticeHeading] Rendering. practice=${practice}, gIdx=${gIdx}, dIdx=${dIdx}, isRandomMode=${isRandomMode}, headingChars=`, headingChars);
  // console.log(`[PracticeHeading] typedEndIndex: ${typedEndIndex}`);

  // isGairaigo をコンポーネントのスコープで定義
  const isGairaigo = practice === '外来語の発音補助';

  const displayChars = useMemo(() => {
    if (isFinished) {
      return ['終了！']; // 終了時は「終了！」を表示
    }
    if (practice === '短文入力３分間トレーニング') {
      // 短文練習の場合、headingChars は ['短文全体']
      return headingChars.length > 0 ? headingChars[0].split('') : [];
    }
    if (practice === '拗音の基本練習') {
      // headingChars は ["きゃ", "きゅ", "きょ"] のような配列
      return headingChars.flatMap(char => char.split('')); // ["き", "ゃ", "き", "ゅ", "き", "ょ"] のように分解
    }
    return headingChars;
  }, [practice, headingChars, isFinished]);

  const getHighlightClass = (index: number): string => {
    if (status === 'countdown') {
      return '';
    }
    if (isFinished) {
      return ''; // 終了時はハイライトしない
    }

    if (practice === '短文入力３分間トレーニング') {
      // typedEndIndex が undefined や null の場合はデフォルトのスタイルを返す
      if (typedEndIndex === undefined || typedEndIndex === null) return ''; // 変更なし

      // --- 拗音判定用のヘルパー定数 ---
      const baseYouonChars = ['き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'ぢ', 'び', 'ぴ'];
      const smallYouonChars = ['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'];

      // --- 現在のターゲットが拗音かどうかを判定 ---
      const isTargetYouon =
        index === typedEndIndex && // 現在のインデックスがターゲットであり、
        index + 1 < displayChars.length && // 次の文字が存在し、
        baseYouonChars.includes(displayChars[index]) && // 現在の文字が拗音の基底文字で、
        smallYouonChars.includes(displayChars[index + 1]); // 次の文字が小文字である

      // --- 現在のインデックスが、拗音ターゲットの2文字目かどうかを判定 ---
      const isSecondCharOfTargetYouon =
        index === typedEndIndex + 1 && // 現在のインデックスがターゲットの次であり、
        typedEndIndex >= 0 && // typedEndIndex が有効で、
        baseYouonChars.includes(displayChars[typedEndIndex]) && // 前の文字(ターゲット1文字目)が拗音の基底文字で、
        smallYouonChars.includes(displayChars[index]); // 現在の文字が小文字である

      // --- ハイライトクラスの決定 ---
      if (index < typedEndIndex) {
        return 'text-gray-400'; // 入力済み
      // ターゲット文字(1文字目または拗音の1文字目) または 拗音ターゲットの2文字目ならハイライト
      } else if (index === typedEndIndex || isSecondCharOfTargetYouon) {
        return 'text-blue-500'; // 文字色を青に変更
      }
      // それ以外（未入力）
      return '';
    } // <-- 短文入力ブロックの閉じ括弧

    if (practice === '拗音の基本練習') {
      const targetBaseIndex = dIdx * 2; // ターゲットの最初の文字のインデックス
      //console.log(`[PracticeHeading Youon] index: ${index}, dIdx: ${dIdx}, targetBaseIndex: ${targetBaseIndex}`);
      if (index === targetBaseIndex || index === targetBaseIndex + 1) {
        //console.log(`[PracticeHeading Youon] Highlighting index: ${index}`);
        return 'text-blue-500'; // ターゲットの2文字を文字色でハイライト
      }
      return ''; // それ以外はハイライトしない
    }

    const challengeModeSet = new Set<PracticeMode>([
      'かな入力１分間トレーニング',
      '記号入力１分間トレーニング',
      '短文入力３分間トレーニング',
    ]);
    const isChallengeMode = challengeModeSet.has(practice);
    if (!isChallengeMode && isRandomMode && index === 0) { // <-- if 文のブロックを開始
      return 'text-blue-500'; // 文字色でハイライト
    } // <-- if 文のブロックを閉じる

    // 通常モードのハイライトロジック
    let currentIndex = -1;
 
    // 外来語モードで、かつ currentTargetCharForHighlight が指定されている場合
    if (isGairaigo && currentTargetCharForHighlight) {
      console.log(`[PracticeHeading Gairaigo Highlight] index: ${index}, char: ${displayChars[index]}, target: ${currentTargetCharForHighlight}`);
      if (displayChars[index] === currentTargetCharForHighlight) {
        console.log(`[PracticeHeading Gairaigo Highlight] Match char: ${displayChars[index]}`);
        return 'text-blue-500';
      }
      // currentTargetCharForHighlight がある場合は、以下の dIdx ベースのロジックは実行しない
      console.log(`[PracticeHeading Gairaigo Highlight] No match for index: ${index}`);
      return '';
    }
    const isIaGroup = isGairaigo && gIdx === 0;
    const isUaGroup = isGairaigo && gIdx === 1;
    const isTargetKu = isGairaigo && gIdx === 2; // 「くぁ」グループ
    const isTargetTsu = isGairaigo && gIdx === 4; // 「つぁ」グループ
    const isTargetTeGroup = headingChars.length === 5 && headingChars[0] === 'てぁ'; // map スコープの外に移動
    const isToGroup = headingChars.length === 5 && headingChars[0] === 'とぁ';
    const isFuGroup = headingChars.length === 5 && headingChars[0] === 'ふぁ';
    const isVaGroup = headingChars.length === 5 && headingChars[0] === 'ヴァ';
    const isTargetFu = isGairaigo && isFuGroup && dIdx === 2;
    const isTargetVa = isGairaigo && isVaGroup && dIdx === 2;

    if (practice === '拗音拡張') {
        // 拗音拡張の場合、dIdx に対応する文字をハイライトする
        currentIndex = dIdx; 
    } else if (isGairaigo) {
        // 外来語モードのハイライトロジック
        if (isIaGroup) {
          // 「いぁ いぃ いぅ いぇ いぉ」のグループ
          // dIdx 0 -> "いぁ" (index 0)
          // dIdx 1 -> "いぃ" (index 1)
          // dIdx 2 -> "いぅ" (index 2)
          // dIdx 3 -> "いぇ" (index 3)
          // dIdx 4 -> "いぉ" (index 4)
          // ただし、練習対象は「いぇ」のみなので、dIdx が 3 以外の時はハイライトしない、
          // または、dIdx に応じた文字をハイライトするが、練習フック側で dIdx が 3 に固定される想定。
          // 現状のApp.tsxの動作ではdIdxが進むため、dIdxをそのままcurrentIndexとして使用する。
          currentIndex = dIdx;          //console.log(`[PracticeHeading IaGroup] dIdx: ${dIdx}, currentIndex: ${currentIndex}`);
        } else if (isUaGroup) {
          // dIdx 0 (うぁ) -> index 1 (うぃ) をハイライト
          // dIdx 1 (うぃ) -> index 1
          // dIdx 2 (うぅ) -> index 3 (うぇ) をハイライト
          // dIdx 3 (うぇ) -> index 3
          // dIdx 4 (うぉ) -> index 4
          if (dIdx === 0 || dIdx === 1) { // Practice starts or target is うぃ
            currentIndex = 1; // Highlight うぃ (index 1)
          } else if (dIdx === 2 || dIdx === 3) { // Practice skipped うぅ or target is うぇ
            currentIndex = 3; // Highlight うぇ (index 3)
          } else if (dIdx === 4) { // Target is うぉ
            currentIndex = 4; // Highlight うぉ (index 4)
          }
          // If dIdx is somehow out of bounds, currentIndex remains -1
          //console.log(`[PracticeHeading UaGroup] dIdx: ${dIdx}, currentIndex: ${currentIndex}`);
        } else if (isTargetKu) { // 「くぁ」グループ
          // dIdx 0 -> index 0 (くぁ)
            // dIdx 1 -> index 1 (くぃ)
            // dIdx 2 -> index 2 (くぅ) - ハイライトしない
            // dIdx 3 -> index 3 (くぇ)
            // dIdx 4 -> index 4 (くぉ)
            if (dIdx === 2) currentIndex = -1; // くぅはハイライトしない
            else currentIndex = dIdx;
            //console.log(`[PracticeHeading KuGroup] dIdx: ${dIdx}, currentIndex: ${currentIndex}`);
        } else if (isTargetTsu) { // 「つぁ」グループ
            // dIdx 0 -> index 0 (つぁ)
            // dIdx 1 -> index 1 (つぃ)
            // dIdx 2 -> index 2 (つぅ) - ハイライトしない
            // dIdx 3 -> index 3 (つぇ)
            // dIdx 4 -> index 4 (つぉ)
            if (dIdx === 2) currentIndex = -1; // つぅはハイライトしない
            else currentIndex = dIdx;
            //console.log(`[PracticeHeading TsuGroup] dIdx: ${dIdx}, currentIndex: ${currentIndex}`);
        } else if (isTargetTeGroup) { // 「てぁ」グループ
            // dIdx 0, 1, 2, 3, 4 -> index 1 (てぃ)
            currentIndex = 1;
            //console.log(`[PracticeHeading TeGroup] dIdx: ${dIdx}, currentIndex: ${currentIndex}`);
        } else if (isToGroup) {
            // dIdx 0, 1, 2, 3, 4 -> index 2 (とぅ)
            currentIndex = 2;
            //console.log(`[PracticeHeading ToGroup] dIdx: ${dIdx}, currentIndex: ${currentIndex}`);
        } else if (isFuGroup) {
            // dIdx 0 -> index 0 (ふぁ)
            // dIdx 1 -> index 1 (ふぃ)
            // dIdx 2 -> index 2 (ふぅ) - ハイライトしない
            // dIdx 3 -> index 3 (ふぇ)
            // dIdx 4 -> index 4 (ふぉ)
            if (dIdx === 2) {
                currentIndex = -1; // ふぅはハイライトしない
            } else {
              // If dIdx is 2, don't highlight anything
              if (dIdx === 2) currentIndex = -1;
              else currentIndex = dIdx;
            }
            //console.log(`[PracticeHeading FuGroup] dIdx: ${dIdx}, currentIndex: ${currentIndex}`);
        } else if (isVaGroup) {
            // 「ヴ」(index 2) はハイライトしないので、dIdx をそのまま使う
            currentIndex = dIdx;
            //console.log(`[PracticeHeading VaGroup] dIdx: ${dIdx}, currentIndex: ${currentIndex}`);
          } else {
            currentIndex = dIdx;
        }
      } else {
        currentIndex = dIdx;
    }

    // 通常のハイライト条件を先に評価
    let determinedHighlightClass = '';
    if (index === currentIndex && !isRandomMode) {
        // 外来語モードで「くぅ」「つぅ」「ふぅ」「ヴ」がターゲットの場合、
        // currentIndex は -1 または次の文字を指していることがあるため、
        // ここでは index 2 の文字はハイライトしないようにする
        if (!(isGairaigo && ((isTargetKu || isTargetTsu || isTargetFu || isTargetVa) && index === 2))) {
          determinedHighlightClass = 'text-blue-500'; // 通常ハイライト (文字色)
        }
    }

    // 外来語モードでの特別ハイライト条件
    if (isGairaigo) {
        const isTargetKu = gIdx === 2 && dIdx === 2; // 「くぅ」がターゲット
        const isTargetTsu = gIdx === 4 && dIdx === 2; // 「つぅ」がターゲット
        const isTargetTe = isTargetTeGroup; // 「てぁ」グループは常に「てぃ」がターゲット扱い (ハイライト用)
        const shouldHighlightNextKu = isTargetKu && index === 3; // 「くぇ」をハイライト
        const shouldHighlightNextTsu = isTargetTsu && index === 3; // 「つぇ」をハイライト
        const shouldHighlightNextFu = isTargetFu && index === 3;

        // 「くぇ」「つぇ」「ふぇ」をハイライトする条件
        if (shouldHighlightNextKu || shouldHighlightNextTsu || shouldHighlightNextFu) {
          determinedHighlightClass = 'text-blue-500'; // 上書き (文字色)
        }
        // 「てぃ」をハイライトする条件
        if (isTargetTe && index === 1) {
          determinedHighlightClass = 'text-blue-500'; // 上書き (文字色)
        }
        // 「とぅ」をハイライトする条件
        if (isToGroup && index === 2) {
          determinedHighlightClass = 'text-blue-500'; // 上書き (文字色)
        }
    }
    //console.log(`[PracticeHeading getHighlightClass] index: ${index}, currentIndex: ${currentIndex}, determinedHighlightClass: "${determinedHighlightClass}"`);

    return determinedHighlightClass;
  };

    const isTanbunChallenge = practice === '短文入力３分間トレーニング';

  return (
      <div className={`mb-4 flex items-center text-4xl ${
        isFinished ? 'font-bold justify-center space-x-1' // 終了時
        : (isTanbunChallenge ? 'font-semibold justify-start' // 短文チャレンジ中は space-x なし
          : (practice === '拗音の基本練習' ? 'font-bold justify-center' // 拗音の基本練習中は space-x なし
            : 'font-bold justify-center space-x-1') // それ以外の練習
          )
      }`}>
      {displayChars.map((char, index) => {

        const isYouonPractice = practice === '拗音の基本練習';
        const isTanbunChallenge = practice === '短文入力３分間トレーニング';

        const isFirstCharOfYouonPair = isYouonPractice && index % 2 === 0;
        const isSecondCharOfYouonPair = isYouonPractice && index % 2 !== 0;

        let paddingClass = 'px-1'; // デフォルトのパディングクラス

        if (isTanbunChallenge) {
          if (index === 0) {
            paddingClass = 'pl-1'; // 短文の最初の文字は左パディングのみ
          } else if (index === displayChars.length - 1) {
            paddingClass = 'pr-1'; // 短文の最後の文字は右パディングのみ
          } else {
            paddingClass = 'px-0'; // 短文の中間の文字は水平パディングなし
          }
        } else if (isFirstCharOfYouonPair) {
          paddingClass = 'pl-1'; // 拗音の1文字目は左パディングのみ
        } else if (isSecondCharOfYouonPair) {
          paddingClass = 'pr-1'; // 拗音の2文字目は右パディングのみ
        }

        return (
          <span
            key={index}
            className={`${paddingClass} py-1 rounded transition-colors duration-150 ${
              // 外来語モードで currentTargetCharForHighlight を使用したハイライト
              getHighlightClass(index) // ハイライトクラスの取得を getHighlightClass に一本化
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
