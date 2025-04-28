// src/components/PracticeHeading.tsx
import React, { useMemo } from 'react';
import { PracticeMode, PracticeHookResult } from '../hooks/usePracticeCommons';
import {
    youdakuonPracticeData,
    kigoPractice3Data,
} from '../data/keymapData'; // ハイライトに必要なデータをインポート

interface PracticeHeadingProps {
  activePractice: PracticeHookResult | null;
  isRandomMode: boolean;
  practice: PracticeMode;
  gIdx: number;
  dIdx: number;
  currentFunctionKeyMap: Record<number, string>;
  // cols: number; // useMemo の依存配列から削除したため不要
  fixedWidthNum: number; // OKマーク位置計算用
}

const keyWidthRem = 5.5;
const gapRem = 0.5; // gap-2 = 0.5rem

const PracticeHeading: React.FC<PracticeHeadingProps> = ({
  activePractice,
  isRandomMode,
  practice,
  gIdx,
  dIdx,
  currentFunctionKeyMap,
  // cols, // 不要
  fixedWidthNum,
}) => {
  const headingChars = activePractice?.headingChars ?? [];
  const okVisible = activePractice?.isOkVisible ?? false;

  // OKマークの位置計算ロジック
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
  // ▼▼▼ 依存配列から cols を削除済み ▼▼▼
  }, [currentFunctionKeyMap, fixedWidthNum]);
  // ▲▲▲ 修正完了 ▲▲▲


  return (
    <div className="relative flex justify-center mb-6">
      {/* 練習文字を表示する部分 */}
      <div className="flex justify-center">
        {headingChars.map((char: string, index: number) => {
          let className = 'text-2xl font-bold';
          if (!isRandomMode) {
              // ヘッダ文字のハイライトロジック
              if (practice === '拗濁音の練習') {
                  if (gIdx >= 0 && gIdx < youdakuonPracticeData.length && youdakuonPracticeData[gIdx]?.chars && index === dIdx) { className += ' bg-blue-100'; }
              } else if (practice === '拗半濁音の練習') {
                  if (index === dIdx) { className += ' bg-blue-100'; }
              } else if (practice === '記号の基本練習３') {
                  if (gIdx >= 0 && gIdx < kigoPractice3Data.length && kigoPractice3Data[gIdx]?.chars && index === dIdx) { className += ' bg-blue-100'; }
              } else if (index === dIdx) { // 清音、拗音、濁音、半濁音、小文字、記号1, 2
                className += ' bg-blue-100';
              }
          }
          return (
            <span key={index} className={className} style={{ padding: '0.25rem' }}>
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
