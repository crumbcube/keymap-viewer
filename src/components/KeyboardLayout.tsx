// /home/coffee/my-keymap-viewer/src/components/KeyboardLayout.tsx
import React, { useCallback, useState, useRef, useEffect } from 'react'; // useState, useRef, useEffect をインポート
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
  clearInvalidHighlight?: () => void;
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
  clearInvalidHighlight,
}) => {
    const [invalidKeyIndex, setInvalidKeyIndex] = useState<number | null>(null);
    const invalidTimerRef = useRef<number | null>(null);

    useEffect(() => {
        console.log(`[KeyboardLayout ${layoutIndex}] useEffect triggered. lastInvalidKeyCode: ${lastInvalidKeyCode === null ? 'null' : `0x${lastInvalidKeyCode.toString(16)}`}`);
        if (lastInvalidKeyCode !== null) {
            const targetKeyIndex = lastInvalidKeyCode - 1;
            const isTargetLayout = activePractice?.isInvalidInputTarget(lastInvalidKeyCode, layoutIndex, targetKeyIndex);
            console.log(`[KeyboardLayout ${layoutIndex}] isTargetLayout for code 0x${lastInvalidKeyCode.toString(16)}: ${isTargetLayout}`);

            if (isTargetLayout) {
                console.log(`[KeyboardLayout ${layoutIndex}] Setting invalidKeyIndex to ${targetKeyIndex}`);
                setInvalidKeyIndex(targetKeyIndex); // 不正入力されたキーのインデックスを設定

                // 既存のタイマーがあればクリア
                if (invalidTimerRef.current !== null) {
                    clearTimeout(invalidTimerRef.current);
                }

                // 500ms後にハイライトを解除するタイマーを設定
                invalidTimerRef.current = window.setTimeout(() => {
                    console.log(`[KeyboardLayout ${layoutIndex}] Timeout clearing invalidKeyIndex for index ${targetKeyIndex}`);
                    setInvalidKeyIndex(null);
                    invalidTimerRef.current = null;
                    // clearInvalidHighlight?.(); // App.tsx 側でタイマー管理するので不要かも
                }, 500);
            } else {
                // このレイアウトが対象でない場合は、ローカルのハイライト状態をクリア
                // setInvalidKeyIndex(null); // 他のレイアウトのハイライトを消さないようにコメントアウト
            }
        } else {
             // lastInvalidKeyCode が null になったら、ローカルのハイライトもクリア
             console.log(`[KeyboardLayout ${layoutIndex}] lastInvalidKeyCode is null, clearing invalidKeyIndex.`);
             if (invalidTimerRef.current !== null) {
                 clearTimeout(invalidTimerRef.current);
                 invalidTimerRef.current = null;
             }
             setInvalidKeyIndex(null);
        }

        // クリーンアップ関数でタイマーをクリア
        return () => {
            if (invalidTimerRef.current !== null) {
                clearTimeout(invalidTimerRef.current);
                invalidTimerRef.current = null;
            }
        };
    }, [lastInvalidKeyCode, layoutIndex, activePractice]); // clearInvalidHighlight は不要かも

    console.log(`[KeyboardLayout ${layoutIndex}] Rendered. invalidKeyIndex state: ${invalidKeyIndex}`);

    // キー描画ロジック (renderKey)
    const renderKey = useCallback((key: string, idx: number) => {
        let originalKey = (key ?? '').trim();
        const isEmptyKey = originalKey === '';

        let k = originalKey; // 加工前のキーラベル
        // console.log(`[renderKey ${layoutIndex}-${idx}] Start. key: "${originalKey}", invalidKeyIndex state: ${invalidKeyIndex}`); // ログ削減
        let highlightResult: PracticeHighlightResult = { className: null, overrideKey: null };
        let isInvalid = false;

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

        if (invalidKeyIndex === idx) {
            highlightResult = { className: 'bg-red-100', overrideKey: null };
            isInvalid = true;
        }
        // console.log(`[renderKey ${layoutIndex}-${idx}] After invalid check. highlightResult:`, highlightResult); // ログ削減

        // 正解キーハイライト処理 (不正入力でない場合のみ)
        if (!isInvalid && showKeyLabels && !activePractice?.isOkVisible && activePractice) {
            const result = activePractice.getHighlightClassName(originalKey, layoutIndex);
            if (result.className) {
                highlightResult = result;
            }
        }

        // 表示内容の決定
        let displayContent: string; // displayContent の宣言をここに移動
        if (!training) { // training が false なら練習モードOFF
            // 練習モードOFF時のレンダリング
            const defaultStyle = 'bg-white'; // デフォルトの背景クラス
            let keyStyleClass = getKeyStyle(originalKey); // まず styleUtils から取得

            if (originalKey === '記号' || originalKey === '＝\n記号') {
                // もしキーが「記号」または「＝\n記号」なら、強制的にデフォルトスタイルにする
                keyStyleClass = defaultStyle;
            } else if (!keyStyleClass.includes('bg-')) {
                // getKeyStyle が背景色クラスを返さなかった場合もデフォルトを適用
                keyStyleClass = `${keyStyleClass} ${defaultStyle}`.trim();
            }

            return (
                <motion.div key={idx} className={`border rounded p-3 text-center text-sm shadow flex justify-center items-center ${keyStyleClass}`} // ← 修正したクラスを適用
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
        invalidKeyIndex,
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

