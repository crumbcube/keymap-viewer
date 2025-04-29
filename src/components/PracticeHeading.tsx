// src/components/PracticeHeading.tsx
import React, { useMemo } from 'react';
import { PracticeMode, PracticeHookResult } from '../hooks/usePracticeCommons';
import {
    youdakuonPracticeData,
    kigoPractice3Data,
} from '../data/keymapData';

interface PracticeHeadingProps {
  activePractice: PracticeHookResult | null;
  isRandomMode: boolean;
  practice: PracticeMode;
  gIdx: number;
  dIdx: number; // dIdx を受け取る
  currentFunctionKeyMap: Record<number, string>;
  fixedWidthNum: number;
}

const keyWidthRem = 5.5;
const gapRem = 0.5;

const PracticeHeading: React.FC<PracticeHeadingProps> = ({
  activePractice,
  isRandomMode,
  practice,
  gIdx,
  dIdx, // dIdx を受け取る
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

  return (
    <div className="relative flex justify-center mb-6">
      {/* 練習文字を表示する部分 */}
      <div className="flex justify-center">
        {headingChars.map((char: string, index: number) => {
          let className = 'text-2xl'; // デフォルトは太字なし
          let style: React.CSSProperties = { padding: '0.25rem' };

          // ▼▼▼ 太字表示ロジックを修正 ▼▼▼
          // 拗音拡張の場合、練習対象の文字(index 1 と 3)のみ太字にする
          if (practice === '拗音拡張' && (index === 1 || index === 3)) {
              className += ' font-bold';
          } else if (practice !== '拗音拡張') {
              // 拗音拡張以外はデフォルトで太字
              className += ' font-bold';
          }
          // ▲▲▲ 修正完了 ▲▲▲

          // ハイライト処理 (ランダムモードでない場合)
          if (!isRandomMode) {
              let shouldHighlight = false;
              if (practice === '拗濁音の練習') {
                  shouldHighlight = (gIdx >= 0 && gIdx < youdakuonPracticeData.length && youdakuonPracticeData[gIdx]?.chars && index === dIdx);
              } else if (practice === '拗半濁音の練習') {
                  shouldHighlight = (index === dIdx);
              } else if (practice === '記号の基本練習３') {
                  shouldHighlight = (gIdx >= 0 && gIdx < kigoPractice3Data.length && kigoPractice3Data[gIdx]?.chars && index === dIdx);
              // ▼▼▼ 拗音拡張のハイライト条件を修正 ▼▼▼
              } else if (practice === '拗音拡張') {
                  // dIdx (App.tsx から渡される値) が 1 または 3 の場合にハイライト
                  shouldHighlight = (index === dIdx && (dIdx === 1 || dIdx === 3));
              // ▲▲▲ 修正完了 ▲▲▲
              } else { // 清音、拗音、濁音、半濁音、小文字、記号1, 2
                  shouldHighlight = (index === dIdx);
              }

              if (shouldHighlight) {
                  className += ' bg-blue-100';
              }
          }

          return (
            <span key={index} className={className} style={style}>
              {char}
            </span>
          );
        })}
      </div>
      {/* OKマーク */}
      {okVisible && (
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
