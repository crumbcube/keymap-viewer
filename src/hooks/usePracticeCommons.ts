// src/hooks/usePracticeCommons.ts
import {
    gyouList,
    danOrder,
    gyouChars,
    youonGyouList,
    youonGyouChars,
    youonDanMapping,
    dakuonGyouList,
    dakuonGyouChars,
    dakuonDanMapping,
    handakuonGyouList,
    handakuonGyouChars,
    handakuonDanMapping,
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

/* --- TW-20V マッピング (再々修正) --- */
// !!! 注意: 離上コードのオフセットを 0x14 として再計算しました !!!
// !!! 実際のキーボードの挙動と一致するか確認してください !!!

// TW-20V Right (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
export const hid2GyouVRight_Kana: Record<number, string> = {
    0x01: '促音', 0x15: '促音', // 離上 = 0x01 + 0x14
    0x02: '拗音', 0x16: '拗音', // 離上 = 0x02 + 0x14
    0x03: '濁音', 0x17: '濁音', // 離上 = 0x03 + 0x14
    0x04: 'BS',   0x18: 'BS',   // 離上 = 0x04 + 0x14
    0x05: 'あ行', 0x19: 'あ行', // 離上 = 0x05 + 0x14 (ログと一致)
    0x06: 'か行', 0x1A: 'か行', // 離上 = 0x06 + 0x14
    0x07: 'さ行', 0x1B: 'さ行', // 離上 = 0x07 + 0x14
    0x08: 'TAB',  0x1C: 'TAB',  // 離上 = 0x08 + 0x14
    0x09: 'た行', 0x1D: 'た行', // 離上 = 0x09 + 0x14
    0x0A: 'な行', 0x1E: 'な行', // 離上 = 0x0A + 0x14
    0x0B: 'は行', 0x1F: 'は行', // 離上 = 0x0B + 0x14
    0x0C: 'SP',   0x20: 'SP',   // 離上 = 0x0C + 0x14
    0x0D: 'ま行', 0x21: 'ま行', // 離上 = 0x0D + 0x14
    0x0E: 'や行', 0x22: 'や行', // 離上 = 0x0E + 0x14
    0x0F: 'ら行', 0x23: 'ら行', // 離上 = 0x0F + 0x14
    0x10: 'ENT',  0x24: 'ENT',  // 離上 = 0x10 + 0x14
    0x11: 'わ行', 0x25: 'わ行', // 離上 = 0x11 + 0x14
    0x12: '変換', 0x26: '変換', // 離上 = 0x12 + 0x14
    0x13: '記号', 0x27: '記号', // 離上 = 0x13 + 0x14
    0x14: 'IME',  0x28: 'IME'   // 離上 = 0x14 + 0x14
};

// TW-20V Right (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
// (hid2DanVRight_Kana は変更なし - 0x11以降に対応する段キーは存在しないため)
export const hid2DanVRight_Kana: Record<number, string> = {
    0x05: '拗1',  0x19: '拗1',  // あ行 (離上 = 0x05 + 0x14)
    0x06: 'う段', 0x1A: 'う段', // か行 (離上 = 0x06 + 0x14)
    0x07: '拗2',  0x1B: '拗2',  // さ行 (離上 = 0x07 + 0x14)
    0x09: 'い段', 0x1D: 'い段', // た行 (離上 = 0x09 + 0x14)
    0x0A: 'あ段', 0x1E: 'あ段', // な行 (離上 = 0x0A + 0x14)
    0x0B: 'え段', 0x1F: 'え段', // は行 (離上 = 0x0B + 0x14)
    0x0D: '拗3',  0x21: '拗3',  // ま行 (離上 = 0x0D + 0x14)
    0x0E: 'お段', 0x22: 'お段', // や行 (離上 = 0x0E + 0x14)
    0x0F: '拗4',  0x23: '拗4',  // ら行 (離上 = 0x0F + 0x14)
};

// TW-20V Right (4列) - 記号練習1 (レイヤー6 長押し)
// (hid2GyouVRight_Kigo1 は変更なし - 0x11以降に対応する記号キーは sampleJson に存在しないため)
export const hid2GyouVRight_Kigo1: Record<number, string> = {
    0x13: '}',    // あ行
    0x06: '<',    // か行
    0x07: '>',    // さ行
    0x05: "'",    // TAB
    0x09: '"',    // た行
    0x0A: '(',    // な行
    0x0B: ')',    // は行
    0x12: '{',    // SP
    0x11: ';',    // ま行
    0x0E: '「',   // や行
    0x0F: '」',   // ら行
    0x0D: ':',    // ENT
};

// TW-20V Left (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
// (hid2GyouVLeft_Kana は変更なし - 左手は 0x01-0x10 のはず)
export const hid2GyouVLeft_Kana: Record<number, string> = {
    0x01: 'BS',   0x15: 'BS',   // 離上 = 0x01 + 0x14
    0x02: '促音', 0x16: '促音', // 離上 = 0x02 + 0x14
    0x03: '拗音', 0x17: '拗音', // 離上 = 0x03 + 0x14
    0x04: '濁音', 0x18: '濁音', // 離上 = 0x04 + 0x14
    0x05: 'あ行', 0x19: 'あ行', // 離上 = 0x05 + 0x14 (右手と同じと仮定)
    0x06: 'か行', 0x1A: 'か行', // 離上 = 0x06 + 0x14
    0x07: 'さ行', 0x1B: 'さ行', // 離上 = 0x07 + 0x14
    0x08: '変換', 0x1C: '変換', // 離上 = 0x08 + 0x14
    0x09: 'た行', 0x1D: 'た行', // 離上 = 0x09 + 0x14
    0x0A: 'な行', 0x1E: 'な行', // 離上 = 0x0A + 0x14
    0x0B: 'は行', 0x1F: 'は行', // 離上 = 0x0B + 0x14
    0x0C: '記号', 0x20: '記号', // 離上 = 0x0C + 0x14
    0x0D: 'ま行', 0x21: 'ま行', // 離上 = 0x0D + 0x14
    0x0E: 'や行', 0x22: 'や行', // 離上 = 0x0E + 0x14
    0x0F: 'ら行', 0x23: 'ら行', // 離上 = 0x0F + 0x14
    0x10: 'わ行', 0x24: 'わ行', // 離上 = 0x10 + 0x14
};

// TW-20V Left (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
// (hid2DanVLeft_Kana は変更なし)
export const hid2DanVLeft_Kana: Record<number, string> = {
    0x05: '拗1',  0x19: '拗1',  // あ行 (離上 = 0x05 + 0x14)
    0x06: 'う段', 0x1A: 'う段', // か行 (離上 = 0x06 + 0x14)
    0x07: '拗2',  0x1B: '拗2',  // さ行 (離上 = 0x07 + 0x14)
    0x09: 'い段', 0x1D: 'い段', // た行 (離上 = 0x09 + 0x14)
    0x0A: 'あ段', 0x1E: 'あ段', // な行 (離上 = 0x0A + 0x14)
    0x0B: 'え段', 0x1F: 'え段', // は行 (離上 = 0x0B + 0x14)
    0x0D: '拗3',  0x21: '拗3',  // ま行 (離上 = 0x0D + 0x14)
    0x0E: 'お段', 0x22: 'お段', // や行 (離上 = 0x0E + 0x14)
    0x0F: '拗4',  0x23: '拗4',  // ら行 (離上 = 0x0F + 0x14)
};

// TW-20V Left (4列) - 記号練習1 (レイヤー6 長押し)
// (hid2GyouVLeft_Kigo1 は変更なし)
export const hid2GyouVLeft_Kigo1: Record<number, string> = {
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
    isRandomMode?: boolean;
}

/* 練習フックの入力情報 */
export interface PracticeInputInfo {
    type: 'press' | 'release';
    timestamp: number;
    pressCode: number; // 押下時のHIDコード (0x01 ~ maxStartLayoutKeyCode)
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
    isInvalidInputTarget: (pressCode: number, layoutIndex: number, keyIndex: number) => boolean;
    isOkVisible: boolean;
}

export interface CharInfoSeion {
  type: 'seion';
  char: string;
  gyouKey: string;
  danKey: string;
}
export interface CharInfoYouon {
  type: 'youon';
  char: string;
  gyouKey: string;
  danKey: string;
}
export interface CharInfoDakuon {
  type: 'dakuon';
  char: string;
  gyouKey: string;
  danKey: string;
}
export interface CharInfoHandakuon {
  type: 'handakuon';
  char: string;
  gyouKey: 'は行';
  danKey: string;
}
export interface CharInfoSokuonKomoji {
    type: 'sokuonKomoji';
    char: string;
    isTsu: boolean;
    gyouKey?: string;
    middleKey?: '濁音';
    danKey?: string;
}
export interface CharInfoKigo1 {
    type: 'kigo1';
    char: string;
    keyName: string;
}
export interface CharInfoKigo2 {
    type: 'kigo2';
    char: string;
    gyouKey: string;
}
export interface CharInfoKigo3 {
    type: 'kigo3';
    char: string;
    isEqualSign: boolean;
    gyouKey?: string;
}

// 全清音文字情報
export const allSeionCharInfos: CharInfoSeion[] = gyouList.flatMap(gyou =>
  danOrder[gyou]?.map((dan, index) => ({
    type: 'seion' as const,
    char: gyouChars[gyou]?.[index] ?? '?',
    gyouKey: gyou,
    danKey: dan,
  })).filter(info => info.char !== '?') ?? []
);

// 全拗音文字情報
export const allYouonCharInfos: CharInfoYouon[] = youonGyouList.flatMap(gyou =>
  youonDanMapping[gyou]?.map((dan, index) => ({
    type: 'youon' as const,
    char: youonGyouChars[gyou]?.[index] ?? '?',
    gyouKey: gyou,
    danKey: dan,
  })).filter(info => info.char !== '?') ?? []
);

// 全濁音文字情報
export const allDakuonCharInfos: CharInfoDakuon[] = dakuonGyouList.flatMap(gyou =>
  dakuonDanMapping[gyou]?.map((dan, index) => ({
    type: 'dakuon' as const,
    char: dakuonGyouChars[gyou]?.[index] ?? '?',
    gyouKey: gyou,
    danKey: dan,
  })).filter(info => info.char !== '?') ?? []
);

// 全半濁音文字情報
export const allHandakuonCharInfos: CharInfoHandakuon[] = handakuonDanMapping['は行']?.map((dan, index) => ({
    type: 'handakuon' as const,
    char: handakuonGyouChars['は行']?.[index] ?? '?',
    gyouKey: 'は行' as const,
    danKey: dan,
})).filter(info => info.char !== '?') ?? [];

// 全小文字・促音情報
export const allSokuonKomojiCharInfos: CharInfoSokuonKomoji[] = sokuonKomojiData.flatMap(group =>
    group.chars.map((char, index) => {
      const inputDef = group.inputs[index];
      const isTsu = char === 'っ';
      return {
        type: 'sokuonKomoji' as const,
        char: char,
        isTsu: isTsu,
        gyouKey: isTsu ? undefined : inputDef?.gyouKey,
        middleKey: isTsu ? undefined : inputDef?.middleKey,
        danKey: isTsu ? undefined : inputDef?.dan,
      };
    })
);
  
// 全記号1情報
export const allKigo1CharInfos: CharInfoKigo1[] = kigoPractice1Data.flatMap(group =>
    group.chars.map((char, index) => ({
        type: 'kigo1' as const,
        char: char,
        keyName: group.inputs[index].keyName,
    }))
);

// 全記号2情報
export const allKigo2CharInfos: CharInfoKigo2[] = kigoPractice2Data.flatMap(group =>
    group.chars.map((char, index) => ({
        type: 'kigo2' as const,
        char: char,
        gyouKey: group.inputs[index].gyouKey,
    }))
);

// 全記号3情報
export const allKigo3CharInfos: CharInfoKigo3[] = kigoPractice3Data.flatMap(group =>
    group.chars.map((char, index) => {
        const isEqualSign = char === '=';
        return {
            type: 'kigo3' as const,
            char: char,
            isEqualSign: isEqualSign,
            gyouKey: isEqualSign ? undefined : group.inputs[index].gyouKey,
        };
    })
);
// ------------------------------------

// 各練習モードのデータ (再エクスポート)
export {
    gyouList,
    danOrder,
    gyouChars,
    youonGyouList,
    youonGyouChars,
    youonDanMapping,
    dakuonGyouList,
    dakuonGyouChars,
    dakuonDanMapping,
    handakuonGyouList,
    handakuonGyouChars,
    handakuonDanMapping,
    sokuonKomojiData,
    kigoPractice1Data,
    kigoPractice2Data,
    kigoPractice3Data
};
