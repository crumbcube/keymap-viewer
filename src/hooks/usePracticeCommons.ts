// /home/coffee/my-keymap-viewer/src/hooks/usePracticeCommons.ts
import {
    gyouList,
    danOrder,
    gyouChars,
    danList,
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
    kigoPractice3Data,
    functionKeyMaps,
    youdakuonPracticeData,
    youdakuonGyouChars,
    youdakuonDanMapping,
    youhandakuonGyouChars,
    youhandakuonDanMapping,
    youhandakuonPracticeData,
    YouhandakuonInputDef,
    YoudakuonInputDef,
    gairaigoPracticeData,
    GairaigoPracticeTarget,
} from '../data/keymapData';

/* 練習モードの型定義 */
export type PracticeMode =
    | ''
    | '清音の基本練習'
    | '拗音の基本練習'
    | '濁音の基本練習'
    | '半濁音の基本練習'
    | '小文字(促音)の基本練習'
    | '記号の基本練習１'
    | '記号の基本練習２'
    | '記号の基本練習３' 
    | '拗濁音の練習' 
    | '拗半濁音の練習' 
    | '拗音拡張'
    | '外来語の発音補助'
    | 'かな入力１分間トレーニング'
    | '記号入力１分間トレーニング'
    | '短文入力３分間トレーニング';

/* 左右の型 */
export type KeyboardSide = 'left' | 'right';

/* キーボードモデルの型定義 */
export type KeyboardModel = 'tw-20h' | 'tw-20v';

export type PracticeStage = 'line' | 'youon' | 'dan' | 'middle' | 'kigo' | 'longPressWait' | 'longPressCheck' | 'gyouInput' | 'dakuonInput' | 'handakuonInput' | 'dakuonInput1' | 'dakuonInput2' | 'kigoInput' | 'kigoInputWait' | 'tsuInput' | 'key1' | 'key2' | 'key3' | 'key4' | 'waitAfterFirstDakuon';


/* --- TW-20H マッピング --- */

// かな入力 (レイヤー2/3) および 記号練習2/3 で使用する基本マッピング
export const hid2GyouHRight_Kana: Record<number, string> = {
    0x01: 'IME', 0x15: 'IME',
    0x02: '促音', 0x16: '促音',
    0x03: '拗音', 0x17: '拗音',
    0x04: '濁音', 0x18: '濁音',
    0x05: 'BS',  0x19: 'BS',
    0x06: '変換', 0x1A: '変換',
    0x07: 'あ行', 0x1B: 'あ行',
    0x08: 'か行', 0x1C: 'か行',
    0x09: 'さ行', 0x1D: 'さ行',
    0x0A: 'TAB', 0x1E: 'TAB',
    0x0B: '記号', 0x1F: '記号',
    0x0C: 'た行',  0x20: 'た行',
    0x0D: 'な行', 0x21: 'な行',
    0x0E: 'は行', 0x22: 'は行',
    0x0F: 'SP',  0x23: 'SP',
    0x10: 'わ行', 0x24: 'わ行',
    0x11: 'ま行', 0x25: 'ま行',
    0x12: 'や行', 0x26: 'や行',
    0x13: 'ら行', 0x27: 'ら行',
    0x14: 'ENT' , 0x28: 'ENT'
};

// 記号練習1 (レイヤー6 長押し) 用のマッピング
export const hid2GyouHRight_Kigo1: Record<number, string> = {
    0x06: '{',    // index 5
    0x07: '}',    // index 6
    0x08: '<',    // index 7
    0x09: '>',    // index 8
    0x0B: "'",    // index 10
    0x0C: '"',    // index 11
    0x0D: '(',    // index 12
    0x0E: ')',    // index 13
    0x10: ':',    // index 15
    0x11: ';',    // index 16
    0x12: '「',   // index 17
    0x13: '」',   // index 18
};

export const hid2DanHRight_Kana: Record<number, string> = {
    0x08: 'う段', 0x1C: 'う段',
    0x0C: 'い段', 0x20: 'い段',
    0x0D: 'あ段', 0x21: 'あ段',
    0x0E: 'え段', 0x22: 'え段',
    0x12: 'お段', 0x26: 'お段',
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
    0x0F: '記号', 0x23: '記号',
    0x10: 'ENT', 0x24: 'ENT',
    0x11: 'ま行', 0x25: 'ま行',
    0x12: 'や行', 0x26: 'や行',
    0x13: 'ら行', 0x27: 'ら行',
    0x14: 'わ行', 0x28: 'わ行'
};

// 記号練習1 (レイヤー6 長押し) 用のマッピング
export const hid2GyouHLeft_Kigo1: Record<number, string> = {
    0x07: '{',    // index 6
    0x08: '}',    // index 7
    0x09: '<',    // index 8
    0x0A: '>',    // index 9
    0x0C: "'",    // index 11
    0x0D: '"',    // index 12
    0x0E: '(',    // index 13
    0x0F: ')',    // index 14
    0x11: ':',    // index 16
    0x12: ';',    // index 17
    0x13: '「',   // index 18
    0x14: '」',   // index 19
};

export const hid2DanHLeft_Kana: Record<number, string> = {
    0x08: 'う段', 0x1C: 'う段',
    0x0C: 'い段', 0x20: 'い段',
    0x0D: 'あ段', 0x21: 'あ段',
    0x0E: 'え段', 0x22: 'え段',
    0x12: 'お段', 0x26: 'お段',
};

/* --- TW-20V マッピング --- */

// TW-20V Right (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
export const hid2GyouVRight_Kana: Record<number, string> = {
    0x01: '促音', 0x15: '促音', // 離上 = 0x01 + 0x14
    0x02: '拗音', 0x16: '拗音', // 離上 = 0x02 + 0x14
    0x03: '濁音', 0x17: '濁音', // 離上 = 0x03 + 0x14
    0x04: 'BS',   0x18: 'BS',   // 離上 = 0x04 + 0x14
    0x05: 'あ行', 0x19: 'あ行', // 離上 = 0x05 + 0x14
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
export const hid2DanVRight_Kana: Record<number, string> = {
    0x06: 'う段', 0x1A: 'う段', // か行 (離上 = 0x06 + 0x14)
    0x09: 'い段', 0x1D: 'い段', // た行 (離上 = 0x09 + 0x14)
    0x0A: 'あ段', 0x1E: 'あ段', // な行 (離上 = 0x0A + 0x14)
    0x0B: 'え段', 0x1F: 'え段', // は行 (離上 = 0x0B + 0x14)
    0x0E: 'お段', 0x22: 'お段', // や行 (離上 = 0x0E + 0x14)
};

// TW-20V Right (4列) - 記号練習1 (レイヤー6 長押し)
export const hid2GyouVRight_Kigo1: Record<number, string> = {
    0x05: "'",    // index 4
    0x06: '<',    // index 5
    0x07: '>',    // index 6
    0x09: '"',    // index 8
    0x0A: '(',    // index 9
    0x0B: ')',    // index 10
    0x0D: ':',    // index 12
    0x0E: '「',   // index 13
    0x0F: '」',   // index 14
    0x11: ';',    // index 16
    0x12: '{',    // index 17
    0x13: '}',    // index 18
};

// TW-20V Left (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
export const hid2GyouVLeft_Kana: Record<number, string> = {
    0x01: 'BS',   0x15: 'BS',   // 離上 = 0x01 + 0x14
    0x02: '濁音', 0x16: '濁音', // 離上 = 0x02 + 0x14
    0x03: '拗音', 0x17: '拗音', // 離上 = 0x03 + 0x14
    0x04: '促音', 0x18: '促音', // 離上 = 0x04 + 0x14
    0x05: 'TAB',  0x19: 'TAB', // 離上 = 0x05 + 0x14
    0x06: 'あ行', 0x1A: 'あ行', // 離上 = 0x06 + 0x14
    0x07: 'か行', 0x1B: 'か行', // 離上 = 0x07 + 0x14
    0x08: 'さ行', 0x1C: 'さ行', // 離上 = 0行08 + 0x14
    0x09: 'SP',   0x1D: 'SP', // 離上 = 0x09 + 0x14
    0x0A: 'た行', 0x1E: 'た行', // 離上 = 0x0A + 0x14
    0x0B: 'な行', 0x1F: 'な行', // 離上 = 0x0B + 0x14
    0x0C: 'は行', 0x20: 'は行', // 離上 = 0x0C + 0x14
    0x0D: 'ENT',  0x21: 'ENT', // 離上 = 0x0D + 0x14
    0x0E: 'ま行', 0x22: 'ま行', // 離上 = 0x0E + 0x14
    0x0F: 'や行', 0x23: 'や行', // 離上 = 0x0F + 0x14
    0x10: 'ら行', 0x24: 'ら行', // 離上 = 0x10 + 0x14
    0x11: 'IME',  0x25: 'IME', // 離上 = 0x11 + 0x14
    0x12: '変換', 0x26: '変換', // 離上 = 0x12 + 0x14
    0x13: '記号', 0x27: '記号', // 離上 = 0x13 + 0x14
    0x14: 'わ行', 0x28: 'わ行'   // 離上 = 0x14 + 0x14
};

// TW-20V Left (4列) - かな入力 (レイヤー2/3) および 記号練習2/3
export const hid2DanVLeft_Kana: Record<number, string> = {
    0x07: 'う段', 0x1B: 'う段', // か行 (離上 = 0x06 + 0x14)
    0x0A: 'い段', 0x1E: 'い段', // た行 (離上 = 0x09 + 0x14)
    0x0B: 'あ段', 0x1F: 'あ段', // な行 (離上 = 0x0A + 0x14)
    0x0C: 'え段', 0x20: 'え段', // は行 (離上 = 0x0B + 0x14)
    0x0F: 'お段', 0x23: 'お段', // や行 (離上 = 0x0E + 0x14)
};

// TW-20V Left (4列) - 記号練習1 (レイヤー6 長押し)
export const hid2GyouVLeft_Kigo1: Record<number, string> = {
    0x06: "'",    // index 5
    0x07: '<',    // index 6
    0x08: '>',    // index 7
    0x0A: '"',    // index 9
    0x0B: '(',    // index 10
    0x0C: ')',    // index 11
    0x0E: ':',    // index 13
    0x0F: '「',   // index 14
    0x10: '」',   // index 15
    0x12: ';',    // index 17
    0x13: '{',    // index 18
    0x14: '}',    // index 19
};


/* 練習フックの共通プロパティ */
export interface PracticeHookProps {
    gIdx: number;
    dIdx: number;
    isActive: boolean;
    side: KeyboardSide;
    layers: string[][];
    kb: KeyboardModel;
    isRandomMode?: boolean;
    showKeyLabels: boolean;
    onAdvance?: () => void;
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
    shouldGoToNext?: boolean;
}

export interface PracticeHighlightResult {
    className: string | null;
    overrideKey: string | null;
}

export interface ChallengeResult {
    totalQuestions: number;
    totalCharsTyped: number;
    correctCharsCount?: number;
    correctCount: number;
    missCount: number;
    accuracy: number;
    score: number;
    rankMessage: string;
}

type PracticeTargetObject = CharInfoSeion | CharInfoYouon | CharInfoDakuon | CharInfoSokuonKomoji | CharInfoKigo1 | CharInfoKigo2 | CharInfoKigo3 | CharInfoGairaigo | CharInfoYouhandakuon | CharInfoYoudakuon;

export type PracticeStatus = 'idle' | 'countdown' | 'running' | 'finished';

/* 練習フックの共通戻り値型 */
export interface PracticeHookResult {
    headingChars: string[];
    targetChar?: string;
    getHighlightClassName: (key: string, layoutIndex: number) => PracticeHighlightResult;
    getHighlight?: () => HighlightInfo;
    getProgressInfo?: () => TanbunProgressInfo;
    handleInput: (info: PracticeInputInfo) => PracticeInputResult;
    reset?: () => void;
    isInvalidInputTarget: (pressCode: number, layoutIndex: number, keyIndex: number) => boolean;
    status?: PracticeStatus;
    countdownValue?: number;
    challengeResults?: ChallengeResult | null;
    targetLayerIndex?: number | null;
    displayLayers?: string[][];
    currentTarget?: string | PracticeTargetObject | undefined;
    typedEndIndex?: number;
}

/* getHighlight の戻り値 */
export interface HighlightInfo {
    start: string | null;
    end: string | null;
}

export interface TanbunHighlightInfo {
    start: number | null;
    end: number | null;
}

export interface TanbunProgressInfo {
    typedEndIndex: number;
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
export interface CharInfoGairaigo {
    type: 'gairaigo';
    char: string;
    keys: [string, string, string] | [string, string, string, string];
    actualSecondKey: string;
    actualThirdKey?: string;
}
export interface CharInfoYouhandakuon {
    type: 'youhandakuon';
    char: string;
    inputDef: YouhandakuonInputDef;
}
export interface CharInfoYoudakuon {
    type: 'youdakuon';
    char: string;
    inputDef: YoudakuonInputDef;
}


// 全清音文字情報
export const allSeionCharInfos: CharInfoSeion[] = gyouList.flatMap(gyou =>
  danOrder[gyou]?.map((charInDanOrder, index) => {
    const actualChar = gyouChars[gyou]?.[index];
    let danKey: string | undefined;
    if (gyou === 'や行') {
        if (index === 0) danKey = 'あ段';
        else if (index === 1) danKey = 'う段';
        else if (index === 2) danKey = 'お段';
    } else {
        danKey = danList[index];
    }

    if (danKey && actualChar) {
      return {
        type: 'seion' as const,
        char: actualChar,
        gyouKey: gyou,
        danKey: danKey,
      };
    }
    return null;
  }).filter((info): info is CharInfoSeion => info !== null) ?? []
);

// 全拗音文字情報
export const allYouonCharInfos: CharInfoYouon[] = youonGyouList.flatMap((gyou: string) =>
  youonDanMapping[gyou]?.map((dan: string, index: number) => ({
    type: 'youon' as const,
    char: youonGyouChars[gyou]?.[index] ?? '?',
    gyouKey: gyou,
    danKey: dan,
  })).filter((info): info is CharInfoYouon => info.char !== '?') ?? []
);

// 全濁音文字情報
export const allDakuonCharInfos: CharInfoDakuon[] = dakuonGyouList.flatMap((gyou: string) =>
  dakuonDanMapping[gyou]?.map((dan: string, index: number) => ({
    type: 'dakuon' as const,
    char: dakuonGyouChars[gyou]?.[index] ?? '?',
    gyouKey: gyou,
    danKey: dan,
  })).filter((info): info is CharInfoDakuon => info.char !== '?') ?? []
);

// 全半濁音文字情報
export const allHandakuonCharInfos: CharInfoHandakuon[] = handakuonDanMapping['は行']?.map((dan: string, index: number) => ({
    type: 'handakuon' as const,
    char: handakuonGyouChars['は行']?.[index] ?? '?',
    gyouKey: 'は行' as const,
    danKey: dan,
})).filter((info): info is CharInfoHandakuon => info.char !== '?') ?? [];

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
        const isEqualSign = char === '='; // Note: kigoPractice3Data.ts の '＝' (全角) と合わせる
        return {
            type: 'kigo3' as const,
            char: char,
            isEqualSign: isEqualSign,
            gyouKey: isEqualSign ? undefined : group.inputs[index].gyouKey,
        };
    })
);
export const allGairaigoCharInfos: CharInfoGairaigo[] = gairaigoPracticeData.flatMap(group =>
    group.targets.map(target => ({
        type: 'gairaigo' as const,
        char: target.char,
        keys: target.keys,
        actualSecondKey: target.actualSecondKey,
        actualThirdKey: target.actualThirdKey, // actualThirdKey も含める
    }))
);
export const allYouhandakuonCharInfos: CharInfoYouhandakuon[] = youhandakuonPracticeData.flatMap(group =>
    group.chars.map((char, index) => ({
        type: 'youhandakuon' as const,
        char: char,
        inputDef: group.inputs[index],
    }))
);

// 全拗濁音文字情報
export const allYoudakuonCharInfos: CharInfoYoudakuon[] = youdakuonPracticeData.flatMap(group =>
    group.chars.map((char, index) => ({
        type: 'youdakuon' as const,
        char: char,
        inputDef: group.inputs[index],
    }))
);

// ------------------------------------

/**
 * 指定されたキー名に対応するHIDキーコードの配列を取得する
 * @param keyName キー名 (例: "あ行", "あ段", "拗音", "{")
 * @param layers 現在のキーボードレイアウトデータ
 * @param kb キーボードモデル
 * @param side 左右どちらか
 * @returns 対応するHIDキーコード(1-based)の配列
 */
export const getHidKeyCodes = (keyName: string, layers: string[][], kb: KeyboardModel, side: KeyboardSide): number[] => {
    if (!keyName) return [];
    const codes: number[] = [];
    // Function key map for the current keyboard and side
    const currentFuncMap = functionKeyMaps[kb]?.[side] ?? {};

    layers.forEach((layer, layerIndex) => {
        layer.forEach((key, keyIndex) => {
            const currentKeyName = (key ?? '').trim();
            const hidCode = keyIndex + 1; // 1-based HID code

            // Determine the effective key name, considering function key mappings
            let effectiveKeyName = currentKeyName;
            // Apply function key mapping for relevant layers (e.g., kana layers, symbol long-press layer)
            // Adjust layer indices as per your application's logic
            if (layerIndex === 2 || layerIndex === 3 || layerIndex === 6 || layerIndex === 7 || layerIndex === 8) {
                 if (currentFuncMap[keyIndex]) { // Check if a function key mapping exists for this key index
                     effectiveKeyName = currentFuncMap[keyIndex];
                 }
            }

            // Special handling for '拗音' or other specific keys if needed
            if (keyName === '拗音' && effectiveKeyName === '拗音') {
                 codes.push(hidCode);
            } else if (effectiveKeyName === keyName) {
                codes.push(hidCode);
            }
        });
    });
    return Array.from(new Set(codes)); // Return unique codes
};


export const hid2Gyou = (hidCode: number, kb: KeyboardModel, side: KeyboardSide): string | undefined => {
    if (kb === 'tw-20v') {
        return side === 'right' ? hid2GyouVRight_Kana[hidCode] : hid2GyouVLeft_Kana[hidCode];
    } else { // tw-20h
        return side === 'right' ? hid2GyouHRight_Kana[hidCode] : hid2GyouHLeft_Kana[hidCode];
    }
};

export const hid2Dan = (hidCode: number, kb: KeyboardModel, side: KeyboardSide): string | undefined => {
     if (kb === 'tw-20v') {
        return side === 'right' ? hid2DanVRight_Kana[hidCode] : hid2DanVLeft_Kana[hidCode];
    } else { // tw-20h
        return side === 'right' ? hid2DanHRight_Kana[hidCode] : hid2DanHLeft_Kana[hidCode];
    }
};

const hid2YouonVRight_Kana: Record<number, string> = { 0x02: '拗音' };
const hid2YouonVLeft_Kana: Record<number, string> = { 0x03: '拗音' };
const hid2YouonHRight_Kana: Record<number, string> = { 0x03: '拗音' };
const hid2YouonHLeft_Kana: Record<number, string> = { 0x03: '拗音' };

export const hid2Youon = (hidCode: number, kb: KeyboardModel, side: KeyboardSide): string | undefined => {
     if (kb === 'tw-20v') {
        return side === 'right' ? hid2YouonVRight_Kana[hidCode] : hid2YouonVLeft_Kana[hidCode];
    } else { // tw-20h
        return side === 'right' ? hid2YouonHRight_Kana[hidCode] : hid2YouonHLeft_Kana[hidCode];
    }
};


// 各練習モードのデータ (再エクスポート)
export {
    gyouList,
    danOrder,
    danList,
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
    kigoPractice3Data,
    functionKeyMaps,
    youdakuonPracticeData,
    youdakuonGyouChars,
    youdakuonDanMapping,
    youhandakuonGyouChars,
    youhandakuonDanMapping,
    youhandakuonPracticeData,
    gairaigoPracticeData,
};

// ユーティリティ関数: チャレンジモードかどうかを判定
export const isChallengeMode = (mode: PracticeMode | ''): boolean => {
    if (!mode) return false; // mode が '' の場合はチャレンジモードではない
    return mode === 'かな入力１分間トレーニング' || mode === '記号入力１分間トレーニング' || mode === '短文入力３分間トレーニング';
};
