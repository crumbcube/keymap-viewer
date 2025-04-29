// src/components/KeyboardLayout.tsx
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
// ▼▼▼ PracticeHighlightResult をインポート ▼▼▼
import { PracticeMode, PracticeHookResult, PracticeHighlightResult } from '../hooks/usePracticeCommons';
// ▲▲▲ インポート ▲▲▲
import { kigoMapping2, kigoMapping3 } from '../data/keymapData';
import { getKeyStyle, isLargeSymbol } from '../utils/styleUtils';

interface KeyboardLayoutProps {
  layerData: string[] | undefined;
  layoutIndex: number;
  layoutTitle: string;
  cols: number;
  fixedWidth: string;
  showKeyLabels: boolean;
  lastInvalidKeyCode: number | null;
  activePractice: PracticeHookResult | null;
  practice: PracticeMode;
  currentFunctionKeyMap: Record<number, string>;
  training: boolean;
}

const KeyboardLayout: React.FC<KeyboardLayoutProps> = ({
  layerData,
  layoutIndex,
  layoutTitle,
  cols,
  fixedWidth,
  showKeyLabels,
  lastInvalidKeyCode,
  activePractice,
  practice,
  currentFunctionKeyMap,
  training,
}) => {

  // キー描画ロジック (renderKey)
  const renderKey = useCallback((key: string, idx: number) => {
    let originalKey = (key ?? '').trim();
    const isEmptyKey = originalKey === '';

    let k = originalKey; // 加工前のキーラベル
    let highlightResult: PracticeHighlightResult = { className: null, overrideKey: null };
    let isInvalid = false;

    // 練習モードON時のラベル加工 (kigoMapping など)
    if (training && showKeyLabels) {
        if (practice === '記号の基本練習１') {
            if (layoutIndex === 6) { // 記号1レイヤー
                if (isEmptyKey && currentFunctionKeyMap[idx]) {
                    k = currentFunctionKeyMap[idx];
                }
            } else if (layoutIndex === 2) { // かなスタートレイヤーは非表示
                 k = '____';
            }
        } else if (practice === '記号の基本練習２') {
            if (layoutIndex === 2) { // かなスタートレイヤー
                if (currentFunctionKeyMap[idx]) { // 機能キー
                    k = currentFunctionKeyMap[idx];
                } else { // 行キー -> 記号に変換
                    k = kigoMapping2[originalKey] ?? k;
                }
            }
        } else if (practice === '記号の基本練習３') {
            if (layoutIndex === 2) { // かなスタートレイヤー
                if (currentFunctionKeyMap[idx]) { // 機能キー
                    k = currentFunctionKeyMap[idx];
                } else { // 行キー -> 記号に変換
                    k = kigoMapping3[originalKey] ?? k;
                }
            }
        } else if (layoutIndex === 3) { // かなエンドレイヤー
            // 拗音キーは非表示 (データ側で ____ に変更済みのため、この条件分岐は実質不要だが残しておく)
            if (['拗1', '拗2', '拗3', '拗4'].includes(originalKey)) { // 半角数字で比較
                k = '____';
            }
        } else if (layoutIndex === 2) { // かなスタートレイヤー (上記以外)
             if (currentFunctionKeyMap[idx]) {
                 k = currentFunctionKeyMap[idx];
             }
        }
    }

    // 不正入力ハイライト処理
    if (lastInvalidKeyCode !== null && activePractice) {
        const pressCode = lastInvalidKeyCode;
        const targetKeyIndex = pressCode - 1;
        const isTargetLayout = activePractice.isInvalidInputTarget(pressCode, layoutIndex, idx);

        if (isTargetLayout && idx === targetKeyIndex) {
            highlightResult = { className: 'bg-red-100', overrideKey: null };
            isInvalid = true;
        }
    }

    // 正解キーハイライト処理
    if (!isInvalid && showKeyLabels && !activePractice?.isOkVisible && activePractice) {
        const result = activePractice.getHighlightClassName(k, layoutIndex);
        if (result.className) {
            highlightResult = result;
        }
    }

    // 表示内容の決定
    let displayContent: string; // displayContent の宣言をここに移動
    if (!training) { // training が false なら練習モードOFF
        // 練習モードOFF時のレンダリング
        return (
            <motion.div key={idx} className={`bg-white border rounded p-3 text-center text-sm shadow flex justify-center items-center ${getKeyStyle(originalKey)}`}
                whileHover={{ scale: 1.05 }}
                style={{ minHeight: '3rem', fontSize: isLargeSymbol(originalKey) ? '1.8rem' : undefined }}>
                <code style={{ whiteSpace: "pre-line" }}>
                  {(originalKey ?? "").split(/\r?\n/).map((l: string, i: number, a: string[]) => (
                    <span key={i}>
                      {l}
                      {i < a.length - 1 && <br />}
                    </span>
                  ))}
                </code>
            </motion.div>
        );
    }

    // 練習モードON時の表示内容
    if (showKeyLabels) {
        const finalKeyLabel = highlightResult.overrideKey ?? k;
        displayContent = finalKeyLabel === '' ? '\n' : finalKeyLabel;
    } else {
        // キー表示OFF時は、元々空だったキー以外は ____ でマスク
        displayContent = isEmptyKey ? '\n' : '____';
    }

    // 練習モードON時のレンダリング
    return (
        <div
          key={idx}
          className={`border rounded p-3 text-center text-sm shadow flex justify-center items-center whitespace-pre-line ${highlightResult.className ?? ''}`}
          style={{ minHeight: '3rem' }}
        >
            {displayContent}
        </div>
    );
  }, [
      layoutIndex, showKeyLabels, lastInvalidKeyCode, activePractice, practice,
      currentFunctionKeyMap,
      training,
  ]);

  if (!layerData) {
    return null; // レイヤーデータがない場合は何も表示しない
  }

  return (
    <div style={{ width: fixedWidth }}>
      <h3 className='text-lg font-semibold mb-2 text-center'>{layoutTitle}</h3>
      <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${cols},minmax(0,1fr))` }}>
        {layerData.map(renderKey)}
      </div>
    </div>
  );
};

export default KeyboardLayout;
