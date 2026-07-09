// Beautia · 가이드 아티클 — /guide/<slug>  (vercel.json rewrite)
// 목적: 검색엔진·심사자가 색인할 "고유하고 유용한 콘텐츠". 시술 가이드 + 내부링크 + 구조화 데이터.
const SITE = 'https://beautia.io';
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const jsonld = o => JSON.stringify(o).replace(/</g, '\\u003c');

// ── 콘텐츠 ────────────────────────────────────────────────
const GUIDES = {
  'eyebrow-semi-permanent': {
    title: '눈썹 반영구, 처음이라면 꼭 알아야 할 7가지',
    desc: '엠보·콤보·수지 차이부터 디자인 고르는 법, 회복 과정, 주의사항까지. 눈썹 반영구를 처음 받기 전에 알아야 할 모든 것.',
    cat: 'Makeup', catLabel: '반영구·메이크업', cover: `${SITE}/og-cover.png`, read: 6, updated: '2026-07-07',
    body: `
<p>눈썹 반영구(반영구 메이크업)는 얼굴 인상을 가장 크게 바꾸는 시술 중 하나입니다. 한 번 받으면 1~3년 유지되기 때문에, 시술 전에 <strong>기법·디자인·회복 과정</strong>을 제대로 이해하고 디자이너를 고르는 것이 중요합니다.</p>
<h2>1. 엠보 · 콤보 · 수지, 뭐가 다를까</h2>
<p><strong>엠보(자연 결)</strong>는 한 올 한 올 결을 그려 넣어 눈썹 숱이 부족한 사람에게 자연스럽습니다. <strong>수지(섀도우)</strong>는 파우더로 채운 듯 은은한 화장 느낌을 냅니다. <strong>콤보</strong>는 앞머리는 결, 뒤는 섀도우로 채워 가장 입체적입니다. 피부 타입(지성일수록 결이 잘 안 남음)과 원하는 무드에 따라 달라지므로, 디자이너와 상담해 결정하세요.</p>
<h2>2. 디자인은 "얼굴형에 맞춰서"</h2>
<p>유행하는 일자눈썹·아치눈썹을 그대로 따라가기보다, 눈·코 위치와 얼굴형에 맞춘 디자인이 오래 예쁩니다. 상담 때 <strong>가상 디자인(스케치)을 먼저 그려보고 대칭·높이·길이를 눈으로 확인</strong>한 뒤 시술에 들어가는 곳이 좋습니다.</p>
<h2>3. 색은 시간이 지나며 옅어진다</h2>
<p>시술 직후 2~3일은 진하고 두껍게 보입니다. 각질이 떨어지며 <strong>실제 색의 60~70%로 정착</strong>하니, 처음 진한 색에 놀라지 마세요. 웜톤/쿨톤에 맞는 색소를 써야 시간이 지나도 붉거나 푸르게 변색되지 않습니다.</p>
<h2>4. 회복 과정 (1주일)</h2>
<ul>
<li><strong>1~3일</strong>: 진하고 살짝 부어 보임. 물 닿는 것 최소화.</li>
<li><strong>4~7일</strong>: 각질(딱지)이 자연스럽게 떨어짐 — <strong>절대 뜯지 말 것</strong>.</li>
<li><strong>2~4주</strong>: 색이 옅어졌다가 다시 올라오며 정착. 이때 리터치.</li>
</ul>
<h2>5. 리터치는 보통 포함</h2>
<p>대부분의 시술은 4~6주 뒤 <strong>1회 리터치</strong>가 기본 포함입니다. 첫 시술에서 정착이 덜 된 부분을 채우는 과정이라 꼭 받는 게 좋습니다. 예약 전에 리터치 포함 여부를 확인하세요.</p>
<h2>6. 이런 경우엔 시술을 미루세요</h2>
<p>임신·수유 중, 켈로이드 체질, 시술 부위 트러블, 당뇨·항응고제 복용 중이라면 전문의·디자이너와 상담이 필요합니다.</p>
<h2>7. 디자이너 고르는 기준</h2>
<p>가장 확실한 방법은 <strong>실제 작업 포트폴리오와 비포/애프터</strong>를 보는 것입니다. 후기 사진 몇 장이 아니라, 나와 비슷한 눈썹·얼굴형의 결과물이 꾸준한지 확인하세요. Beautia에서는 디자이너의 실제 포트폴리오와 전/후를 보고 바로 예약·문의할 수 있습니다.</p>`,
    faq: [
      ['눈썹 반영구는 얼마나 유지되나요?', '기법·피부 타입·관리에 따라 보통 1~3년 유지됩니다. 지성 피부일수록 색이 빨리 옅어지는 경향이 있어 주기적인 리터치로 유지합니다.'],
      ['아프나요?', '마취 크림을 사용해 대부분 견딜 만한 수준입니다. 통증 민감도에 따라 다르며, 결(엠보) 기법이 섀도우보다 자극이 조금 더 있을 수 있습니다.'],
      ['시술 후 언제부터 세수·화장이 가능한가요?', '각질이 다 떨어지는 약 1주일 후부터 눈썹 부위 화장이 가능합니다. 그 전에는 물·땀·자외선을 최소화하세요.'],
    ],
  },
  'eyelash-extension-vs-perm': {
    title: '속눈썹 연장 vs 속눈썹 펌, 나에게 맞는 건?',
    desc: '속눈썹 연장과 펌의 차이, 유지 기간, 관리법, 비용 감각까지 한눈에 비교. 눈매와 라이프스타일에 맞는 선택 가이드.',
    cat: 'Lash', catLabel: '속눈썹', cover: `${SITE}/og-cover.png`, read: 5, updated: '2026-07-07',
    body: `
<p>또렷한 눈매를 원할 때 가장 많이 고민하는 두 가지, <strong>속눈썹 연장</strong>과 <strong>속눈썹 펌</strong>. 결과와 관리가 꽤 다르기 때문에, 내 속눈썹 상태와 라이프스타일에 맞춰 고르는 게 좋습니다.</p>
<h2>속눈썹 연장 — "길이·풍성함을 더한다"</h2>
<p>내 속눈썹 한 올에 인조모를 붙여 길이와 볼륨을 만듭니다. 자연스러운 <strong>내추럴</strong>부터 화려한 <strong>볼륨(러시안)</strong>까지 연출 폭이 넓습니다. 붙이자마자 효과가 확실해 눈 화장을 거의 생략할 수 있습니다.</p>
<ul><li>유지: 3~4주 (리필로 연장)</li><li>주의: 기름기·비비지 않기, 클렌징은 오일프리</li><li>추천: 속눈썹이 짧거나 숱이 적은 사람, 화장 시간을 줄이고 싶은 사람</li></ul>
<h2>속눈썹 펌 — "내 속눈썹을 올린다"</h2>
<p>인조모 없이 <strong>내 속눈썹을 컬링</strong>해 또렷하게 만듭니다. 처진 눈, 아래로 뻗은 속눈썹에 특히 효과적이고, 마스카라만 발라도 예쁘게 올라갑니다. 인조모 무게가 없어 부담이 적습니다.</p>
<ul><li>유지: 6~8주 (자연 탈락 주기 따라)</li><li>주의: 시술 당일 물·마스카라 피하기</li><li>추천: 속눈썹 숱은 있는데 방향/컬이 아쉬운 사람, 자연스러움을 원하는 사람</li></ul>
<h2>한눈 비교</h2>
<p>화려함·확실한 효과를 원하면 <strong>연장</strong>, 내 속눈썹을 살린 자연스러움·낮은 관리 부담을 원하면 <strong>펌</strong>이 유리합니다. 눈매 교정 효과는 펌이, 볼륨 연출은 연장이 강합니다.</p>
<h2>실패 없이 받으려면</h2>
<p>가장 중요한 건 <strong>위생과 시술자의 숙련도</strong>입니다. 접착제·소독, 시술 후 눈 자극 여부는 디자이너 실력에 크게 좌우됩니다. 실제 작업 포트폴리오와 후기를 확인하고, 눈매가 비슷한 결과물이 있는 디자이너를 고르세요. Beautia에서 속눈썹 디자이너의 포트폴리오를 보고 바로 예약할 수 있습니다.</p>`,
    faq: [
      ['연장과 펌을 같이 할 수 있나요?', '일반적으로는 하나를 권합니다. 펌 후 연장을 하면 컬이 겹쳐 부자연스럽거나 모근에 부담이 될 수 있어, 디자이너와 상담해 결정하세요.'],
      ['속눈썹이 상하지 않나요?', '올바른 시술·관리라면 큰 손상은 없습니다. 다만 과한 무게의 연장이나 자주 비비는 습관은 자연모 탈락을 앞당길 수 있습니다.'],
    ],
  },
  'gel-nail-long-lasting': {
    title: '젤네일 오래 가게 하는 법 — 들뜸·깨짐 막는 관리 팁',
    desc: '젤네일이 금방 들뜨는 이유와, 2주 이상 예쁘게 유지하는 실전 관리법. 큐티클·핸드크림·생활 습관까지.',
    cat: 'Nail', catLabel: '네일', cover: `${SITE}/og-cover.png`, read: 4, updated: '2026-07-07',
    body: `
<p>예쁘게 받은 젤네일이 며칠 만에 들뜨면 속상하죠. 유지력은 시술 실력도 크지만, <strong>일상 관리 습관</strong>이 절반을 차지합니다. 오래 가는 젤네일을 위한 핵심만 정리했습니다.</p>
<h2>왜 금방 들뜰까</h2>
<p>대부분 <strong>전처리 부족</strong>(유분·수분 제거)이나 <strong>큐티클 라인 마감</strong> 문제, 그리고 시술 후 <strong>손을 물·열에 자주 노출</strong>하는 습관 때문입니다.</p>
<h2>유지력을 높이는 5가지</h2>
<ul>
<li><strong>당일은 물 최소화</strong> — 시술 후 몇 시간은 젤이 완전히 안정되는 시간.</li>
<li><strong>설거지·청소 땐 장갑</strong> — 뜨거운 물과 세제가 들뜸의 최대 원인.</li>
<li><strong>손톱을 도구처럼 쓰지 않기</strong> — 캔·스티커를 손톱 끝으로 뜯으면 프리엣지부터 깨짐.</li>
<li><strong>큐티클 오일·핸드크림</strong> — 건조하면 손톱이 수축·팽창하며 들뜸. 자기 전 발라주세요.</li>
<li><strong>제때 제거·리필</strong> — 들뜬 채 방치하면 그 틈으로 습기가 들어가 손톱 건강에 안 좋습니다.</li>
</ul>
<h2>손톱이 얇고 잘 부러진다면</h2>
<p>젤 제거를 <strong>셀프로 뜯지 마세요</strong> — 손톱 표면이 함께 떨어져 얇아집니다. 아세톤 불림이나 샵 제거를 이용하고, 시술 사이에 손톱 강화(하드너)·휴식기를 두면 좋습니다.</p>
<h2>디자인은 실제 작업으로 확인</h2>
<p>같은 "그라데이션"도 디자이너마다 결과가 다릅니다. 원하는 무드(시럽, 프렌치, 아트)의 <strong>실제 포트폴리오</strong>를 보고 고르면 실패가 적습니다. Beautia에서 네일 디자이너의 작업을 보고 바로 예약하세요.</p>`,
    faq: [
      ['젤네일은 보통 얼마나 유지되나요?', '관리에 따라 2~4주입니다. 손을 물에 자주 담그는 직업이라면 유지가 짧아질 수 있어 리필 주기를 조절하세요.'],
      ['셀프로 제거해도 되나요?', '권하지 않습니다. 무리하게 뜯으면 손톱 표면이 함께 벗겨져 얇아지고 갈라집니다. 아세톤 불림 또는 샵 제거가 안전합니다.'],
    ],
  },
  'bridal-beauty-checklist': {
    title: '신부 메이크업·헤어 준비 체크리스트 (D-60 ~ 당일)',
    desc: '웨딩 두 달 전부터 결혼식 당일까지, 신부 메이크업·헤어를 실패 없이 준비하는 일정과 체크포인트.',
    cat: 'Bridal', catLabel: '웨딩·신부', cover: `${SITE}/og-cover.png`, read: 6, updated: '2026-07-07',
    body: `
<p>인생에서 가장 많이 보게 될 사진, 웨딩. 신부 메이크업·헤어는 <strong>미리 준비할수록 당일 여유</strong>가 생깁니다. 두 달 전부터의 체크리스트로 정리했습니다.</p>
<h2>D-60 ~ D-45 · 디자이너 찾기</h2>
<p>인기 디자이너는 성수기 주말이 빨리 마감됩니다. 웜톤/쿨톤, 원하는 무드(청순·화려·내추럴)에 맞는 <strong>실제 웨딩 포트폴리오</strong>를 보고 후보를 좁히세요. 본식 스타일(반업/올림머리) 예시가 있는지 확인.</p>
<h2>D-30 · 리허설(가봉) 메이크업</h2>
<p>드레스·부케 톤에 맞춰 리허설을 받고, <strong>사진으로 조명 아래 발색</strong>을 확인합니다. 아이·립 컬러, 속눈썹 밀도, 헤어 볼륨을 이때 조율해 두면 당일 헤매지 않습니다.</p>
<h2>D-14 · 피부·눈썹 컨디션</h2>
<ul><li>새로운 시술(강한 필링·왁싱)은 이 시기 이후 피하기 — 트러블 리스크.</li><li>눈썹 반영구가 필요하면 최소 3~4주 전에 끝내 정착·리터치까지 완료.</li><li>충분한 수분·수면으로 피부 결 관리.</li></ul>
<h2>D-1 ~ 당일</h2>
<ul><li>전날 과음·짠 음식 피하기(부기).</li><li>당일 아침 세안 후 보습만, 기초는 디자이너 지시 따르기.</li><li>수정 화장 키트(립·블롯페이퍼)와 헤어핀 여분 준비.</li></ul>
<h2>후회 없는 선택의 핵심</h2>
<p>웨딩은 리허설로 미리 맞춰볼 수 있는 몇 안 되는 시술입니다. <strong>포트폴리오가 내 취향과 맞고, 소통이 잘 되는</strong> 디자이너를 고르는 게 가장 중요합니다. Beautia에서 웨딩·신부 전문 디자이너의 작업을 보고 상담·예약하세요.</p>`,
    faq: [
      ['리허설 메이크업은 꼭 받아야 하나요?', '강력히 권합니다. 당일 원하는 무드와 실제 결과의 차이를 미리 좁힐 수 있고, 사진 발색·지속력을 확인할 수 있습니다.'],
      ['눈썹 반영구는 결혼식 얼마 전에 받아야 하나요?', '정착과 리터치까지 고려해 최소 결혼식 3~4주 전에 마치는 것이 안전합니다. 시술 직후의 진한 색·각질기를 피할 수 있습니다.'],
    ],
  },
  'find-korean-speaking-salon-japan': {
    title: '일본에서 한국어 되는 미용실·뷰티샵 찾는 법',
    desc: '일본 여행·거주 중 한국어로 상담 가능한 헤어·네일·속눈썹 샵을 찾는 실전 방법과, 예약 전 확인할 것들.',
    cat: '', catLabel: '가이드', cover: `${SITE}/og-cover.png`, read: 5, updated: '2026-07-07',
    body: `
<p>일본에서 미용실이나 네일·속눈썹 샵을 가고 싶은데 <strong>언어 때문에 망설여진다면</strong>, 생각보다 방법이 많습니다. 원하는 스타일을 정확히 전달하는 것이 만족도의 핵심이라, 한국어(또는 사진) 소통이 되는 곳을 찾는 게 중요합니다.</p>
<h2>1. "한국어 가능" 디자이너를 먼저 찾기</h2>
<p>도쿄·오사카에는 한국인 디자이너나 한국어 상담이 가능한 샵이 꽤 있습니다. 그냥 샵이 아니라 <strong>"누가" 해주는지</strong>를 기준으로 찾으면 실패가 적습니다. Beautia는 디자이너별로 언어(한국어 OK)와 실제 포트폴리오를 함께 보여줘, 소통 가능한 사람을 바로 찾을 수 있습니다.</p>
<h2>2. 예약 전 사진으로 스타일 합의</h2>
<p>말이 완벽하지 않아도, <strong>원하는 컷·컬러·네일 디자인 사진</strong>을 미리 공유하면 결과가 크게 달라집니다. 포트폴리오에서 마음에 드는 작업을 저장해 "이렇게 해주세요"로 전달하세요.</p>
<h2>3. 예약 방법 확인</h2>
<p>일본은 <strong>핫페퍼뷰티·LINE 예약</strong>이 흔합니다. 워크인(당일)보다 예약이 확실하고, LINE으로 사전 상담이 되는 곳이면 언어 부담이 줄어듭니다. 예약 링크·연락 수단을 미리 확인하세요.</p>
<h2>4. 가격·소요 시간 미리 파악</h2>
<p>시술별 가격과 소요 시간을 예약 전에 확인하면 당일 당황하지 않습니다. 메뉴가 공개된 디자이너를 고르세요.</p>
<h2>정리</h2>
<p>핵심은 <strong>"작업을 먼저 보고, 소통 되는 디자이너를 고르는 것"</strong>입니다. Beautia는 일본을 포함한 전 세계 뷰티 디자이너의 실제 작업과 언어·위치·예약 링크를 한 곳에서 보여줍니다. 원하는 스타일의 디자이너를 찾아 바로 문의해 보세요.</p>`,
    faq: [
      ['일본 미용실은 워크인(예약 없이)도 되나요?', '가능한 곳도 있지만, 인기 디자이너나 주말은 예약이 안전합니다. 핫페퍼뷰티·LINE 예약이 일반적입니다.'],
      ['한국어가 안 통하면 어떻게 하나요?', '원하는 스타일 사진을 미리 공유하는 것이 가장 확실합니다. 번역앱과 사진을 함께 쓰면 대부분의 소통이 해결됩니다.'],
    ],
  },
};

const ORDER = ['eyebrow-semi-permanent', 'eyelash-extension-vs-perm', 'gel-nail-long-lasting', 'bridal-beauty-checklist', 'find-korean-speaking-salon-japan'];

function relatedLinks(slug) {
  return ORDER.filter(s => s !== slug).slice(0, 3).map(s =>
    `<a class="rel" href="/guide/${s}"><span>${esc(GUIDES[s].catLabel || '가이드')}</span>${esc(GUIDES[s].title)}</a>`).join('');
}

export default async function handler(req, res) {
  const slug = (req.query && req.query.slug || '').toString().toLowerCase();
  const g = GUIDES[slug];
  if (!g) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page404()); return; }

  const canon = `${SITE}/guide/${slug}`;
  const catQ = g.cat ? `/community?cat=${encodeURIComponent(g.cat)}` : '/community';
  const bc = [
    { '@type': 'ListItem', position: 1, name: 'Beautia', item: SITE + '/community' },
    { '@type': 'ListItem', position: 2, name: '가이드', item: SITE + '/guides' },
    { '@type': 'ListItem', position: 3, name: g.title, item: canon },
  ];
  const ld = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', '@id': canon + '#article', headline: g.title, description: g.desc, image: g.cover,
        datePublished: g.updated, dateModified: g.updated, inLanguage: 'ko',
        author: { '@type': 'Organization', name: 'Beautia' }, publisher: { '@type': 'Organization', name: 'Beautia', logo: { '@type': 'ImageObject', url: SITE + '/logo-mark.png' } },
        mainEntityOfPage: canon, articleSection: g.catLabel },
      { '@type': 'BreadcrumbList', itemListElement: bc },
      g.faq && g.faq.length ? { '@type': 'FAQPage', mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) } : null,
    ].filter(Boolean),
  };
  const faqHtml = (g.faq && g.faq.length) ? `<h2 class="faqh">자주 묻는 질문</h2>${g.faq.map(([q, a]) => `<div class="faq"><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('')}` : '';

  const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(g.title)} | Beautia 가이드</title>
<meta name="description" content="${esc(g.desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Beautia">
<meta property="og:title" content="${esc(g.title)}"><meta property="og:description" content="${esc(g.desc)}">
<meta property="og:url" content="${esc(canon)}"><meta property="og:image" content="${esc(g.cover)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(g.title)}"><meta name="twitter:description" content="${esc(g.desc)}"><meta name="twitter:image" content="${esc(g.cover)}">
<link rel="icon" href="/favicon.png" type="image/png"><meta name="theme-color" content="#6E4A50">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500&display=swap">
<script type="application/ld+json">${jsonld(ld)}</script>
<style>
:root{--plum:#6E4A50;--mauve:#B5828C;--gold:#EBC98C;--cream:#F7F2F1;--ink:#1C1418;--sub:#7a6f73;--line:#ece6e4}
*{box-sizing:border-box;margin:0}body{font-family:Pretendard,system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.7;-webkit-font-smoothing:antialiased}
header.top{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);z-index:5}
.wrap{max-width:720px;margin:0 auto;padding:0 20px}
.top .wrap{display:flex;align-items:center;gap:9px;height:58px}
.top img{height:30px}.top b{font-family:Fraunces,serif;font-style:italic;font-size:22px;color:var(--plum);font-weight:500}
.crumb{font-size:12.5px;color:var(--sub);margin:22px 0 6px}.crumb a{color:var(--sub);text-decoration:none}
.cat{display:inline-block;font-size:12px;font-weight:800;color:var(--plum);background:#f5e9ec;padding:5px 12px;border-radius:999px;letter-spacing:.02em}
h1{font-size:30px;font-weight:800;letter-spacing:-.03em;margin:14px 0 10px;line-height:1.25;word-break:keep-all}
.meta{font-size:13px;color:var(--sub);margin-bottom:26px;padding-bottom:22px;border-bottom:1px solid var(--line)}
article h2{font-size:21px;font-weight:800;letter-spacing:-.02em;margin:34px 0 10px;word-break:keep-all}
article p{margin:12px 0;font-size:16px;color:#2b2226;word-break:keep-all}
article ul{margin:12px 0;padding-left:20px}article li{margin:7px 0;font-size:16px;color:#2b2226;word-break:keep-all}
article strong{color:var(--plum)}
.cta{margin:34px 0;padding:22px;background:var(--cream);border-radius:18px;text-align:center}
.cta p{font-size:15px;color:#4a3d41;margin:0 0 14px}
.cta a{display:inline-flex;align-items:center;gap:7px;background:var(--plum);color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:13px 26px;border-radius:999px}
.faqh{font-size:21px;font-weight:800;margin:38px 0 6px}
.faq{border-top:1px solid var(--line);padding:16px 0}.faq h3{font-size:16px;font-weight:800;margin-bottom:6px}.faq p{font-size:15px;color:#4a3d41;margin:0}
.rels{margin:40px 0 20px}.rels h2{font-size:18px;font-weight:800;margin-bottom:12px}
.rel{display:block;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:10px;font-weight:700;font-size:15.5px;word-break:keep-all}
.rel span{display:block;font-size:12px;color:var(--plum);font-weight:800;margin-bottom:3px}
footer{border-top:1px solid var(--line);margin-top:30px;padding:26px 0;font-size:12.5px;color:var(--sub)}
footer a{color:var(--sub);text-decoration:none;margin-right:14px}
</style></head><body>
<header class="top"><div class="wrap"><a href="/community" style="display:flex;align-items:center;gap:9px;text-decoration:none"><img src="/logo-mark.png" alt="Beautia"><b>Beautia</b></a></div></header>
<div class="wrap">
<div class="crumb"><a href="/community">Beautia</a> › <a href="/guides">가이드</a></div>
<span class="cat">${esc(g.catLabel || '가이드')}</span>
<h1>${esc(g.title)}</h1>
<div class="meta">약 ${g.read}분 읽기 · 업데이트 ${esc(g.updated)}</div>
<article>${g.body}
<div class="cta"><p>내 스타일을 아는 디자이너를 찾고 있나요?<br>실제 작업을 보고 바로 예약·문의하세요.</p><a href="${esc(catQ)}">디자이너 둘러보기 →</a></div>
${faqHtml}
</article>
<div class="rels"><h2>이어서 읽기</h2>${relatedLinks(slug)}</div>
</div>
<footer><div class="wrap"><a href="/community">홈</a><a href="/guides">가이드</a><a href="/terms">이용약관</a><a href="/privacy">개인정보</a><div style="margin-top:10px">© Beautia · beauty designers, worldwide.</div></div></footer>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).end(html);
}

function page404() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>가이드를 찾을 수 없어요 - Beautia</title><meta name="robots" content="noindex"></head><body style="font-family:Pretendard,sans-serif;text-align:center;padding:80px 20px"><h1 style="font-size:22px">가이드를 찾을 수 없어요</h1><a style="margin-top:20px;display:inline-block;color:#6E4A50;font-weight:700" href="/guides">가이드 전체 보기 →</a></body></html>`;
}

export { GUIDES, ORDER };
