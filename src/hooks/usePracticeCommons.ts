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
// !!! 注意: 以下の TW-20V 用マッピングは TW-20H を参考に作成した仮のものです !!!
// !!! 必ず実際の TW-20V の HID コード仕様に合わせて修正してください !!!

// TW-20V Right (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
export const hid2GyouVRight_Kana: Record<number, string> = {
    // TW-20H Right をベースに4列構成を想定 (5列目を除外)
    0x01: '促音', 0x15: '促音', // TW-20H Right の 0x02
    0x02: '拗音', 0x16: '拗音', // TW-20H Right の 0x03
    0x03: '濁音', 0x17: '濁音', // TW-20H Right の 0x04
    0x04: 'BS',   0x18: 'BS',   // TW-20H Right の 0x05
    0x05: 'あ行', 0x19: 'あ行', // TW-20H Right の 0x06
    0x06: 'か行', 0x1A: 'か行', // TW-20H Right の 0x07
    0x07: 'さ行', 0x1B: 'さ行', // TW-20H Right の 0x08
    0x08: 'TAB', 0x1C: 'TAB', // TW-20H Right の 0x0B
    0x09: 'た行', 0x1D: 'た行', // TW-20H Right の 0x0C
    0x0A: 'な行', 0x1E: 'な行', // TW-20H Right の 0x0D
    0x0B: 'は行', 0x1F: 'は行', // TW-20H Right の 0x0E
    0x0C: 'SP',   0x20: 'SP', // TW-20H Right の 0x10
    0x0D: 'ま行', 0x21: 'ま行', // TW-20H Right の 0x11
    0x0E: 'や行', 0x22: 'や行', // TW-20H Right の 0x12
    0x0F: 'ら行', 0x23: 'ら行', // TW-20H Right の 0x13
    0x10: 'ENT', 0x24: 'ENT',// 0x14: 'ENT' (除外)
    0x11: 'わ行', 0x25: 'わ行',
    0x12: '変換', 0x26: '変換',
    0x13: '記号', 0x27: '記号',
    0x14: 'IME', 0x28: 'IME'
};

// TW-20V Right (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
export const hid2DanVRight_Kana: Record<number, string> = {
    // TW-20H Right と同じキーコードを仮定 (ただし行キーコードは上記VRightに合わせる)
    0x05: '拗1',  0x15: '拗1',  // あ行
    0x06: 'う段', 0x16: 'う段', // か行
    0x07: '拗2',  0x17: '拗2',  // さ行
    0x09: 'い段', 0x19: 'い段', // た行
    0x0A: 'あ段', 0x1A: 'あ段', // な行
    0x0B: 'え段', 0x1B: 'え段', // は行
    0x0D: '拗3',  0x1D: '拗3',  // ま行
    0x0E: 'お段', 0x1E: 'お段', // や行
    0x0F: '拗4',  0x1F: '拗4',  // ら行
};

// TW-20V Right (4列) - 記号練習1 (レイヤー6 長押し)
export const hid2GyouVRight_Kigo1: Record<number, string> = {
    // TW-20H Right Kigo1 をベースに4列構成を想定
    0x12: '{',    // 変換
    0x13: '}',    // あ行
    0x06: '<',    // か行
    0x07: '>',    // さ行
    0x05: "'",    // 記号
    0x09: '"',    // た行
    0x0A: '(',    // な行
    0x0B: ')',    // は行
    0x0D: ':',    // わ行
    0x11: ';',    // ま行
    0x0E: '「',   // や行
    0x0F: '」',   // ら行
};

// TW-20V Left (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
export const hid2GyouVLeft_Kana: Record<number, string> = {
    // TW-20H Left をベースに4列構成を想定 (5列目を除外)
    0x01: 'BS',   0x11: 'BS',   // TW-20H Left の 0x01
    0x02: '促音', 0x12: '促音', // TW-20H Left の 0x02
    0x03: '拗音', 0x13: '拗音', // TW-20H Left の 0x03
    0x04: '濁音', 0x14: '濁音', // TW-20H Left の 0x04
    // 0x05: 'IME' (除外)
    // 0x06: 'TAB' (除外)
    0x05: 'あ行', 0x15: 'あ行', // TW-20H Left の 0x07
    0x06: 'か行', 0x16: 'か行', // TW-20H Left の 0x08
    0x07: 'さ行', 0x17: 'さ行', // TW-20H Left の 0x09
    0x08: '変換', 0x18: '変換', // TW-20H Left の 0x0A
    // 0x0B: 'SP' (除外)
    0x09: 'た行', 0x19: 'た行', // TW-20H Left の 0x0C
    0x0A: 'な行', 0x1A: 'な行', // TW-20H Left の 0x0D
    0x0B: 'は行', 0x1B: 'は行', // TW-20H Left の 0x0E
    0x0C: '記号', 0x1C: '記号', // TW-20H Left の 0x0F
    // 0x10: 'ENT' (除外)
    0x0D: 'ま行', 0x1D: 'ま行', // TW-20H Left の 0x11
    0x0E: 'や行', 0x1E: 'や行', // TW-20H Left の 0x12
    0x0F: 'ら行', 0x1F: 'ら行', // TW-20H Left の 0x13
    0x10: 'わ行', 0x20: 'わ行', // TW-20H Left の 0x14
};

// TW-20V Left (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
export const hid2DanVLeft_Kana: Record<number, string> = {
    // TW-20H Left と同じキーコードを仮定 (ただし行キーコードは上記VLeftに合わせる)
    0x05: '拗1',  0x15: '拗1',  // あ行
    0x06: 'う段', 0x16: 'う段', // か行
    0x07: '拗2',  0x17: '拗2',  // さ行
    0x09: 'い段', 0x19: 'い段', // た行
    0x0A: 'あ段', 0x1A: 'あ段', // な行
    0x0B: 'え段', 0x1B: 'え段', // は行
    0x0D: '拗3',  0x1D: '拗3',  // ま行
    0x0E: 'お段', 0x1E: 'お段', // や行
    0x0F: '拗4',  0x1F: '拗4',  // ら行
};

// TW-20V Left (4列) - 記号練習1 (レイヤー6 長押し)
export const hid2GyouVLeft_Kigo1: Record<number, string> = {
    // TW-20H Left Kigo1 をベースに4列構成を想定
    0x05: '{',    // あ行
    0x06: '}',    // か行
    0x07: '<',    // さ行
    0x08: '>',    // 変換
    0x09: "'",    // た行
    0x0A: '"',    // な行
    0x0B: '(',    // は行
    0x0C: ')',    // 記号
    0x0D: ':',    // ま行
    0x0E: ';',    // や行
    0x0F: '「',   // ら行
    0x10: '」',   // わ行
};


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
