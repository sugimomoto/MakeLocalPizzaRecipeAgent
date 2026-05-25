/**
 * 47 都道府県マスタ (Slice 1 frontend hardcoded)。
 *
 * - design/prototype-app.jsx の PREFS そのまま。8 地域 (沖縄を九州と分けて表示する設計)
 * - curated フラグで「食材データが揃っている県 (agent/data/ingredients.yaml に存在)」を示す
 * - kanji は県名の一文字目 (タイル表示用)
 * - note は代表的な地名・特産の短文 (タイル下部のキャプション)
 *
 * 後続スライス: curated を増やしながら、データ自体は keep 47 件 (UX の地理感が崩れないため)
 */

import type { Region } from '@/domain/locale';

export type PrefectureRegion = Region | 'okinawa';

export type Prefecture = {
  id: string;
  prefecture: string;
  kanji: string;
  region: PrefectureRegion;
  note: string;
  /** ingredients.yaml に対応データがあるか (Slice 1: miyagi/nagano/kochi のみ true) */
  curated: boolean;
};

/** 表示順 (Region は kyushu-okinawa を分割して 9 グループ) */
export const PREFECTURE_REGION_ORDER: PrefectureRegion[] = [
  'hokkaido',
  'tohoku',
  'kanto',
  'chubu',
  'kinki',
  'chugoku',
  'shikoku',
  'kyushu-okinawa',
  'okinawa',
];

export const PREFECTURE_REGION_LABEL: Record<PrefectureRegion, string> = {
  hokkaido: '北海道',
  tohoku: '東北',
  kanto: '関東',
  chubu: '中部',
  kinki: '関西',
  chugoku: '中国',
  shikoku: '四国',
  'kyushu-okinawa': '九州',
  okinawa: '沖縄',
};

// Slice 7 後: 全 47 都道府県分の ingredients.yaml データが揃ったため、すべて curated に。
// 旧来は 3 県 (miyagi/nagano/kochi) のみだった。
const CURATED_IDS = new Set<string>([
  'hokkaido',
  'aomori',
  'iwate',
  'miyagi',
  'akita',
  'yamagata',
  'fukushima',
  'ibaraki',
  'tochigi',
  'gunma',
  'saitama',
  'chiba',
  'tokyo',
  'kanagawa',
  'niigata',
  'toyama',
  'ishikawa',
  'fukui',
  'yamanashi',
  'nagano',
  'gifu',
  'shizuoka',
  'aichi',
  'mie',
  'shiga',
  'kyoto',
  'osaka',
  'hyogo',
  'nara',
  'wakayama',
  'tottori',
  'shimane',
  'okayama',
  'hiroshima',
  'yamaguchi',
  'tokushima',
  'kagawa',
  'ehime',
  'kochi',
  'fukuoka',
  'saga',
  'nagasaki',
  'kumamoto',
  'oita',
  'miyazaki',
  'kagoshima',
  'okinawa',
]);

const RAW: Array<Omit<Prefecture, 'curated'>> = [
  // 北海道
  {
    id: 'hokkaido',
    prefecture: '北海道',
    kanji: '道',
    region: 'hokkaido',
    note: '札幌 / 函館 / 知床',
  },
  // 東北
  { id: 'aomori', prefecture: '青森県', kanji: '青', region: 'tohoku', note: 'りんご / 大間' },
  { id: 'iwate', prefecture: '岩手県', kanji: '岩', region: 'tohoku', note: '前沢 / 三陸' },
  { id: 'miyagi', prefecture: '宮城県', kanji: '宮', region: 'tohoku', note: '仙台 / 松島 / 牡鹿' },
  { id: 'akita', prefecture: '秋田県', kanji: '秋', region: 'tohoku', note: '比内 / 男鹿' },
  {
    id: 'yamagata',
    prefecture: '山形県',
    kanji: '山',
    region: 'tohoku',
    note: '庄内 / さくらんぼ',
  },
  { id: 'fukushima', prefecture: '福島県', kanji: '福', region: 'tohoku', note: '会津 / 浜通り' },
  // 関東
  { id: 'ibaraki', prefecture: '茨城県', kanji: '茨', region: 'kanto', note: '常陸 / 水戸' },
  { id: 'tochigi', prefecture: '栃木県', kanji: '栃', region: 'kanto', note: '宇都宮 / 日光' },
  { id: 'gunma', prefecture: '群馬県', kanji: '群', region: 'kanto', note: '前橋 / 嬬恋' },
  { id: 'saitama', prefecture: '埼玉県', kanji: '埼', region: 'kanto', note: '川越 / 秩父' },
  { id: 'chiba', prefecture: '千葉県', kanji: '千', region: 'kanto', note: '房総 / 銚子' },
  { id: 'tokyo', prefecture: '東京都', kanji: '東', region: 'kanto', note: '23区 / 多摩 / 島嶼' },
  { id: 'kanagawa', prefecture: '神奈川県', kanji: '神', region: 'kanto', note: '横浜 / 三浦' },
  // 中部
  { id: 'niigata', prefecture: '新潟県', kanji: '新', region: 'chubu', note: '魚沼 / 佐渡' },
  { id: 'toyama', prefecture: '富山県', kanji: '富', region: 'chubu', note: '富山湾 / 立山' },
  { id: 'ishikawa', prefecture: '石川県', kanji: '石', region: 'chubu', note: '金沢 / 能登' },
  { id: 'fukui', prefecture: '福井県', kanji: '井', region: 'chubu', note: '若狭 / 越前' },
  { id: 'yamanashi', prefecture: '山梨県', kanji: '梨', region: 'chubu', note: '甲府 / 富士' },
  { id: 'nagano', prefecture: '長野県', kanji: '長', region: 'chubu', note: '信州 / 諏訪' },
  { id: 'gifu', prefecture: '岐阜県', kanji: '岐', region: 'chubu', note: '飛騨 / 美濃' },
  { id: 'shizuoka', prefecture: '静岡県', kanji: '静', region: 'chubu', note: '駿河 / 伊豆' },
  { id: 'aichi', prefecture: '愛知県', kanji: '愛', region: 'chubu', note: '名古屋 / 三河' },
  // 関西
  { id: 'mie', prefecture: '三重県', kanji: '三', region: 'kinki', note: '伊勢 / 志摩' },
  { id: 'shiga', prefecture: '滋賀県', kanji: '滋', region: 'kinki', note: '近江 / 琵琶湖' },
  { id: 'kyoto', prefecture: '京都府', kanji: '京', region: 'kinki', note: '丹波 / 宇治' },
  { id: 'osaka', prefecture: '大阪府', kanji: '阪', region: 'kinki', note: '大阪 / 泉州' },
  { id: 'hyogo', prefecture: '兵庫県', kanji: '兵', region: 'kinki', note: '神戸 / 但馬' },
  { id: 'nara', prefecture: '奈良県', kanji: '奈', region: 'kinki', note: '奈良 / 吉野' },
  { id: 'wakayama', prefecture: '和歌山県', kanji: '和', region: 'kinki', note: '紀州 / 熊野' },
  // 中国
  { id: 'tottori', prefecture: '鳥取県', kanji: '鳥', region: 'chugoku', note: '鳥取 / 大山' },
  { id: 'shimane', prefecture: '島根県', kanji: '島', region: 'chugoku', note: '出雲 / 隠岐' },
  { id: 'okayama', prefecture: '岡山県', kanji: '岡', region: 'chugoku', note: '備前 / 美作' },
  { id: 'hiroshima', prefecture: '広島県', kanji: '広', region: 'chugoku', note: '広島 / 尾道' },
  { id: 'yamaguchi', prefecture: '山口県', kanji: '口', region: 'chugoku', note: '萩 / 下関' },
  // 四国
  { id: 'tokushima', prefecture: '徳島県', kanji: '徳', region: 'shikoku', note: '阿波 / 鳴門' },
  { id: 'kagawa', prefecture: '香川県', kanji: '香', region: 'shikoku', note: '讃岐 / 小豆島' },
  { id: 'ehime', prefecture: '愛媛県', kanji: '媛', region: 'shikoku', note: '松山 / 宇和島' },
  { id: 'kochi', prefecture: '高知県', kanji: '高', region: 'shikoku', note: '土佐 / 室戸' },
  // 九州
  {
    id: 'fukuoka',
    prefecture: '福岡県',
    kanji: '福',
    region: 'kyushu-okinawa',
    note: '博多 / 糸島',
  },
  { id: 'saga', prefecture: '佐賀県', kanji: '佐', region: 'kyushu-okinawa', note: '有明 / 玄海' },
  {
    id: 'nagasaki',
    prefecture: '長崎県',
    kanji: '崎',
    region: 'kyushu-okinawa',
    note: '長崎 / 五島',
  },
  {
    id: 'kumamoto',
    prefecture: '熊本県',
    kanji: '熊',
    region: 'kyushu-okinawa',
    note: '阿蘇 / 天草',
  },
  { id: 'oita', prefecture: '大分県', kanji: '分', region: 'kyushu-okinawa', note: '別府 / 由布' },
  {
    id: 'miyazaki',
    prefecture: '宮崎県',
    kanji: '宮',
    region: 'kyushu-okinawa',
    note: '日向 / 都城',
  },
  {
    id: 'kagoshima',
    prefecture: '鹿児島県',
    kanji: '鹿',
    region: 'kyushu-okinawa',
    note: '薩摩 / 屋久島',
  },
  // 沖縄
  { id: 'okinawa', prefecture: '沖縄県', kanji: '沖', region: 'okinawa', note: '本島 / 八重山' },
];

export const PREFECTURES: readonly Prefecture[] = RAW.map((p) => ({
  ...p,
  curated: CURATED_IDS.has(p.id),
}));

export function findPrefecture(id: string): Prefecture | undefined {
  return PREFECTURES.find((p) => p.id === id);
}

export function groupByRegion(): Array<{ region: PrefectureRegion; items: Prefecture[] }> {
  return PREFECTURE_REGION_ORDER.map((r) => ({
    region: r,
    items: PREFECTURES.filter((p) => p.region === r),
  }));
}
