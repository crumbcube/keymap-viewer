// /home/coffee/my-keymap-viewer/src/components/KeyboardLayout.tsx
import React, { useCallback } from 'react'; // useState, useRef, useEffect を削除
import { motion } from 'framer-motion';
import { PracticeMode, PracticeHookResult, PracticeHighlightResult } from '../hooks/usePracticeCommons';
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
  className?: string;
  // clearInvalidHighlight?: () => void; // App.tsx側で管理するため不要
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
  className = '',
  // clearInvalidHighlight, // App.tsx側で管理するため不要
}) => {
    // ローカルな invalidKeyIndex と invalidTimerRef は削除

    // useEffect も削除 (lastInvalidKeyCode の処理は App.tsx で一元管理)

    // キー描画ロジック (renderKey)
    const renderKey = useCallback((key: string, idx: number) => {
        let originalKey = (key ?? '').trim();
        const isEmptyKey = originalKey === '';

        let k = originalKey; // 加工前のキーラベル
        let highlightResult: PracticeHighlightResult = { className: null, overrideKey: null };
        let isInvalid = false;

        // App.tsx から渡される lastInvalidKeyCode を直接使用してエラー判定
        if (lastInvalidKeyCode !== null && (lastInvalidKeyCode - 1) === idx) {
            // activePractice.isInvalidInputTarget で、このレイアウトがエラー表示対象か確認
            if (activePractice?.isInvalidInputTarget(lastInvalidKeyCode, layoutIndex, idx)) {
                isInvalid = true;
            }
        }

        // 練習モードON時のラベル加工 (kigoMapping など)
        if (training && showKeyLabels) {
            const funcKeyLabel = currentFunctionKeyMap[idx];

            if (practice === '記号の基本練習１') {
                if (layoutIndex === 6) { // 記号1レイヤー
                    if (isEmptyKey && funcKeyLabel) {
                        k = funcKeyLabel;
                    }
                } else if (layoutIndex === 2) { // かなスタートレイヤーは非表示
                     k = '____';
                }
            } else if (practice === '記号の基本練習２') {
                if (layoutIndex === 7) {
                    if (funcKeyLabel) { // 機能キー
                        k = funcKeyLabel;
                    }
                    // 記号キーはそのまま表示 (kigoMapping2 は使わない)
                } else if (layoutIndex === 2) { // かなスタートレイヤーは非表示
                    k = '____';
                }
            } else if (practice === '記号の基本練習３') {
                if (layoutIndex === 8) {
                    if (funcKeyLabel) { // 機能キー
                        k = funcKeyLabel;
                    }
                    // 記号キーはそのまま表示 (kigoMapping3 は使わない)
                } else if (layoutIndex === 2) { // かなスタートレイヤーは非表示
                    k = '____';
                }
            } else if (layoutIndex === 3) { // かなエンドレイヤー
                // 拗音キーは非表示 (データ側で ____ に変更済みのため、この条件分岐は実質不要だが残しておく)
                if (['拗1', '拗2', '拗3', '拗4'].includes(originalKey)) { // 半角数字で比較
                    k = '____';
                }
            } else if (layoutIndex === 2) { // かなスタートレイヤー (上記以外)
                 if (funcKeyLabel) {
                     k = funcKeyLabel;
                 }
            }
        }

        // エラーハイライトを適用 (isInvalid が true の場合)
        if (isInvalid) {
            highlightResult = { className: 'bg-red-100', overrideKey: null };
        }

        // 正解キーハイライト処理 (不正入力でない場合のみ)
        if (!isInvalid && showKeyLabels && activePractice) {
            const result = activePractice.getHighlightClassName(originalKey, layoutIndex);
            if (result.className) {
                highlightResult = result;
            }
        }

        // 表示内容の決定
        let displayContent: string;
        if (!training) { // training が false なら練習モードOFF
            // 練習モードOFF時のレンダリング
            const defaultStyle = 'bg-white';
            let keyStyleClass = getKeyStyle(originalKey);

            if (originalKey === '記号' || originalKey === '＝\n記号') {
                keyStyleClass = defaultStyle;
            } else if (!keyStyleClass.includes('bg-')) {
                keyStyleClass = `${keyStyleClass} ${defaultStyle}`.trim();
            }

            return (
                <motion.div key={idx} className={`border rounded p-3 text-center text-sm shadow flex justify-center items-center ${keyStyleClass}`}
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
        layoutIndex, showKeyLabels, activePractice, practice,
        currentFunctionKeyMap,
        training,
        lastInvalidKeyCode, // lastInvalidKeyCode を依存配列に追加
    ]);

    if (!layerData) {
        return null; // レイヤーデータがない場合は何も表示しない
    }

    // コンポーネントのレンダリング
    return (
        <div className={`keyboard-layout bg-gray-100 p-2 rounded shadow-md ${className}`} style={{ width: fixedWidth }}>
            <h2 className="text-center font-semibold mb-2 text-sm">{layoutTitle}</h2>
            <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {layerData.map((key, index) => renderKey(key, index))}
            </div>
        </div>
    );
};

export default KeyboardLayout;
