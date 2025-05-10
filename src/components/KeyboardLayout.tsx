// /home/coffee/my-keymap-viewer/src/components/KeyboardLayout.tsx
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { PracticeMode, PracticeHookResult, PracticeHighlightResult } from '../hooks/usePracticeCommons';
// import { kigoMapping2, kigoMapping3 } from '../data/keymapData'; // kigoMappingは直接使わなくなったためコメントアウト
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
}

// --- キーラベル取得ヘルパー関数群 ---
const getKeyLabelForKigo1Practice = (originalKey: string, funcKeyLabel: string | undefined, layoutIndex: number, isEmptyKey: boolean): string => {
    if (layoutIndex === 6) { // 記号1レイヤー
        if (isEmptyKey && funcKeyLabel) {
            return funcKeyLabel;
        }
    } else if (layoutIndex === 2) { // かなスタートレイヤーは非表示
         return '____';
    }
    return originalKey;
};

const getKeyLabelForKigo2Practice = (originalKey: string, funcKeyLabel: string | undefined, layoutIndex: number): string => {
    if (layoutIndex === 7) {
        if (funcKeyLabel) { // 機能キー
            return funcKeyLabel;
        }
        // 記号キーはそのまま表示
    } else if (layoutIndex === 2) { // かなスタートレイヤーは非表示
        return '____';
    }
    return originalKey;
};

const getKeyLabelForKigo3Practice = (originalKey: string, funcKeyLabel: string | undefined, layoutIndex: number): string => {
    if (layoutIndex === 8) {
        if (funcKeyLabel) { // 機能キー
            return funcKeyLabel;
        }
        // 記号キーはそのまま表示
    } else if (layoutIndex === 2) { // かなスタートレイヤーは非表示
        return '____';
    }
    return originalKey;
};

const getKeyLabelForKanaPractice = (originalKey: string, funcKeyLabel: string | undefined, layoutIndex: number): string => {
    if (layoutIndex === 3) { // かなエンドレイヤー
        // 拗音キーは非表示 (データ側で ____ に変更済みのため、この条件分岐は実質不要だが残しておく)
        if (['拗1', '拗2', '拗3', '拗4'].includes(originalKey)) { // 半角数字で比較
            return '____';
        }
    } else if (layoutIndex === 2) { // かなスタートレイヤー (上記以外)
         if (funcKeyLabel) {
             return funcKeyLabel;
         }
    }
    return originalKey;
};


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
}) => {
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

        // 練習モードON時のラベル加工
        if (training && showKeyLabels) {
            const funcKeyLabel = currentFunctionKeyMap[idx];

            switch (practice) {
                case '記号の基本練習１':
                    k = getKeyLabelForKigo1Practice(originalKey, funcKeyLabel, layoutIndex, isEmptyKey);
                    break;
                case '記号の基本練習２':
                    k = getKeyLabelForKigo2Practice(originalKey, funcKeyLabel, layoutIndex);
                    break;
                case '記号の基本練習３':
                    k = getKeyLabelForKigo3Practice(originalKey, funcKeyLabel, layoutIndex);
                    break;
                // 他のかな練習モードも同様に getKeyLabelForKanaPractice を使うか、
                // より詳細な分岐が必要なら専用のヘルパー関数を作成
                case '清音の基本練習':
                case '拗音の基本練習':
                case '濁音の基本練習':
                case '半濁音の基本練習':
                case '小文字(促音)の基本練習':
                case '拗濁音の練習':
                case '拗半濁音の練習':
                case '拗音拡張':
                case '外来語の発音補助':
                case 'かな入力１分間トレーニング': // チャレンジモードも含む
                    k = getKeyLabelForKanaPractice(originalKey, funcKeyLabel, layoutIndex);
                    break;
                case '記号入力１分間トレーニング':
                    // 記号チャレンジの場合、レイヤーによって表示を変える必要があるかもしれない
                    // 例えば、ターゲットレイヤーのみ表示するなど。
                    // ここでは、記号の基本練習と同様のロジックを適用するか、
                    // activePractice.displayLayers を参照して表示を制御する
                    if (activePractice?.displayLayers && activePractice.targetLayerIndex === layoutIndex) {
                        // ターゲットレイヤーの表示ロジック (必要なら funcKeyLabel も考慮)
                        // k = originalKey; // または funcKeyLabel を使うなど
                    } else if (activePractice?.displayLayers && activePractice.targetLayerIndex !== layoutIndex) {
                        // k = '____'; // ターゲット外のレイヤーは非表示など
                    } else {
                        // displayLayers がない場合のデフォルト (記号練習2,3に似た処理)
                        if (funcKeyLabel) k = funcKeyLabel;
                    }
                    break;
                case '短文入力３分間トレーニング':
                    // 短文練習ではキーボード表示は通常行わないが、もし表示する場合のラベル
                    k = '____'; // 基本的に非表示
                    break;
                default:
                    // その他の練習モードや練習モード未選択時
                    if (funcKeyLabel) {
                        k = funcKeyLabel;
                    }
                    break;
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
        lastInvalidKeyCode,
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
