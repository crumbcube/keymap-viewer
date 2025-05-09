// 必要なものだけ読み込む
export const practiceMenuItems = ['清音の基本練習'];

export const sampleJson = {
  'tw-20v': {
    right: {
      layers: [[], [], ['ら行', 'た行', 'さ行', 'か行', 'あ行'], ['お段', 'え段', 'う段', 'い段', 'あ段']],
    },
    left: {
      layers: [[], [], ['わ行', 'や行', 'ま行', 'は行', 'な行'], ['あ段', 'う段', 'お段']],
    },
  },
  'tw-20h': {
    right: {
      layers: [[], [], ['あ行', 'か行', 'さ行', 'た行', 'な行'], ['あ段', 'い段', 'う段', 'え段', 'お段']],
    },
    left: {
      layers: [[], [], ['は行', 'ま行', 'や行', 'ら行', 'わ行'], ['あ段', 'う段', 'お段']],
    },
  },
};

export const layerNames = [
  'Default Layer',
  'Shifted Layer',
  'Kana Start',
  'Kana End',
];
