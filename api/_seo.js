// Beautia · 검색 최적화 공용 모듈 (api/_ 접두사 = 라우트 아님, import 전용)
//
// 왜 있나: 디자이너 도착지 페이지가 구글에 하나도 안 잡히고 있었다. 원인 세 가지였고
// 이 파일이 그 중 두 개를 담당한다.
//   1) 주소가 /d/52ef9f07-6eb1-46b7-9871-7f4ece43ebd7 라 무슨 페이지인지 알 수가 없었다
//      → makeSlug()로 /d/seoul-hair-blesshair 처럼 검색어가 들어간 주소를 만든다.
//   2) 제목이 "더필뷰티 · Lash · Yongin" 이었다. 외국인은 "더필뷰티"를 검색하지 않는다
//      → seoTitle()로 영어 검색어를 앞에 세운다.
// (세 번째 원인인 "내부 링크 없음"은 /designers 허브 페이지가 담당한다.)

export const CATMAP_EN = {
  '속눈썹': 'Lash', '속눈썹펌': 'Lash perm', '래쉬': 'Lash', '래쉬리프트': 'Lash lift',
  '네일': 'Nail', '젤네일': 'Gel nail', '네일아트': 'Nail art',
  '헤어': 'Hair', '헤어컷': 'Hair', '펌': 'Perm', '염색': 'Color', '케라틴': 'Keratin',
  '메이크업': 'Makeup', '메이크': 'Makeup', '브라이덜': 'Bridal',
  '스킨': 'Skin', '피부': 'Skin', '스킨케어': 'Skin care',
  '왁싱': 'Waxing', '타투': 'Tattoo', '문신': 'Tattoo', '레터링': 'Lettering tattoo',
  '반영구 메이크업': 'Semi-permanent makeup', '반영구메이크업': 'Semi-permanent makeup',
  '반영구 눈썹': 'Semi-permanent brows', '반영구눈썹': 'Semi-permanent brows',
  '남자 눈썹': "Men's brows", '브로우': 'Brows', '눈썹': 'Brows',
};

export const CITYMAP_EN = {
  '서울': 'Seoul', '부산': 'Busan', '대구': 'Daegu', '인천': 'Incheon', '광주': 'Gwangju',
  '광명': 'Gwangmyeong', '김포': 'Gimpo', '분당': 'Bundang', '성남': 'Seongnam',
  '서현': 'Seohyun', '수원': 'Suwon', '용인': 'Yongin', '일산': 'Ilsan', '창원': 'Changwon',
  '청담': 'Cheongdam', '강남': 'Gangnam', '신사': 'Sinsa', '홍대': 'Hongdae', '성수': 'Seongsu',
  '오사카': 'Osaka', '大阪府': 'Osaka', '도쿄': 'Tokyo', '東京': 'Tokyo',
  '교토': 'Kyoto', '후쿠오카': 'Fukuoka',
  '치앙마이': 'Chiang Mai', '방콕': 'Bangkok', '푸켓': 'Phuket', '파타야': 'Pattaya',
};

// 청담·강남은 서울의 동네다. 제목에 "Cheongdam, Seoul" 로 둘 다 넣어야
// "Seoul makeup artist" 검색에도 걸린다.
// 분당→성남, 일산→고양은 행정구역상 맞지만 여기 넣지 않는다. 외국인한테 "Seongnam"은
// 아무 정보가 아니라서, 그 자리엔 나라 이름("Bundang, Korea")이 들어가는 게 낫다.
const PARENT_CITY = {
  Cheongdam: 'Seoul', Gangnam: 'Seoul', Sinsa: 'Seoul', Hongdae: 'Seoul', Seongsu: 'Seoul',
};

export const COUNTRY_EN = {
  KR: 'South Korea', JP: 'Japan', TH: 'Thailand', US: 'United States',
  TW: 'Taiwan', VN: 'Vietnam', SG: 'Singapore', CN: 'China', HK: 'Hong Kong',
};
// 제목엔 짧은 쪽이 낫다 — "in Seoul, Korea" 가 "in Seoul, South Korea" 보다 검색어에 가깝다
const COUNTRY_SHORT = { KR: 'Korea', JP: 'Japan', TH: 'Thailand', US: 'USA' };

// 사람이 실제로 검색하는 말. "Lash" 보다 "Lash Extensions" 로 잡히는 게 많다.
const SEARCH_PHRASE = {
  Lash: 'Lash Extensions', 'Lash perm': 'Lash Perm', 'Lash lift': 'Lash Lift',
  Nail: 'Nail Salon', 'Gel nail': 'Gel Nails', 'Nail art': 'Nail Art',
  Hair: 'Hair Salon', Perm: 'Korean Perm', Color: 'Hair Color', Keratin: 'Keratin Treatment',
  Makeup: 'Makeup Artist', Bridal: 'Bridal Makeup',
  Skin: 'Skin Care', 'Skin care': 'Skin Care', Waxing: 'Waxing',
  Tattoo: 'Tattoo Artist', 'Lettering tattoo': 'Lettering Tattoo',
  'Semi-permanent makeup': 'Semi-Permanent Makeup', 'Semi-permanent brows': 'Semi-Permanent Brows',
  Brows: 'Eyebrow Tattoo', "Men's brows": "Men's Eyebrows",
};

export const engCat = s => CATMAP_EN[String(s || '').trim()] || String(s || '').trim();
export const engCity = s => { s = String(s || '').trim(); return CITYMAP_EN[s] || s; };
export const parentCity = s => PARENT_CITY[engCity(s)] || '';
export const countryEN = c => COUNTRY_EN[String(c || '').trim().toUpperCase()] || '';
export const countryShort = c => {
  const k = String(c || '').trim().toUpperCase();
  return COUNTRY_SHORT[k] || COUNTRY_EN[k] || '';
};

// 첫 전문분야를 검색어로. 없으면 빈 문자열
export const searchPhrase = specs => {
  const first = (Array.isArray(specs) ? specs : []).filter(Boolean)[0];
  if (!first) return '';
  const en = engCat(first);
  return SEARCH_PHRASE[en] || en;
};

// 주소에 쓸 수 있는 형태로. 한글·기호는 버리고 영문 소문자+하이픈만 남긴다
export const slugify = s => String(s || '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // 악센트 제거 (é → e)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-{2,}/g, '-');

const igClean = s => String(s || '').trim()
  .replace(/^@/, '')
  .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
  .replace(/[/?#].*$/, '');

/* 디자이너 한 명의 주소 조각을 만든다.
 *
 * 형태: <도시>-<분야>-<이름>   예) seoul-hair-blesshair, chiang-mai-nail-kornernails
 *
 * 이름 고르는 순서가 중요하다. 상호가 영문이면(STYLELINE) 그게 제일 좋고,
 * 한글이면(더필뷰티) 주소에 쓸 수가 없어서 인스타 핸들로 간다. 둘 다 없으면 id 앞자리.
 * 디자이너 19명 전원이 인스타 핸들을 갖고 있어서 실제로는 여기서 다 해결된다.
 */
export function makeSlug(p) {
  const shop = (p && p.shop) || {};
  // 이미 정해진 주소가 있으면 그걸 쓴다. 이름을 바꿔도 주소가 안 바뀌어야 검색 순위가 안 날아간다.
  if (typeof shop.slug === 'string' && /^[a-z0-9-]{3,}$/.test(shop.slug)) return shop.slug;

  const city = slugify(engCity(p.region || shop.area || ''));
  const cat = slugify(engCat((Array.isArray(shop.specialties) ? shop.specialties : []).filter(Boolean)[0] || ''));

  const nameAscii = slugify(p.nickname || shop.name || '');
  const igAscii = slugify(igClean(shop.insta));
  const who = nameAscii.length >= 3 ? nameAscii
    : igAscii.length >= 3 ? igAscii
    : slugify(String(p.id || '').slice(0, 8));

  return [city, cat, who].filter(Boolean).join('-') || slugify(String(p.id || '').slice(0, 8));
}

/* 검색 결과에 뜨는 제목. 영어 검색어가 맨 앞에 와야 한다.
 * 전:  "더필뷰티 · Lash · Yongin | Beautia"      ← 아무도 검색 안 하는 말이 맨 앞
 * 후:  "Lash Extensions in Yongin, Korea — 더필뷰티 | Beautia"
 */
export function seoTitle({ name, region, shop }) {
  const s = shop || {};
  const phrase = searchPhrase(s.specialties) || 'Beauty Designer';
  const place = placeText(region, s);
  return `${phrase}${place ? ' in ' + place : ''}${name ? ' — ' + name : ''} | Beautia`;
}

// "Cheongdam, Seoul" / "Yongin, Korea" / "Chiang Mai, Thailand"
export function placeText(region, shop) {
  const s = shop || {};
  const city = engCity(region || s.area || '');
  if (!city) return countryShort(s.country);
  const parent = parentCity(region || s.area || '');
  const tail = parent || countryShort(s.country);
  return tail && tail !== city ? `${city}, ${tail}` : city;
}

// 검색 결과 밑에 뜨는 설명문. 우리 차별점(영어로 예약, 실제 작업 사진, 가격)을 넣는다.
export function seoDesc({ name, region, shop }) {
  const s = shop || {};
  const phrase = (searchPhrase(s.specialties) || 'beauty services').toLowerCase();
  const place = placeText(region, s);
  const nWorks = (Array.isArray(s.photos) ? s.photos : []).length;
  const bits = [
    `${name} — ${phrase}${place ? ' in ' + place : ''}.`,
    nWorks ? `See ${nWorks} real portfolio photos${(Array.isArray(s.services) ? s.services : []).length ? ' and prices' : ''}.` : '',
    'Book in English on Beautia.',
  ].filter(Boolean);
  return bits.join(' ').slice(0, 155);
}
