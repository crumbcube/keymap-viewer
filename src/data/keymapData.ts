// /home/coffee/my-keymap-viewer/src/data/keymapData.ts

/* --- 基本データ --- */
export const gyouList = ['あ行', 'か行', 'さ行', 'た行', 'な行', 'は行', 'ま行', 'や行', 'ら行', 'わ行'];
export const danList = ['あ段', 'い段', 'う段', 'え段', 'お段'];
export const danOrder: Record<string, string[]> = {
  'あ行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
  'か行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
  'さ行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
  'た行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
  'な行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
  'は行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
  'ま行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
  'や行': ['あ段', 'う段', 'お段'],
  'ら行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
  'わ行': ['あ段', 'い段', 'う段'],
};
export const gyouChars: Record<string, string[]> = {
    'あ行': ['あ', 'い', 'う', 'え', 'お'],
    'か行': ['か', 'き', 'く', 'け', 'こ'],
    'さ行': ['さ', 'し', 'す', 'せ', 'そ'],
    'た行': ['た', 'ち', 'つ', 'て', 'と'],
    'な行': ['な', 'に', 'ぬ', 'ね', 'の'],
    'は行': ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    'ま行': ['ま', 'み', 'む', 'め', 'も'],
    'や行': ['や', 'ゆ', 'よ'],
    'ら行': ['ら', 'り', 'る', 'れ', 'ろ'],
    'わ行': ['わ', 'を', 'ん'],
};
// ... (拗音、濁音、半濁音、小文字、記号練習、拗濁音、拗半濁音のデータも変更なし) ...
export const youonGyouList = ['か行', 'さ行', 'た行', 'な行', 'は行', 'ま行', 'ら行'];
export const youonGyouChars: Record<string, string[]> = {
    'か行': ['きゃ', 'きゅ', 'きょ'],
    'さ行': ['しゃ', 'しゅ', 'しょ'],
    'た行': ['ちゃ', 'ちゅ', 'ちょ'],
    'な行': ['にゃ', 'にゅ', 'にょ'],
    'は行': ['ひゃ', 'ひゅ', 'ひょ'],
    'ま行': ['みゃ', 'みゅ', 'みょ'],
    'ら行': ['りゃ', 'りゅ', 'りょ'],
};
export const youonDanMapping: Record<string, string[]> = {
    'か行': ['あ段', 'う段', 'お段'],
    'さ行': ['あ段', 'う段', 'お段'],
    'た行': ['あ段', 'う段', 'お段'],
    'な行': ['あ段', 'う段', 'お段'],
    'は行': ['あ段', 'う段', 'お段'],
    'ま行': ['あ段', 'う段', 'お段'],
    'ら行': ['あ段', 'う段', 'お段'],
};
export const dakuonGyouList = ['か行', 'さ行', 'た行', 'は行'];
export const dakuonGyouChars: Record<string, string[]> = {
    'か行': ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
    'さ行': ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
    'た行': ['だ', 'ぢ', 'づ', 'で', 'ど'],
    'は行': ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
};
export const dakuonDanMapping: Record<string, string[]> = {
    'か行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
    'さ行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
    'た行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
    'は行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
};
export const handakuonGyouList = ['は行'];
export const handakuonGyouChars: Record<string, string[]> = {
    'は行': ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
};
export const handakuonDanMapping: Record<string, string[]> = {
    'は行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
};
export interface SokuonKomojiInputDef {
    gyouKey?: string;
    middleKey?: '濁音';
    dan?: string;
}
export interface SokuonKomojiPracticeGroup {
    groupName: string;
    chars: string[];
    inputs: (SokuonKomojiInputDef | null)[];
}
export const sokuonKomojiData: SokuonKomojiPracticeGroup[] = [
    { groupName: '促音', chars: ['っ'], inputs: [null], },
    { groupName: '小文字あ行', chars: ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'], inputs: [ { gyouKey: 'あ行', dan: 'あ段' }, { gyouKey: 'あ行', dan: 'い段' }, { gyouKey: 'あ行', dan: 'う段' }, { gyouKey: 'あ行', dan: 'え段' }, { gyouKey: 'あ行', dan: 'お段' }, ], },
    { groupName: '小文字や行', chars: ['ゃ', 'ゅ', 'ょ'], inputs: [ { gyouKey: 'や行', dan: 'あ段' }, { gyouKey: 'や行', dan: 'う段' }, { gyouKey: 'や行', dan: 'お段' }, ], },
    { groupName: '小文字わ行', chars: ['ゎ'], inputs: [ { gyouKey: 'わ行', dan: 'あ段' }, ], },
    { groupName: '小文字か行', chars: ['ヵ', 'ヶ'], inputs: [ { gyouKey: 'か行', dan: 'あ段' }, { gyouKey: 'か行', dan: 'え段' }, ], },
    { groupName: '小文字た行', chars: ['っ'], inputs: [null], },
    { groupName: 'ヴ', chars: ['ヴ'], inputs: [ { gyouKey: 'わ行', middleKey: '濁音', dan: 'う段' }, ], },
];
export interface Kigo1InputDef { keyName: string; }
export interface Kigo1PracticeGroup { groupName: string; chars: string[]; inputs: Kigo1InputDef[]; }
export const kigoPractice1Data: Kigo1PracticeGroup[] = [
    { groupName: '括弧１', chars: ['{', '}', '<', '>'], inputs: [ { keyName: '{' }, { keyName: '}' }, { keyName: '<' }, { keyName: '>' }, ], },
    { groupName: '括弧２', chars: ["'", '"', '(', ')'], inputs: [ { keyName: "'" }, { keyName: '"' }, { keyName: '(' }, { keyName: ')' }, ], },
    { groupName: '括弧３', chars: [':', ';', '「', '」'], inputs: [ { keyName: ':' }, { keyName: ';' }, { keyName: '「' }, { keyName: '」' }, ], },
];
export interface Kigo2InputDef { gyouKey: string; }
export interface Kigo2PracticeGroup { groupName: string; chars: string[]; inputs: Kigo2InputDef[]; }
export const kigoPractice2Data: Kigo2PracticeGroup[] = [
    { groupName: '記号２－１', chars: ['＋', '＿', '＊', '－', '＠'], inputs: [ { gyouKey: 'あ行' }, { gyouKey: 'か行' }, { gyouKey: 'さ行' }, { gyouKey: 'た行' }, { gyouKey: 'な行' }, ], },
    { groupName: '記号２－２', chars: ['・', '＆', '｜', '％', '￥'], inputs: [ { gyouKey: 'は行' }, { gyouKey: 'ま行' }, { gyouKey: 'や行' }, { gyouKey: 'ら行' }, { gyouKey: 'わ行' }, ], },
];
export interface Kigo3InputDef { gyouKey?: string; }
export interface Kigo3PracticeGroup { groupName: string; chars: string[]; inputs: Kigo3InputDef[]; }
export const kigoPractice3Data: Kigo3PracticeGroup[] = [
    { groupName: '記号３－１', chars: ['「', '」', '（', '）', '｛'], inputs: [ { gyouKey: 'あ行' }, { gyouKey: 'か行' }, { gyouKey: 'さ行' }, { gyouKey: 'た行' }, { gyouKey: 'な行' }, ], },
    { groupName: '記号３－２', chars: ['｝', '［', '］', '＜', '＞'], inputs: [ { gyouKey: 'は行' }, { gyouKey: 'ま行' }, { gyouKey: 'や行' }, { gyouKey: 'ら行' }, { gyouKey: 'わ行' }, ], },
    { groupName: '記号３－３', chars: ['＝'], inputs: [ {}, ], },
];
export interface YoudakuonInputDef { gyouKey: string; youonKey: string; dakuonKey: string; dan: string; }
export interface YoudakuonPracticeGroup { groupName: string; chars: string[]; inputs: YoudakuonInputDef[]; }
// ▼▼▼ 拗濁音データの youonKey を修正 ▼▼▼
export const youdakuonPracticeData: YoudakuonPracticeGroup[] = [
  { groupName: 'が行拗音', chars: ['ぎゃ', 'ぎゅ', 'ぎょ'], inputs: [ { gyouKey: 'か行', youonKey: '拗音', dakuonKey: '濁音', dan: 'あ段' }, { gyouKey: 'か行', youonKey: '拗音', dakuonKey: '濁音', dan: 'う段' }, { gyouKey: 'か行', youonKey: '拗音', dakuonKey: '濁音', dan: 'お段' }, ] },
  { groupName: 'ざ行拗音', chars: ['じゃ', 'じゅ', 'じょ'], inputs: [ { gyouKey: 'さ行', youonKey: '拗音', dakuonKey: '濁音', dan: 'あ段' }, { gyouKey: 'さ行', youonKey: '拗音', dakuonKey: '濁音', dan: 'う段' }, { gyouKey: 'さ行', youonKey: '拗音', dakuonKey: '濁音', dan: 'お段' }, ] },
  { groupName: 'だ行拗音', chars: ['ぢゃ', 'ぢゅ', 'ぢょ'], inputs: [ { gyouKey: 'た行', youonKey: '拗音', dakuonKey: '濁音', dan: 'あ段' }, { gyouKey: 'た行', youonKey: '拗音', dakuonKey: '濁音', dan: 'う段' }, { gyouKey: 'た行', youonKey: '拗音', dakuonKey: '濁音', dan: 'お段' }, ] },
  { groupName: 'ば行拗音', chars: ['びゃ', 'びゅ', 'びょ'], inputs: [ { gyouKey: 'は行', youonKey: '拗音', dakuonKey: '濁音', dan: 'あ段' }, { gyouKey: 'は行', youonKey: '拗音', dakuonKey: '濁音', dan: 'う段' }, { gyouKey: 'は行', youonKey: '拗音', dakuonKey: '濁音', dan: 'お段' }, ] },
];
// ▲▲▲ 修正完了 ▲▲▲
export interface YouhandakuonInputDef { gyouKey: string; youonKey: string; dakuonKey1: string; dakuonKey2: string; dan: string; }
export interface YouhandakuonPracticeGroup { groupName: string; chars: string[]; inputs: YouhandakuonInputDef[]; }
export const youhandakuonPracticeData: YouhandakuonPracticeGroup[] = [
  { groupName: 'ぱ行拗音', chars: ['ぴゃ', 'ぴゅ', 'ぴょ'], inputs: [ { gyouKey: 'は行', youonKey: '拗音', dakuonKey1: '濁音', dakuonKey2: '濁音', dan: 'あ段' }, { gyouKey: 'は行', youonKey: '拗音', dakuonKey1: '濁音', dakuonKey2: '濁音', dan: 'う段' }, { gyouKey: 'は行', youonKey: '拗音', dakuonKey1: '濁音', dakuonKey2: '濁音', dan: 'お段' }, ] },
];
export const basicPracticeMenuItems = [ '清音の基本練習', '拗音の基本練習', '濁音の基本練習', '半濁音の基本練習', '小文字(促音)の基本練習', '記号の基本練習１', '記号の基本練習２', '記号の基本練習３', ];
export const stepUpPracticeMenuItems = [
  '拗濁音の練習',
  '拗半濁音の練習',
  '拗音拡張',
  '外来語の発音補助', // ← 追加済み
];
export const practiceMenuItems = [ ...basicPracticeMenuItems, ...stepUpPracticeMenuItems, ];

// ▼▼▼ 拗音拡張用のデータを追加 ▼▼▼
// 各行の拡張拗音を含む文字 (ゃ, ぃ, ゅ, ぇ, ょ)
export const youonKakuchoChars: Record<string, string[]> = {
    'か行': ['きゃ', 'きぃ', 'きゅ', 'きぇ', 'きょ'],
    'さ行': ['しゃ', 'しぃ', 'しゅ', 'しぇ', 'しょ'],
    'た行': ['ちゃ', 'ちぃ', 'ちゅ', 'ちぇ', 'ちょ'],
    'な行': ['にゃ', 'にぃ', 'にゅ', 'にぇ', 'にょ'],
    'は行': ['ひゃ', 'ひぃ', 'ひゅ', 'ひぇ', 'ひょ'],
    'ま行': ['みゃ', 'みぃ', 'みゅ', 'みぇ', 'みょ'],
    'ら行': ['りゃ', 'りぃ', 'りゅ', 'りぇ', 'りょ'],
};

// 拗音拡張の文字に対応する段キー (ゃ:あ段, ぃ:い段, ゅ:う段, ぇ:え段, ょ:お段)
export const youonKakuchoDanMapping: Record<string, string[]> = {
    'か行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
    'さ行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
    'た行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
    'な行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
    'は行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
    'ま行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
    'ら行': ['あ段', 'い段', 'う段', 'え段', 'お段'],
};
// ▲▲▲ 追加完了 ▲▲▲

// ▼▼▼ 外来語練習用のデータ構造とデータを修正 ▼▼▼
export interface GairaigoPracticeTarget {
  char: string;
  headerIndex: number;
  // keys: [string, string, string]; // 変更前
  keys: [string, string, string]; // 1番目: 1打目キー, 2番目: 2打目"表示"キー, 3番目: 3打目キー
  // ▼▼▼ 2打目の実際の入力キーを追加 ▼▼▼
  actualSecondKey: string; // 2打目の実際の入力キー名 (例: "さ行")
  // ▲▲▲ 追加 ▲▲▲
}

export interface GairaigoPracticeGroup {
  headerChars: string[];
  targets: GairaigoPracticeTarget[];
}

export const gairaigoPracticeData: GairaigoPracticeGroup[] = [
  { // グループ1: いぁいぃいぅいぇいぉ (変更なし)
    headerChars: ["いぁ", "いぃ", "いぅ", "いぇ", "いぉ"],
    targets: [
      { char: "いぇ", headerIndex: 3, keys: ["あ行", "拗音", "え段"], actualSecondKey: "拗音" } // 2打目は拗音
    ]
  },
  { // グループ2: うぁうぃうぅうぇうぉ (2打目を 拗2 に変更)
    headerChars: ["うぁ", "うぃ", "うぅ", "うぇ", "うぉ"],
    targets: [
      { char: "うぃ", headerIndex: 1, keys: ["あ行", "拗2", "い段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "うぇ", headerIndex: 3, keys: ["あ行", "拗2", "え段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "うぉ", headerIndex: 4, keys: ["あ行", "拗2", "お段"], actualSecondKey: "さ行" }  // 表示: 拗2, 入力: さ行
    ]
  },
  { // グループ3: くぁくぃくぅくぇくぉ (2打目を 拗2 に変更)
    headerChars: ["くぁ", "くぃ", "くぅ", "くぇ", "くぉ"],
    targets: [
      { char: "くぁ", headerIndex: 0, keys: ["か行", "拗2", "あ段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "くぃ", headerIndex: 1, keys: ["か行", "拗2", "い段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "くぇ", headerIndex: 3, keys: ["か行", "拗2", "え段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "くぉ", headerIndex: 4, keys: ["か行", "拗2", "お段"], actualSecondKey: "さ行" }  // 表示: 拗2, 入力: さ行
    ]
  },
  { // グループ4: すぁすぃすぅすぇすぉ (2打目を 拗2 に変更)
    headerChars: ["すぁ", "すぃ", "すぅ", "すぇ", "すぉ"],
    targets: [
      { char: "すぃ", headerIndex: 1, keys: ["さ行", "拗2", "い段"], actualSecondKey: "さ行" } // 表示: 拗2, 入力: さ行
    ]
  },
  { // グループ5: つぁつぃつぅつぇつぉ (2打目を 拗2 に変更)
    headerChars: ["つぁ", "つぃ", "つぅ", "つぇ", "つぉ"],
    targets: [
      { char: "つぁ", headerIndex: 0, keys: ["た行", "拗2", "あ段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "つぃ", headerIndex: 1, keys: ["た行", "拗2", "い段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "つぇ", headerIndex: 3, keys: ["た行", "拗2", "え段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "つぉ", headerIndex: 4, keys: ["た行", "拗2", "お段"], actualSecondKey: "さ行" }  // 表示: 拗2, 入力: さ行
    ]
  },
  { // グループ6: てぁてぃてぅてぇてぉ (2打目を 拗3 に変更)
    headerChars: ["てぁ", "てぃ", "てぅ", "てぇ", "てぉ"],
    targets: [
      { char: "てぃ", headerIndex: 1, keys: ["た行", "拗3", "い段"], actualSecondKey: "ま行" } // 表示: 拗3, 入力: ま行
    ]
  },
  { // グループ7: とぁとぃとぅとぇとぉ (2打目を 拗4 に変更)
    headerChars: ["とぁ", "とぃ", "とぅ", "とぇ", "とぉ"],
    targets: [
      { char: "とぅ", headerIndex: 2, keys: ["た行", "拗4", "う段"], actualSecondKey: "ら行" } // 表示: 拗4, 入力: ら行
    ]
  },
  { // グループ8: ふぁふぃふぅふぇふぉ (2打目を 拗2 に変更)
    headerChars: ["ふぁ", "ふぃ", "ふぅ", "ふぇ", "ふぉ"],
    targets: [
      { char: "ふぁ", headerIndex: 0, keys: ["は行", "拗2", "あ段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "ふぃ", headerIndex: 1, keys: ["は行", "拗2", "い段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "ふぇ", headerIndex: 3, keys: ["は行", "拗2", "え段"], actualSecondKey: "さ行" }, // 表示: 拗2, 入力: さ行
      { char: "ふぉ", headerIndex: 4, keys: ["は行", "拗2", "お段"], actualSecondKey: "さ行" }  // 表示: 拗2, 入力: さ行
    ]
  },
];
// ▲▲▲ 修正完了 ▲▲▲


/* --- キーボードレイアウトデータ --- */
// ▼▼▼ sampleJson を置き換え ▼▼▼
export const sampleJson = {
  "tw-20h": {
  right: {
    layers: [
    [ // layers[0] 基本レイアウト
      "IME ", "かな", "英字", "マウス", " BS",
      "変換", "７",  "８",  "９", "TAB",
      "．",   "４",  "５",  "６", "SP",
      "０",   "１",  "２",  "３", "ENT"
    ],
    [ // layers[1] テンキーモード
      "IME", "７", "８", "９", "BS",
      "＊",  "４", "５", "６", "ー",
      "／",  "１", "２", "３", "＋",
      "終了","０", "",   "．", "Enter"
    ],
    [ // layers[2] かなモード（スタート）
      "IME ", "促音", "拗音", "濁音", " BS",
      "変換", "あ行", "か行", "さ行", "TAB",
      "記号", "た行", "な行", "は行", " SP",
      "わ行", "ま行", "や行", "ら行", "ENT"
    ],
    [ // layers[3] かなモード（エンド）
      "____", "____", "____", "____", "____",
      "____", "____", "う段", "____", "____", // 半角数字に修正済み
      "____", "い段", "あ段", "え段", "____",
      "____", "____", "お段", "____", "____"  // 半角数字に修正済み
    ],
    [ // layers[4] 英字モード（スタート）
      "IME ",     "____",     "Caps\nLock", "a&lt;&gt;A",  " BS",
      "変換",     "@ - _ \\", "abc",          "def",  "TAB",
      ". , ? !",  "ghi",      "jkl",          "mno",  " SP",
      "' \" : ;", "pqrs",     "tuv",          "wxyz", "ENT"
    ],
    [ // layers[5] 英字モード（エンド）
      "____", "____", "____", "____", "____",
      "____", "",  "③",  "", "____",
      "____", "②", "①",  "④", "____",
      "____", "",  "",  "", "____"
    ],
    [ // layers[6] 記号・長押し - right (変更なし)
      "____", "____", "____", "____", "____", // 0-4
      "{",  "}",  "&lt;",  "&gt;",  "____", // 5, 6, 7, 8, 9
      "'",  "\"", "(",  ")",  "____", // 10, 11, 12, 13, 14
      ":",  ";",  "「", "」", "____"  // 15, 16, 17, 18, 19
    ],
    [ // layers[7] 記号・後押し
      "____",  "____", "____", "____", "____",
      "____",  "＋",  "＿", "＊",   "____",
      "記号",  "ー", "＠",  "・(/)",   "____",
      "￥(\\)",     "＆", "｜",  "％",   "____"
    ],
    [ // layers[8] 記号・先押し
      "____",  "____",  "____", "____", "____",
      "____",  " ` ",   " ? ", " ^ ",   "____",
      "＝\n記号", "。(,)", "、(.)", "！",  "____",
      "～",   "＄",  " ... ", "＃",  "____"
    ],
    [ // layers[9] 英字モード記号1
      "____", "____", "____", "____", "____",
      "",     "記号", "＿",   "",     "____",
      "",     "ー",   "＠",   "・",   "____",
      "",     "",     "",     "",     "____"
    ],
    [ // layers[10] 英字モード記号2
      "____", "____", "____", "____", "____",
      "",     "",     "：",   "",     "____",
      "",     " ”",   "’",    "；",   "____",
      "記号", "",     "",     "",    "____"
    ],
    [ // layers[11] ショートカット1（カーソル）
      "Undo",    "ホールド", "Redo",           "Del",  "ESC",
      "History", "Home",    " ↑ ",            "PgUp", "S(Tab)",
      "Paste",   " ← ",     "Start\n(Copy)", "→",    "S(SP)",
      "Ins",     "End",     "↓",              "PgDn", "ENT"
    ],
    [ // layers[12] ショートカット2（ウィンドウ）
      "Alt(F4)",   "Win+C(←)",   "ホールド", "Win+C(→)", "ESC",
      "Shift+F10", "Alt+S(Tab)", "Win(↑)",  "Alt+Tab",  "S(Tab)",
      "Win+D",     "Win(←)",     "Win",     "Win(→)",   "S(SP)",
      "Win+X",     "Win+S(T)",   "Win(↓)",  "Win+T",    "ENT"
    ],
    [ // layers[13] ショートカット3（Webブラウザ）
      "テンキー", "",            "",     "ホールド",  "ESC",
      "更新",     "Ctl+S(Tab)", "Ctl+W", "Ctl+Tab",  "S(Tab)",
      "履歴",     "Ctl+L",      "Ctl+T", "Ctl+S(T)", "S(SP)",
      "検索",     "",           "",      "",         "ENT"
    ],
    [ // layers[14] マウスモード
      "", "____",    "____",  "____",   "",
      "", "左Click", " ↑ ",   "右Click", "",
      "", " ← ",     "WHEEL", " → ",    "",
      "", "",        " ↓ ",   "",       ""
    ],
    [ // layers[15] ホイールモード
      "", "____", "____",  "____", "Ctl",
      "", "",     " ↑ ",   "",     "",
      "", " ← ",  "MOUSE", " → ",  "",
      "", "",     " ↓ ",   "",     ""
    ],
    ]
  },
  left: {
    layers: [
    [ // layers[0] 基本レイアウト
      " BS", "かな", "英字", "マウス", "IME ",
      "TAB", "７",  "８",  "９",      "変換",
      " SP", "４",  "５",  "６",      "．",
      "ENT", "１",  "２",  "３",      "０"
    ],
    [ // layers[1] テンキーモード
      "BS",    "７", "８", "９", "IME",
      "ー",    "４", "５", "６", "＊",
      "＋",    "１", "２", "３", "／",
      "Enter", "０", "",   "．", "終了"
    ],
    [ // layers[2] かなモード（スタート）
      " BS", "促音", "拗音", "濁音", "IME ",
      "TAB", "あ行", "か行", "さ行", "変換",
      " SP", "た行", "な行", "は行", "記号",
      "ENT", "ま行", "や行", "ら行", "わ行"
    ],
    [ // layers[3] かなモード（エンド）
      "____", "____", "____", "____", "____",
      "____", "____", "う段", "____", "____", // 半角数字に修正済み
      "____", "い段", "あ段", "え段", "____",
      "____", "____", "お段", "____", "____"  // 半角数字に修正済み
    ],
    [ // layers[4] 英字モード（スタート）
      " BS", "____",     "Caps\nLock", "a&lt;&gt;A",  "IME ",
      "TAB", "@ - _ \\", "abc",          "def",  "変換",
      " SP", "ghi",      "jkl",          "mno",  ". , ? !",
      "ENT", "pqrs",     "tuv",          "wxyz", "' \" : ;"
    ],
    [ // layers[5] 英字モード（エンド）
      "____", "____", "____", "____", "____",
      "____", "",     "③",    "",     "____",
      "____", "②",    "①",    "④",    "____",
      "____", "",     "",     "",     "____"
    ],
    [ // layers[6] 記号・長押し - left
      "____", // 0: BS
      "____", // 1: 濁音
      "____", // 2: 拗音
      "____", // 3: 促音
      "____", // 4: TAB
      "____", // 5: '
      "{",    // 18: {
      "}",    // 19: }
      "&lt;",    // 6: &lt;
      "&gt;",    // 7: &gt;
      "____", // 8: SP
      "'",    // 9: "
      "\"",   // 10: (
      "(",    // 11: )
      ")",    // 12: ENT
      "____", // 13: :
      ":",    // 14: 「
      ";",    // 17: ;
      "「",   // 15: 」
      "」"    // 16: IME
    ],
    [ // layers[7] 記号・後押し
      "____", "____", "____", "____", "____",
      "____", "＋",   "＿",   "＊",    "____",
      "____", "ー",   "＠",   "・(/)", "記号",
      "____", "＆",   "｜",   "％",    "￥(\\)"
    ],
    [ // layers[8] 記号・先押し
      "____", "____", "____",  "____", "____",
      "____", "`",    "？",    "＾",   "____", // ‘ を ` に変更
      "____", "。(,)", "、(.)", "！",  "＝\n記号",
      "____", "＄",    " ... ", "＃",  "～"
    ],
    [ // layers[9] 英字モード記号1
      "____", "____", "____", "____", "____",
      "____", "記号", "＿",   "",     "",
      "____", "ー",   "＠",    "／",   "",
      "____", "",     "",     "",     ""
    ],
    [ // layers[10] 英字モード記号2
      "____", "____", "____", "____", "____",
      "____", "",     "：",   "",     "",
      "____", "”",    "'",    "；",   "", // ’ を ' に変更
      "____", "",     "",     "",     "記号"
    ],
    [ // layers[11] ショートカット1（カーソル）
      "ESC",    "ホールド", "Redo",           "Del",  "Undo",
      "S(Tab)", "Home",    " ↑ ",            "PgUp", "History",
      "S(SP)",  " ← ",     "Start\n(Copy)", "→",    "Paste",
      "ENT",    "End",     "↓",              "PgDn", "Ins"
    ],
    [ // layers[12] ショートカット2（ウィンドウ）
      "ESC",    "Win+C(←)",   "ホールド", "Win+C(→)", "Alt(F4)",
      "S(Tab)", "Alt+S(Tab)", "Win(↑)",  "Alt+Tab",  "Shift+F10",
      "S(SP)",  "Win(←)",     "Win",     "Win(→)",   "Win+D",
      "ENT",    "Win+S(T)",   "Win(↓)",  "Win+T",    "Win+X"
    ],
    [ // layers[13] ショートカット3（Webブラウザ）
      "ESC",    "",           "",      "ホールド",  "テンキー",
      "S(Tab)", "Ctl+S(Tab)", "Ctl+W", "Ctl+Tab",  "更新",
      "S(SP)",  "Ctl+L",      "Ctl+T", "Ctl+S(T)", "履歴",
      "ENT",    "",           "",      "",         "検索"
    ],
    [ // layers[14] マウスモード
      "", "____",    "____",  "____",   "",
      "", "左Click", " ↑ ",   "右Click", "",
      "", " ← ",     "WHEEL", " → ",    "",
      "", "",        " ↓ ",   "",       ""
    ],
    [ // layers[15] ホイールモード
      "Ctl", "____", "____",  "____", "",
      "",    "",     " ↑ ",   "",     "",
      "",    " ← ",  "MOUSE", " → ",  "",
      "",    "",     " ↓ ",   "",     ""
    ],
    ]
  }
  },
  "tw-20v": {
  right: {
    layers: [
    [ // layers[0] 基本レイアウト
      "かな", "英字", "マウス", " BS",
      "７",   "８",   "９",    "TAB",
      "４",   "５",   "６",    " SP",
      "１",   "２",   "３",    "ENT",
      "０",   "変換", "．",    "IME"
    ],
    [ // layers[1] テンキーモード
      "終了", "／", "＊", "BS",
      "７",   "８", "９", "ー",
      "４",   "５", "６", "＋",
      "１",   "２", "３", "Enter",
      "０",   "",   "．", "IME",
    ],
    [ // layers[2] かなモード（スタート）
      "促音", "拗音", "濁音", " BS",
      "あ行", "か行", "さ行", "TAB",
      "た行", "な行", "は行", " SP",
      "ま行", "や行", "ら行", "ENT",
      "わ行", "変換", "記号", "IME"
    ],
    [ // layers[3] かなモード（エンド）
      "____", "____", "____", "____",
      "____", "う段", "____", "____", // 半角数字に修正済み
      "い段", "あ段", "え段", "____",
      "____", "お段", "____", "____", // 半角数字に修正済み
      "____", "____", "____", "____"
    ],
    [ // layers[4] 英字モード（スタート）
      "____",     "Caps\nLock", "a&lt;&gt;A",     " BS",
      "@ - _ \\", "abc",         "def",     "TAB",
      "ghi",      "jkl",         "mno",     " SP",
      "pqrs",     "tuv",         "wxyz",    "ENT",
      "' \" : ;", "変換",        ". , ? !", "IME"
    ],
    [ // layers[5] 英字モード（エンド）
      "____", "____", "____", "____",
      "",     "③",    "",     "____",
      "②",    "①",    "④",    "____",
      "",     "",     "",     "____",
      "____", "____", "____", "____"
    ],
    [ // layers[6] 記号・長押し
      "____", "____", "____", "____", // 0-3
      "'",   "&lt;",  "&gt;", "____",       // 4, 5, 6, 7
      "\"", "(",   ")", "____",       // 8, 9, 10, 11
      ":",  "「",  "」", "____",      // 12, 13, 14, 15
      ";",  "{",   "}",  "____"      // 16-19
    ],
    [ // layers[7] 記号・後押し
      "____", "____", "____", "____",
      "＋",   "＿",    "＊",    "____",
      "ー",   "＠",    "・(/)",    "____",
      "＆",   "｜",    "％",    "____",
      "￥(\\)",   "____",  "記号", "____"
    ],
    [ // layers[8] 記号・先押し
      "____",  "____", "____",     "____" ,
      "`",     "？",   "＾",       "____", // ‘ を ` に変更
      "。(,)", "、(.)", "！",      "____",
      "＄",    " ... ", "＃",      "____",
      "～",    "____",  "＝\n記号", "____"
    ],
    [ // layers[9] 英字モード記号1
      "____", "____", "____", "____",
      "記号", "＿",   "",     "____",
      "ー",   "＠",    "／",   "____",
      "",     "",      "",     "____",
      "",     "",      "",     "____"
    ],
    [ // layers[10] 英字モード記号2
      "____", "____", "____", "____",
      "",     "：",   "",     "____",
      "”",    "'",    "；",   "____", // ’ を ' に変更
      "",     "",     "",     "____",
      "記号", "",     "",     "____"
    ],
    [ // layers[11] ショートカット1（カーソル）
      "ホールド", "Redo",          "Del",     "ESC",
      "Home",    " ↑ ",           "PgUp",    "S(Tab)",
      " ← ",     "Start\n(Copy)", "→",       "S(SP)",
      "End",     "↓",             "PgDn",    "ENT",
      "Ins",     "Paste",         "History", "Undo"
    ],
    [ // layers[12] ショートカット2（ウィンドウ）
      "Win+C(←)",   "ホールド", "Win+C(→)", "ESC",
      "Alt+S(Tab)", "Win(↑)",  "Alt+Tab",  "S(Tab)",
      "Win(←)",     "Win",     "Win(→)",   "S(SP)",
      "Win+S(T)",   "Win(↓)",  "Win+T",    "ENT",
      "Alt(F4)",    "Win+D",   "Win+X",    "Shift+F10"
    ],
    [ // layers[13] ショートカット3（Webブラウザ）
      "",           "",      "ホールド", "ESC",
      "Ctl+S(Tab)", "Ctl+W", "Ctl+Tab", "S(Tab)",
      "Ctl+L",      "Ctl+T",   "Ctl+S(T)", "S(SP)",
      "",           "",      "",        "ENT",
      "テンキー",    "検索",  "更新",    "履歴"
    ],
    [ // layers[14] マウスモード
      "____",    "____",    "____",    "",
      "左Click", " ↑ ",     "右Click", "",
      " ← ",     "WHEEL",   " → ",     "",
      "",        " ↓ ",     "",        "",
      "",        "Topmost", "",        ""
    ],
    [ // layers[15] ホイールモード
      "____", "____",  "____", "Ctl",
      "",     " ↑ ",   "",     "",
      " ← ",  "MOUSE", " → ",  "",
      "",     " ↓ ",   "",     "",
      "",     "",      "",     ""
    ],
  ]
  },
  left: {
    layers: [
    [ // layers[0] 基本レイアウト
      " BS", "マウス", "英字", "かな",
      "TAB", "７",     "８",   "９",
      " SP", "４",     "５",   "６",
      "ENT", "１",     "２",   "３",
      "IME", "変換",   "．",   "０"
    ],
    [ // layers[1] テンキーモード
      "終了", "／", "＊", "BS",
      "７",   "８", "９", "ー",
      "４",   "５", "６", "＋",
      "１",   "２", "３", "Enter",
      "０",   "",   "．", "IME",
    ],
    [ // layers[2] かなモード（スタート）
      " BS", "濁音", "拗音", "促音",
      "TAB", "あ行", "か行", "さ行",
      " SP", "た行", "な行", "は行",
      "ENT", "ま行", "や行", "ら行",
      "IME", "変換", "記号", "わ行"
    ],
    [ // layers[3] かなモード（エンド）
      "____", "____", "____", "____",
      "____", "____", "う段", "____", // 半角数字に修正済み
      "____", "い段", "あ段", "え段",
      "____", "____", "お段", "____", // 半角数字に修正済み
      "____", "____", "____", "____"
    ],
    [ // layers[4] 英字モード（スタート）
      " BS", "a&lt;&gt;A",     "Caps\nLock", "____",
      "TAB", "@ - _ \\", "abc",        "def",
      " SP", "ghi",      "jkl",        "mno",
      "ENT", "pqrs",     "tuv",        "wxyz",
      "IME", "変換",     ". , ? !",    "' \" : ;"
    ],
    [ // layers[5] 英字モード（エンド）
      "____", "____", "____", "____",
      "____", "",     "③",    "",
      "____", "②",    "①",    "④",
      "____", "",     "",     "",
      "____", "____", "____", "____"
    ],
    [ // layers[6] 記号・長押し - left
      "____", // 0: BS
      "____", // 1: 濁音
      "____", // 2: 拗音
      "____", // 3: 促音
      "____", // 4: TAB
      "'",    // 5: '
      "&lt;",    // 6: &lt;
      "&gt;",    // 7: &gt;
      "____", // 8: SP
      "\"",   // 9: "
      "(",    // 10: (
      ")",    // 11: )
      "____", // 12: ENT
      ":",    // 13: :
      "「",   // 14: 「
      "」",   // 15: 」
      "____", // 16: IME
      ";",    // 17: ;
      "{",    // 18: {
      "}"     // 19: }
    ],
    [ // layers[7] 記号・後押し
      "____", "____",   "____", "____",
      "____", "＋",     "＿",   "＊",
      "____", "ー",     "＠",   "・(/)",
      "____", "＆",     "｜",   "％",
      "____", "￥(\\)", "記号", "____",
    ],
    [ // layers[8] 記号・先押し
      "____", "____",  "____",    "____",
      "____", "`",     "？",      "＾", // ‘ を ` に変更
      "____", "。(,)", "、(.)",   "！",
      "____", "＄",    " ... ",   "＃",
      "____", "～",    "＝\n記号", "____",
    ],
    [ // layers[9] 英字モード記号1
      "____", "____", "____", "____",
      "____", "記号", "＿",    "",
      "____", "ー",   "＠",    "・",
      "____", "",     "",      "",
      "____", "",     "",      ""
    ],
    [ // layers[10] 英字モード記号2
      "____", "____", "____", "____",
      "____", "",     "：",   "",
      "____", "”",    "'",    "；", // ’ を ' に変更
      "____", "",     "",     "",
      "____", "",     "",     "記号"
    ],
    [ // layers[11] ショートカット1（カーソル）
      "ESC",    "Del",  "Redo",          "ホールド",
      "S(Tab)", "Home", " ↑ ",           "PgUp",
      "S(SP)",  " ← ",  "Start\n(Copy)", "→",
      "ENT",    "End",  "↓",             "PgDn",
      "Undo",   "Ins",  "Paste",         "History",
    ],
    [ // layers[12] ショートカット2（ウィンドウ）
      "ESC",       "Win+C(←)",   "ホールド", "Win+C(→)",
      "S(Tab)",    "Alt+S(Tab)", "Win(↑)",  "Alt+Tab",
      "S(SP)",     "Win(←)",     "Win",     "Win(→)",
      "ENT",       "Win+S(T)",   "Win(↓)",  "Win+T",
      "Shift+F10", "Alt(F4)",    "Win+D",   "Win+X",
    ],
    [ // layers[13] ショートカット3（Webブラウザ）
      "ESC",    "ホールド",    "",      "",
      "S(Tab)", "Ctl+S(Tab)", "Ctl+W", "Ctl+Tab",
      "S(SP)",  "Ctl+L",      "Ctl+T", "Ctl+S(T)",
      "ENT",    "",           "",      "",
      "履歴",   "検索",        "更新",  "テンキー"
    ],
    [ // layers[14] マウスモード
      "", "____",    "____",    "____",
      "", "左Click", " ↑ ",     "右Click",
      "", " ← ",     "WHEEL",   " → ",
      "", "",        " ↓ ",     "",
      "", "",        "Topmost", ""
    ],
    [ // layers[15] ホイールモード
      "Ctl", "____", "____",  "____",
      "",    "",     " ↑ ",   "",
      "",    " ← ",  "MOUSE", " → ",
      "",    "",     " ↓ ",   "",
      "",    "",     "",      ""
    ],
    ]
  }
  }
};
// ▲▲▲ 置き換え完了 ▲▲▲

/* --- レイヤー名 --- */
// layerNames の定義を修正
export const layerNames = [
    "基本レイアウト",        // 0
    "テンキーモード",        // 1
    "かなモード（スタート）", // 2
    "かなモード（エンド）",   // 3
    "英字モード（スタート）", // 4
    "英字モード（エンド）",   // 5
    "記号・長押し",        // 6
    "記号・後押し",        // 7
    "記号・先押し",        // 8
    "英字モード記号1",     // 9
    "英字モード記号2",     // 10
    "ショートカット1",     // 11
    "ショートカット2",     // 12
    "ショートカット3",     // 13
    "マウスモード",        // 14
    "ホイールモード"       // 15
];


/* --- 記号マッピング --- */
export const kigoMapping2: Record<string, string> = {
  'あ行': '＋', 'か行': '＿', 'さ行': '＊', 'た行': '－', 'な行': '＠',
  'は行': '・', 'ま行': '＆', 'や行': '｜', 'ら行': '％', 'わ行': '￥',
};
export const kigoMapping3: Record<string, string> = {
  'あ行': '「', 'か行': '」', 'さ行': '（', 'た行': '）', 'な行': '｛',
  'は行': '｝', 'ま行': '［', 'や行': '］', 'ら行': '＜', 'わ行': '＞',
  '記号': '＝\n記号',
};

/* --- 機能キーマッピング --- */
export const functionKeyMaps = {
  'tw-20h': {
    right: {
      0: 'IME', 1: '促音', 2: '拗音', 3: '濁音', 4: 'BS',
      5: '変換', 9: 'TAB', /* 10: '記号', */ 14: 'SP', 19: 'ENT'
    } as Record<number, string>,
    left: {
      0: 'BS', 1: '促音', 2: '拗音', 3: '濁音', 4: 'IME',
      5: 'TAB', 9: '変換', 10: 'SP', /* 14: '記号', */ 15: 'ENT'
    } as Record<number, string>,
  },
  'tw-20v': {
    right: {
      0: '促音', 1: '拗音', 2: '濁音', 3: 'BS',
      7: 'TAB', 11: 'SP', 15: 'ENT',
      17: '変換', /* 18: '記号', */ 19: 'IME'
    } as Record<number, string>,
    left: {
      0: 'BS', 1: '濁音', 2: '拗音', 3: '促音',
      4: 'TAB', 8: 'SP', 12: 'ENT',
      16: 'IME', 17: '変換', /* 18: '記号', */
    } as Record<number, string>,
  },
};
