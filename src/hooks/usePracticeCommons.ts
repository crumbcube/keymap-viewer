// src/hooks/usePracticeCommons.ts
import {
    gyouList,
    danOrder,
    youonGyouList,
    youonGyouChars,
    dakuonGyouList,
    dakuonGyouChars,
    handakuonGyouList,
    handakuonGyouChars,
    sokuonKomojiData,
    kigoPractice1Data,
    kigoPractice2Data,
    kigoPractice3Data
} from '../data/keymapData';

/* 練習モードの型定義 */
export type PracticeMode =
    | '清音の基本練習'
    | '拗音の基本練習'
    | '濁音の基本練習'
    | '半濁音の基本練習'
    | '小文字(促音)の基本練習'
    | '記号の基本練習１'
    | '記号の基本練習２'
    | '記号の基本練習３'
    | ''; // 未選択状態

/* 左右の型 */
export type KeyboardSide = 'left' | 'right';

/* キーボードモデルの型定義 */
export type KeyboardModel = 'tw-20h' | 'tw-20v';

/* --- TW-20H マッピング --- */

// かな入力 (レイヤー2/3) および 記号練習2/3 で使用する基本マッピング
export const hid2GyouHRight_Kana: Record<number, string> = {
    0x01: 'IME',  0x15: 'IME',
    0x02: '促音', 0x16: '促音',
    0x03: '拗音', 0x17: '拗音',
    0x04: '濁音', 0x18: '濁音',
    0x05: 'BS',   0x19: 'BS',
    0x06: '変換', 0x1A: '変換',
    0x07: 'あ行', 0x1B: 'あ行',
    0x08: 'か行', 0x1C: 'か行',
    0x09: 'さ行', 0x1D: 'さ行',
    0x0A: 'TAB' , 0x1E: 'TAB',
    0x0B: '記号', 0x1F: '記号', // レイヤー2 の '記号' キー (HID: 0x0B, 0x1F と仮定)
    0x0C: 'た行', 0x20: 'た行',
    0x0D: 'な行', 0x21: 'な行',
    0x0E: 'は行', 0x22: 'は行',
    0x0F: 'SP',   0x23: 'SP',
    0x10: 'わ行', 0x24: 'わ行',
    0x11: 'ま行', 0x25: 'ま行',
    0x12: 'や行', 0x26: 'や行',
    0x13: 'ら行', 0x27: 'ら行',
    0x14: 'ENT' , 0x28: 'ENT'
};

// 記号練習1 (レイヤー6 長押し) 用のマッピング
export const hid2GyouHRight_Kigo1: Record<number, string> = {
    // HID コードは TW-20H Right の仕様に合わせてください (以下は仮、一部ログから推定)
    0x06: '{',    // index 5 (仮)
    0x07: '}',    // index 6 (仮)
    0x08: '<',    // index 7 (仮)
    0x09: '>',    // index 8 (仮)
    0x0B: "'",    // index 10 (ログから HID: 0x0B と推定)
    0x0C: '"',    // index 11 (仮 - 要確認)
    0x0D: '(',    // index 12 (仮)
    0x0E: ')',    // index 13 (仮)
    0x10: ':',    // index 15 (仮)
    0x11: ';',    // index 16 (仮)
    0x12: '「',   // index 17 (仮)
    0x13: '」',   // index 18 (仮)
};

// かな入力 (レイヤー2/3) および 記号練習2/3 で使用する基本マッピング
export const hid2DanHRight_Kana: Record<number, string> = {
    0x07: '拗1',  0x1B: '拗1',
    0x08: 'う段', 0x1C: 'う段',
    0x09: '拗2',  0x1D: '拗2',
    0x0C: 'い段', 0x20: 'い段',
    0x0D: 'あ段', 0x21: 'あ段',
    0x0E: 'え段', 0x22: 'え段',
    0x11: '拗3',  0x25: '拗3',
    0x12: 'お段', 0x26: 'お段',
    0x13: '拗4',  0x27: '拗4',
};

// かな入力 (レイヤー2/3) および 記号練習2/3 で使用する基本マッピング
export const hid2GyouHLeft_Kana: Record<number, string> = {
    0x01: 'BS',   0x15: 'BS',
    0x02: '促音', 0x16: '促音',
    0x03: '拗音', 0x17: '拗音',
    0x04: '濁音', 0x18: '濁音',
    0x05: 'IME', 0x19: 'IME',
    0x06: 'TAB', 0x1A: 'TAB',
    0x07: 'あ行', 0x1B: 'あ行',
    0x08: 'か行', 0x1C: 'か行',
    0x09: 'さ行', 0x1D: 'さ行',
    0x0A: '変換', 0x1E: '変換',
    0x0B: 'SP',   0x1F: 'SP',
    0x0C: 'た行', 0x20: 'た行',
    0x0D: 'な行', 0x21: 'な行',
    0x0E: 'は行', 0x22: 'は行',
    0x0F: '記号', 0x23: '記号', // レイヤー2 の '記号' キー (HID: 0x0F, 0x23)
    0x10: 'ENT', 0x24: 'ENT',
    0x11: 'ま行', 0x25: 'ま行',
    0x12: 'や行', 0x26: 'や行',
    0x13: 'ら行', 0x27: 'ら行',
    0x14: 'わ行', 0x28: 'わ行'
};

// 記号練習1 (レイヤー6 長押し) 用のマッピング
export const hid2GyouHLeft_Kigo1: Record<number, string> = {
    // HID コードは TW-20H Left の仕様に合わせてください (以下は仮)
    0x07: '{',    // index 6 (仮)
    0x08: '}',    // index 7 (仮)
    0x09: '<',    // index 8 (仮)
    0x0A: '>',    // index 9 (仮)
    0x0C: "'",    // index 11 (仮)
    0x0D: '"',    // index 12 (仮)
    0x0E: '(',    // index 13 (仮)
    0x0F: ')',    // index 14 (仮)
    0x11: ':',    // index 16 (仮)
    0x12: ';',    // index 17 (仮)
    0x13: '「',   // index 18 (仮)
    0x14: '」',   // index 19 (仮)
};

// かな入力 (レイヤー2/3) および 記号練習2/3 で使用する基本マッピング
export const hid2DanHLeft_Kana: Record<number, string> = {
    0x07: '拗1',  0x1B: '拗1',
    0x08: 'う段', 0x1C: 'う段',
    0x09: '拗2',  0x1D: '拗2',
    0x0C: 'い段', 0x20: 'い段',
    0x0D: 'あ段', 0x21: 'あ段',
    0x0E: 'え段', 0x22: 'え段',
    0x11: '拗3',  0x25: '拗3',
    0x12: 'お段', 0x26: 'お段',
    0x13: '拗4',  0x27: '拗4',
};

/* --- TW-20V マッピング (仮) --- */
// TW-20V 用のマッピング定義も同様に _Kana, _Kigo1 に分割してください
// (TW-20V の仕様が不明なため、内容は仮のままです)
export const hid2GyouVRight_Kana: Record<number, string> = { /* ... */ };
export const hid2DanVRight_Kana: Record<number, string> = { /* ... */ };
export const hid2GyouVLeft_Kana: Record<number, string> = { /* ... */ };
export const hid2DanVLeft_Kana: Record<number, string> = { /* ... */ };
export const hid2GyouVRight_Kigo1: Record<number, string> = { /* ... */ };
export const hid2GyouVLeft_Kigo1: Record<number, string> = { /* ... */ };


/* 練習フックの共通プロパティ */
export interface PracticeHookProps {
    gIdx: number;
    dIdx: number;
    okVisible: boolean;
    isActive: boolean;
    side: KeyboardSide;
    layers: string[][];
    kb: KeyboardModel;
}

/* 練習フックの入力情報 */
export interface PracticeInputInfo {
    type: 'press' | 'release';
    timestamp: number;
    pressCode: number;
}

/* 練習フックの入力処理結果 */
export interface PracticeInputResult {
    isExpected: boolean;
    shouldGoToNext: boolean;
}

/* 各練習フックが返すオブジェクトの共通インターフェース */
export interface PracticeHookResult {
    handleInput: (info: PracticeInputInfo) => PracticeInputResult;
    getHighlightClassName: (key: string, layoutIndex: number) => string | null | undefined;
    headingChars: string[];
    reset?: () => void;
    isInvalidInputTarget: (keyCode: number, layoutIndex: number, keyIndex: number) => boolean;
}

// 各練習モードのデータ (再エクスポート)
export {
    gyouList,
    danOrder,
    youonGyouList,
    youonGyouChars,
    dakuonGyouList,
    dakuonGyouChars,
    handakuonGyouList,
    handakuonGyouChars,
    sokuonKomojiData,
    kigoPractice1Data,
    kigoPractice2Data,
    kigoPractice3Data
};
