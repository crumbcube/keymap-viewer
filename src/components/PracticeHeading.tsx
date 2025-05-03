// /home/coffee/my-keymap-viewer/src/components/PracticeHeading.tsx
import React, { useMemo } from 'react';
import {
    PracticeMode,
    PracticeHookResult,
    TanbunProgressInfo 
} from '../hooks/usePracticeCommons';
import {
    youdakuonPracticeData,
    kigoPractice3Data,
    gairaigoPracticeData, // 外来語データをインポート
} from '../data/keymapData';

interface PracticeHeadingProps {
  activePractice: PracticeHookResult | null;
  isRandomMode: boolean; // isRandomMode はチャレンジモードでは true 扱いされる
  practice: PracticeMode;
  gIdx: number;
  dIdx: number;
  currentFunctionKeyMap: Record<number, string>;
  fixedWidthNum: number;
  okVisible: boolean;
}

const keyWidthRem = 5.5;
const gapRem = 0.5;

const PracticeHeading: React.FC<PracticeHeadingProps> = ({
  activePractice,
  isRandomMode,
  practice,
  gIdx,
  dIdx,
  currentFunctionKeyMap,
  fixedWidthNum,
}) => {
  const headingChars = activePractice?.headingChars ?? [];
  const okVisible = activePractice?.isOkVisible ?? false;

  const okLeftPosition = useMemo(() => {
    const bsKeyEntry = Object.entries(currentFunctionKeyMap).find(([_, name]) => name === 'BS');
    const bsKeyIndex = bsKeyEntry ? parseInt(bsKeyEntry[0]) : -1;

    let position = '50%'; // デフォルトは中央

    if (bsKeyIndex !== -1) {
      const offsetFromGridStart = bsKeyIndex * (keyWidthRem + gapRem) + keyWidthRem / 2;
      const offsetFromCenter = offsetFromGridStart - fixedWidthNum / 2;
      position = `calc(50% + ${offsetFromCenter}rem)`;
    }
    return position;
  }, [currentFunctionKeyMap, fixedWidthNum]);

  // 外来語練習用の現在のターゲット情報を取得 (存在すれば) - 通常モード用
  const currentGairaigoGroup = useMemo(() => {
      if (!isRandomMode && practice === '外来語の発音補助' && gIdx >= 0 && gIdx < gairaigoPracticeData.length) {
          return gairaigoPracticeData[gIdx];
      }
      return null;
  }, [practice, gIdx, isRandomMode]); // isRandomMode を依存配列に追加

  const currentGairaigoTarget = useMemo(() => {
      if (currentGairaigoGroup && dIdx >= 0 && dIdx < currentGairaigoGroup.targets.length) {
          return currentGairaigoGroup.targets[dIdx];
      }
      return null;
  }, [currentGairaigoGroup, dIdx]);

  const isChallengeCountdown = (practice === 'かな入力１分間トレーニング' || practice === '記号入力１分間トレーニング' || practice === '短文入力３分間トレーニング') && headingChars.length === 1 && headingChars[0].endsWith('秒');
  const isChallengeResult = !!activePractice?.challengeResults;

    const progressData = activePractice?.getProgressInfo?.();
    const tanbunProgress: TanbunProgressInfo | null =
        practice === '短文入力３分間トレーニング' ? progressData ?? null : null;

    const getNextCharLength = (sentence: string, index: number): number => {
        // (ここに拗音などを判定して 1 or 2 を返すロジックを実装 - 簡易版)
        const firstChar = sentence[index];
        const secondChar = sentence[index + 1];
        const smallYouonChars = ['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'];
        const isBaseForYouon = ['き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'ぢ', 'び', 'ぴ'].includes(firstChar);
        if (isBaseForYouon && secondChar && smallYouonChars.includes(secondChar)) {
            return 2;
        }
        return 1;
    };

  return (
    <div className="relative flex justify-start mb-6"> {/* justify-center を justify-start に変更 */}
      {/* 練習文字を表示する部分 */}
      <div className="flex"> {/* ここも justify-center を削除 (親要素で制御) */}
        {headingChars.map((char: string, index: number) => {
          let className = '';
          let style: React.CSSProperties = { padding: '0.25rem' };

          const sentenceChars = practice === '短文入力３分間トレーニング' ? char.split('') : [char];
          const isTanbunMode = practice === '短文入力３分間トレーニング';

          // チャレンジモードのカウントダウンは特別なスタイル
          if (isChallengeCountdown) {
              className = 'text-3xl font-bold'; // 少し大きめに
          } else {
              // 通常の練習文字表示
              className = 'text-2xl';
          }

          // --- 太字表示ロジック ---
          let isBoldTarget = false;
          if (!isChallengeCountdown && !isChallengeResult) {
              if (isRandomMode && (practice === '拗音拡張' || practice === '外来語の発音補助' /* || practice === 'かな入力１分間トレーニング' */)) { // チャレンジもランダム扱い
                  isBoldTarget = true;
              } else if (practice === '外来語の発音補助' && currentGairaigoGroup) {
                  isBoldTarget = currentGairaigoGroup.targets.some(target => target.headerIndex === index);
              } else if (practice !== '拗音拡張' && practice !== '外来語の発音補助') {
                  isBoldTarget = true;
              }
          }

          if (isBoldTarget) {
              className += ' font-bold';
          }

          // --- ハイライト処理 (ランダムモードでない場合) ---
          if (!isRandomMode && !isChallengeResult && practice !== 'かな入力１分間トレーニング' && practice !== '記号入力１分間トレーニング') {
              let shouldHighlight = false;
              if (practice === '拗濁音の練習') {
                  shouldHighlight = (gIdx >= 0 && gIdx < youdakuonPracticeData.length && youdakuonPracticeData[gIdx]?.chars && index === dIdx);
              } else if (practice === '拗半濁音の練習') {
                  shouldHighlight = (index === dIdx);
              } else if (practice === '記号の基本練習３') {
                  shouldHighlight = (gIdx >= 0 && gIdx < kigoPractice3Data.length && kigoPractice3Data[gIdx]?.chars && index === dIdx);
              } else if (practice === '拗音拡張') {
                  // dIdx (App.tsx から渡される値) が 1 または 3 の場合にハイライト
                  shouldHighlight = (index === dIdx && (dIdx === 1 || dIdx === 3));
              } else if (practice === '外来語の発音補助' && currentGairaigoTarget) {
                  // 現在のターゲットのヘッダインデックスと一致したらハイライト
                  shouldHighlight = (index === currentGairaigoTarget.headerIndex);
              } else { // 清音、拗音、濁音、半濁音、小文字、記号1, 2
                  shouldHighlight = (index === dIdx);
              }

              if (shouldHighlight) {
                  className += ' bg-blue-100';
              }
          }

          if (isTanbunMode) {
            if (isChallengeCountdown) {
                return (
                  <span key={index} className={className.trim()} style={style}>
                    {char} {/* カウントダウン文字をそのまま表示 */}
                  </span>
                );
              } else {
                // カウントダウン後（短文表示中）は文字ごとのスタイルを適用
                return (
                  <span key={index} className={`${className.trim()} whitespace-pre`} style={style}> {/* whitespace-pre を追加 */}
                    {sentenceChars.map((c, charIndex) => {
                      let charClassName = '';
                      if (tanbunProgress) {
                        const typedEndIndex = tanbunProgress.typedEndIndex;
                        if (charIndex < typedEndIndex) {
                          // 入力済み
                          charClassName = 'text-gray-400'; // 例: グレー文字
                        } else if (charIndex >= typedEndIndex) {
                          // 次の入力対象か判定
                          const nextCharLen = getNextCharLength(char, typedEndIndex);
                          if (charIndex < typedEndIndex + nextCharLen) {
                            charClassName = 'bg-blue-200 rounded px-1'; // 例: 青背景
                          }
                        }
                    }
                    return ( <span key={charIndex} className={charClassName}>
                        {c}
                      </span>
                    );})}
                  </span>
                );
              }
            }
          return (
            <span key={index} className={className.trim()} style={style}>
              {char} {/* 通常モード */}
              </span>
          );
        })}
      </div>
      {/* OKマーク */}
      {okVisible && practice !== 'かな入力１分間トレーニング' && practice !== '記号入力１分間トレーニング' && (
          <div
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
              style={{
                  left: okLeftPosition,
                  zIndex: 10
              }}
          >
              <span className='text-3xl font-bold text-green-600' style={{ padding: '0.25rem' }}>OK</span>
          </div>
      )}
    </div>
  );
};

export default PracticeHeading;
