// /home/coffee/my-keymap-viewer/src/data/practiceDataMaps.ts
import {
    seionPracticeData,
    youonGyouList,
    youonGyouChars,
    dakuonGyouList,
    dakuonGyouChars,
    handakuonGyouChars,
    sokuonKomojiData,
    kigoPractice1Data,
    kigoPractice2Data,
    kigoPractice3Data,
    youdakuonPracticeData,
    youhandakuonPracticeData,
    youonKakuchoChars,
    gairaigoPracticeData,
} from './keymapData';

export const practiceDataMap: Record<string, any[]> = {
    '清音の基本練習': seionPracticeData,
    '拗音の基本練習': youonGyouList.map((gyou: string) => youonGyouChars[gyou]),
    '濁音の基本練習': dakuonGyouList.map((gyou: string) => dakuonGyouChars[gyou]),
    '半濁音の基本練習': [handakuonGyouChars['は行']],
    '小文字(促音)の基本練習': sokuonKomojiData,
    '記号の基本練習１': kigoPractice1Data,
    '記号の基本練習２': kigoPractice2Data,
    '記号の基本練習３': kigoPractice3Data,
    '拗濁音の練習': youdakuonPracticeData,
    '拗半濁音の練習': youhandakuonPracticeData,
    '拗音拡張': youonGyouList.map((gyou: string) => youonKakuchoChars[gyou]),
    '外来語の発音補助': gairaigoPracticeData,
    // チャレンジモードのデータは各フックが内部で持つか、別途管理される想定
    // practiceDataMap は主に通常練習モードの headingChars や calculateNextIndices で使用
};