/* Beautia — 지역×시술 정보·후기 페이지 생성기 (SEO/AEO 자산) */
const fs = require('fs');
const path = require('path');

const SITE = 'https://beautia.io';
const SB_URL = 'https://pzbxcktaljhesrfnqwzq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Ynhja3RhbGpoZXNyZm5xd3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1MjYsImV4cCI6MjA4Mzc0MzUyNn0.aUZbTgfWbjEISNr1-cu9YJnOGj1lzjXeRVifHygAplc';
const RATE = 9.3; // ¥1 ≈ 9.3원 (엔저)

const AREAS = [
 {slug:'tokyo', ko:'도쿄', ja:'東京', region:'도쿄'},
 {slug:'shinjuku', ko:'신주쿠', ja:'新宿', region:'도쿄'},
 {slug:'shibuya', ko:'시부야', ja:'渋谷', region:'도쿄'},
 {slug:'ginza', ko:'긴자', ja:'銀座', region:'도쿄'},
 {slug:'osaka', ko:'오사카', ja:'大阪', region:'오사카'},
 {slug:'shinsaibashi', ko:'신사이바시', ja:'心斎橋', region:'오사카'},
 {slug:'namba', ko:'난바', ja:'難波', region:'오사카'},
 {slug:'kyoto', ko:'교토', ja:'京都', region:'교토'},
 {slug:'fukuoka', ko:'후쿠오카', ja:'福岡', region:'후쿠오카'},
 {slug:'sapporo', ko:'삿포로', ja:'札幌', region:'삿포로'},
 {slug:'nagoya', ko:'나고야', ja:'名古屋', region:'나고야'},
];

const SERVICES = [
 {slug:'nail', ko:'네일', ja:'ネイル', tag:'네일',
  intro:(A)=>`${A}에서 젤네일·아트·연장을 받으려는 한국인이 빠르게 늘고 있어요. 엔저로 가격 부담이 줄었고, 일본 특유의 섬세한 아트 퀄리티가 매력이죠. 다만 <b>일본어 메뉴와 디자인 소통</b>이 가장 큰 장벽인데, 이 페이지에서 ${A} 네일 가격·예약 방법·실제 후기를 한국어로 정리했어요.`,
  price:[['젤네일 원컬러',4000,7000],['젤네일 아트',7000,13000],['연장(스컬프)',10000,18000],['제거(오프)',1500,3000]],
  tips:['원하는 디자인 <b>사진을 미리 준비</b>하면 일본어를 못해도 거의 그대로 재현돼요.','일본은 <b>팁 문화가 없어</b> 표시 가격이 곧 결제 금액입니다.','예약 없이 워크인은 어려운 편 — 인기 샵은 최소 2~3일 전 예약 권장.'],
  faqs:(A,AJ)=>[
   [`${A} 네일샵, 일본어 못해도 예약할 수 있나요?`,`네. Beautia에 한국어로 신청하시면 ${A}(${AJ})의 검증된 네일샵에 일본어로 예약하고 원하는 디자인·길이까지 통역해 전달해드려요. 예약 대행은 무료입니다.`],
   [`${A} 네일 가격이 한국보다 싼가요?`,`시술에 따라 달라요. 엔저 영향으로 젤네일 원컬러·심플 아트는 한국과 비슷하거나 저렴한 경우가 많고, 복잡한 아트는 디자인 난이도에 따라 달라집니다. 아래 가격표를 참고하세요.`],
   [`디자인은 어떻게 전달하나요?`,`핀터레스트·인스타 캡처 등 원하는 사진을 주시면 Beautia가 일본어 디테일(길이·컬러·아트)까지 정리해 샵에 전달합니다.`],
   [`한국어가 되는 ${A} 네일샵이 있나요?`,`일부 매장은 한국어 메뉴를 갖추고 있고, 안 되는 곳도 Beautia가 통역으로 커버하니 어디든 안심하고 예약할 수 있어요.`],
  ]},
 {slug:'hair', ko:'미용실', ja:'美容室', tag:'헤어',
  intro:(A)=>`${A} 미용실은 컷·펌·염색은 물론 <b>다운펌·매직·뿌리염색</b>까지 한국인 수요가 많아요. 문제는 "다운펌" 같은 한국식 용어가 일본에서 그대로 통하지 않는다는 점. 이 페이지에서 ${A} 미용실 가격·예약 팁·후기를 한국어로 모았어요.`,
  price:[['컷',4000,8000],['펌',10000,20000],['염색(전체)',8000,16000],['다운펌/매직',12000,25000]],
  tips:['"다운펌·셋팅펌·매직"은 일본 용어가 달라요 — <b>원하는 결과 사진</b>이 가장 정확합니다.','강한 펌은 출국 직전보다 미리, <b>뿌리염색</b>은 여행 전 받고 가면 현지에서 편해요.','지점·디자이너 지명에 따라 요금이 올라갈 수 있어요(지명료).'],
  faqs:(A,AJ)=>[
   [`${A} 미용실, 일본어 못해도 괜찮을까요?`,`네. Beautia에 한국어로 신청하시면 ${A}(${AJ}) 미용실에 일본어로 예약하고 기장·컬·톤까지 통역해 전달해요. 예약 대행은 무료입니다.`],
   [`다운펌·매직도 일본에서 되나요?`,`가능합니다. 다만 용어가 달라 사진 전달이 중요해요. Beautia가 원하는 스타일을 일본어로 정확히 풀어 전달합니다.`],
   [`${A} 미용실 가격은 어느 정도예요?`,`컷 ¥4,000~8,000, 펌 ¥10,000~20,000 선이 일반적이에요. 엔저라 한국과 비슷하거나 저렴할 수 있어요. 아래 표를 참고하세요.`],
   [`한국어 가능한 ${A} 미용실이 있나요?`,`한국어 응대가 되는 곳도 있고, 안 되는 곳은 Beautia 통역으로 커버하니 걱정 없어요.`],
  ]},
 {slug:'eyelash', ko:'속눈썹', ja:'まつげ', tag:'속눈썹',
  intro:(A)=>`${A}의 속눈썹 연장·볼륨래시·라쉬리프트(속눈썹 펌)는 자연스러운 디자인과 합리적 가격으로 인기예요. 여행 중 짧게 받기 좋은 시술이라 ${A} 일정에 끼워 넣는 분이 많아요. 가격·예약·후기를 한국어로 정리했습니다.`,
  price:[['속눈썹 연장(80~100본)',4000,7000],['볼륨래시',6000,10000],['라쉬리프트(펌)',5000,8000],['리터치',3000,5000]],
  tips:['시술 시간이 길지 않아 <b>여행 일정 사이</b>에 넣기 좋아요.','원하는 길이·컬(C/D)·볼륨 정도를 사진으로 준비하세요.','시술 후 몇 시간은 세안 주의 — 일정 마지막에 받는 것도 방법.'],
  faqs:(A,AJ)=>[
   [`${A} 속눈썹샵, 일본어 못해도 예약되나요?`,`네. Beautia가 ${A}(${AJ}) 속눈썹샵에 한국어 신청을 받아 일본어로 예약·통역해드려요. 예약 대행 무료입니다.`],
   [`연장과 라쉬리프트 중 뭐가 좋아요?`,`풍성함을 원하면 연장/볼륨래시, 내 속눈썹을 살려 자연스럽게 올리고 싶으면 라쉬리프트가 좋아요. 상담 내용도 통역해드립니다.`],
   [`${A} 속눈썹 가격은요?`,`연장 ¥4,000~7,000, 볼륨래시 ¥6,000~10,000 선이에요. 아래 가격표를 확인하세요.`],
   [`디자인은 어떻게 전달하나요?`,`원하는 길이·컬·볼륨 사진을 주시면 Beautia가 일본어로 정리해 전달합니다.`],
  ]},
 {slug:'waxing', ko:'왁싱', ja:'脱毛・ワックス', tag:'제모',
  intro:(A)=>`${A}에서 브라질리언·바디 왁싱을 받으려는 한국인도 늘고 있어요. 위생과 시술 숙련도가 중요한 만큼 <b>검증된 매장</b>과 정확한 예약이 핵심이에요. ${A} 왁싱 가격·예약·후기를 한국어로 모았습니다.`,
  price:[['브라질리언',5000,9000],['겨드랑이',2000,4000],['다리(전체)',6000,12000],['전신 1회',15000,30000]],
  tips:['위생·1회용 사용 여부가 중요 — Beautia가 검증된 매장 위주로 안내해요.','시술 전후 주의사항(각질·보습)을 통역으로 함께 전달해드려요.','민감 부위는 예약 시 원하는 범위를 명확히 전달하는 게 좋아요.'],
  faqs:(A,AJ)=>[
   [`${A} 왁싱샵, 일본어 못해도 괜찮나요?`,`네. Beautia가 ${A}(${AJ}) 왁싱샵에 한국어 신청을 받아 일본어로 예약·통역해드려요. 예약 대행 무료입니다.`],
   [`위생이 걱정돼요.`,`Beautia는 후기·위생 기준을 고려해 안내해요. 1회용 사용 등 궁금한 점도 미리 통역해 확인해드립니다.`],
   [`${A} 왁싱 가격대는요?`,`브라질리언 ¥5,000~9,000 선이 일반적이에요. 아래 가격표를 참고하세요.`],
   [`예약은 어떻게 하나요?`,`인스타 @beautia.japan DM 또는 카카오톡 채널로 지역·시술·날짜를 주시면 됩니다.`],
  ]},
];

const won = (yen)=>{const v=yen*RATE/10000; return v.toFixed(1);};
const fmt = (n)=>n.toLocaleString('en-US');
const esc = (s)=>(''+s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const HEAD = (title,desc,canon,kw,jsonld)=>`<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google-site-verification" content="toAtwGl-Up9Adn-xXY-y8V-ch6IBoowrYxmMXg4ZMUs">
<meta name="naver-site-verification" content="bec0ee3bfd015beb74d81bfea16300eb57e61afd">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(kw)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${canon}">
<link rel="alternate" hreflang="ko" href="${canon}?lang=ko"><link rel="alternate" hreflang="ja" href="${canon}?lang=ja"><link rel="alternate" hreflang="x-default" href="${canon}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Beautia"><meta property="og:locale" content="ko_KR"><meta property="og:locale:alternate" content="ja_JP">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}"><meta property="og:image" content="${SITE}/logo.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="../logo-icon.png">
<meta name="theme-color" content="#6D4346">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap">
<link rel="stylesheet" href="../info.css">
${jsonld.map(j=>`<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head><body>
<header class="hdr"><div class="hwrap">
  <a class="logo" href="../community.html"><img src="../logo-trim.png" alt="Beautia"></a>
  <nav class="gnav"><a href="../community.html">커뮤니티</a><a href="../info.html">지역 정보</a><a href="../shop.html">입점 샵</a><a href="../landing.html">서비스 소개</a></nav>
  <a class="btn btn-primary hcta" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">카톡 예약</a>
</div></header>`;

const FOOT = `<footer><div class="fwrap">
  <a href="../community.html">커뮤니티</a><a href="../landing.html">서비스 소개</a><a href="../info.html">지역 정보</a>
  <a href="../privacy.html">개인정보</a><a href="../terms.html">약관</a>
  <a href="https://instagram.com/beautia.japan" target="_blank">Instagram</a>
  <span class="cp">© 2026 Beautia</span>
</div></footer></body></html>`;

function page(area, svc){
  const A=area.ko, AJ=area.ja, S=svc.ko, SJ=svc.ja;
  const slug=`${area.slug}-${svc.slug}`;
  const canon=`${SITE}/info/${slug}`;
  const title=`${A} ${S} 추천·후기·가격 | ${AJ}${SJ}のおすすめ・口コミ — Beautia`;
  const desc=`${A}(${AJ}) ${S} 추천·실제 후기·가격 가이드. 일본어 0이어도 Beautia가 한국어로 예약·통역을 무료 대행. ／ ${AJ}の${SJ}を韓国語で予約・通訳代行（無料）。口コミ・料金ガイドあり。`;
  const kw=`${A} ${S}, ${A} ${S} 추천, ${A} ${S} 후기, ${A} ${S} 가격, 일본 ${S}, ${A} 한국어 ${S}, ${AJ}${SJ}, ${AJ} ${SJ} おすすめ, ${AJ} ${SJ} 口コミ, ${AJ} ${SJ} 料金, ${AJ} ${SJ} 韓国語, 韓国語 予約 代行`;
  const jaIntro=`${AJ}の${SJ}を、日本語が分からなくてもBeautiaが韓国語で予約・通訳します（予約代行は無料、施術料金のみ現地払い）。`;

  const faqs=svc.faqs(A,AJ);
  const jsonld=[
   {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
     {"@type":"ListItem","position":1,"name":"홈","item":`${SITE}/`},
     {"@type":"ListItem","position":2,"name":"지역 정보","item":`${SITE}/info`},
     {"@type":"ListItem","position":3,"name":`${A} ${S}`,"item":canon}]},
   {"@context":"https://schema.org","@type":"FAQPage","mainEntity":faqs.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a.replace(/<[^>]+>/g,'')}}))},
   {"@context":"https://schema.org","@type":"Service","serviceType":`${A} ${S} 예약·통역 대행`,"areaServed":{"@type":"Place","name":`${A}, 일본`},"provider":{"@type":"Organization","name":"Beautia","url":`${SITE}/`},"offers":{"@type":"Offer","price":"0","priceCurrency":"KRW","description":"예약 대행 무료, 시술비 현장 결제"}}
  ];

  const priceRows=svc.price.map(([l,lo,hi])=>`<tr><td>${esc(l)}</td><td class="y">¥${fmt(lo)}~${fmt(hi)}</td><td class="k">약 ${won(lo)}~${won(hi)}만원</td></tr>`).join('');
  const tips=svc.tips.map(t=>`<li>${t}</li>`).join('');
  const faqHtml=faqs.map(([q,a])=>`<details><summary>${esc(q)}</summary><div class="ans">${a}</div></details>`).join('');

  // related internal links
  const sameArea=SERVICES.filter(s=>s.slug!==svc.slug).map(s=>`<a href="${area.slug}-${s.slug}.html">${A} ${s.ko}</a>`).join('');
  const sameSvc=AREAS.filter(a=>a.slug!==area.slug).slice(0,6).map(a=>`<a href="${a.slug}-${svc.slug}.html">${a.ko} ${S}</a>`).join('');

  const liveScript=[
   '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><\/script>',
   '<script>',
   "const SB=supabase.createClient('"+SB_URL+"','"+SB_KEY+"');",
   '(async()=>{ try{',
   " const {data}=await SB.from('posts').select('*').eq('region','"+area.region+"').eq('hidden',false).order('like_count',{ascending:false}).limit(4);",
   ' const el=document.getElementById("revs");',
   ' if(data&&data.length){',
   '  el.innerHTML=data.map(function(p){var ex=(p.content||"").slice(0,90).replace(/[<>]/g,"");var ti=(p.title||"").replace(/[<>]/g,"");return \'<a class="rev" href="../community.html?post=\'+p.id+\'"><div class="rcat">\'+(p.cat||"후기")+\'</div><div class="rtitle">\'+ti+\'</div><div class="rexc">\'+ex+\'</div><div class="rmeta"><span>\\u2665 \'+(p.like_count||0)+\'</span><span>\'+(p.nickname||"익명")+\'</span></div></a>\';}).join("");',
   '  } else { document.getElementById("revEmpty").style.display="block"; }',
   ' }catch(e){ document.getElementById("revEmpty").style.display="block"; }',
   '})();',
   '<\/script>'
  ].join('\n');
  const footFull=FOOT.replace('</body></html>', liveScript+'\n</body></html>');

  const body=`
<div class="wrap">
  <div class="crumb"><a href="../landing.html">홈</a><span class="sep">›</span><a href="../info.html">지역 정보</a><span class="sep">›</span><span>${A} ${S}</span></div>
  <div class="hero">
    <span class="kicker">${A} · ${S}</span>
    <h1>${A} ${S} 추천 & 후기</h1>
    <p class="lead">${svc.intro(A)}</p>
    <p class="lead" lang="ja" style="font-size:13.5px;color:var(--sub);margin-top:8px">${jaIntro}</p>
    <div class="meta"><span class="hpill">한국어 예약·통역</span><span class="hpill">예약 대행 무료</span><span class="hpill">시술비 현장 결제</span></div>
    <div class="acts"><a class="btn btn-primary" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">💬 카톡으로 ${S} 예약</a><a class="btn btn-ghost" href="#reviews">후기 보기</a></div>
  </div>
</div>

<div class="wrap">
  <section id="price">
    <h2><span class="n">01</span> ${A} ${S} 가격 가이드</h2>
    <div class="sub">일본 현지 평균 가격대 (환율 ¥100 ≈ ${Math.round(RATE*100)}원 기준)</div>
    <table class="ptable"><thead><tr><th>시술</th><th>엔화</th><th>원화(약)</th></tr></thead><tbody>${priceRows}</tbody></table>
    <p class="pnote">※ 매장·디자이너·시점에 따라 다를 수 있어요. 일본은 팁이 없어 표시가가 곧 결제 금액입니다. 정확한 견적은 카톡으로 문의 주세요.</p>
  </section>

  <section id="tips">
    <h2><span class="n">02</span> ${A}에서 ${S} 받기 전 꿀팁</h2>
    <ul class="prose" style="padding-left:18px">${tips}</ul>
  </section>

  <section id="reviews">
    <h2><span class="n">03</span> ${A} ${S} 실제 후기</h2>
    <div class="sub">Beautia 커뮤니티에 올라온 ${area.region} 지역 후기예요.</div>
    <div id="revs" class="revgrid"></div>
    <div id="revEmpty" class="revempty" style="display:none">
      아직 ${A} ${S} 후기가 없어요. 첫 후기를 남기면 <b>포인트 적립</b> 혜택을 드려요.
      <div><a class="btn btn-primary" href="../community.html?cat=후기">후기 쓰러 가기</a></div>
    </div>
  </section>

  <section id="rank">
    <h2><span class="n">04</span> ${A} ${S} 인기 샵 랭킹</h2>
    <div class="rankbox">
      <h3>이번 주 ${A} ${S} TOP 랭킹 — 곧 공개</h3>
      <p>한국인이 가장 많이 예약·재방문한 ${A} ${S} 샵 랭킹을 준비하고 있어요. 입점을 원하는 사장님은 프로필을 무료로 만들어드립니다.</p>
      <a class="btn btn-ghost" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">사장님 입점 문의</a>
    </div>
  </section>

  <section id="faq">
    <h2><span class="n">05</span> 자주 묻는 질문</h2>
    <div class="faq">${faqHtml}</div>
  </section>

  <div class="ctaband">
    <h3>${A}에서 ${S}, 일본어 0이어도 OK</h3>
    <p>마음에 드는 곳을 찾았다면 Beautia가 ${A}의 검증된 매장에 한국어로 예약·통역까지 대행해드려요. (예약 대행 무료 · 시술비만 현장 결제)</p>
    <div class="row"><a class="btn btn-kakao" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">💬 카톡으로 예약 신청</a><a class="btn btn-ghost" href="https://instagram.com/beautia.japan" target="_blank">인스타 DM</a></div>
  </div>

  <section style="border-bottom:none">
    <h2><span class="n">06</span> 함께 보면 좋아요</h2>
    <div class="rel-links">${sameArea}${sameSvc}</div>
  </section>
</div>
${footFull}`;

  return HEAD(title,desc,canon,kw,jsonld)+body;
}

// ---- generate ----
const outDir=path.join(__dirname,'info');
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir);
let urls=[];
for(const a of AREAS){ for(const s of SERVICES){
  const slug=`${a.slug}-${s.slug}`;
  fs.writeFileSync(path.join(outDir,slug+'.html'), page(a,s));
  urls.push(`${SITE}/info/${slug}`);
}}

// ---- index page (/info) ----
function indexPage(){
  const title='일본 뷰티 지역 정보 · 日本ビューティー地域ガイド — 미용실·네일·속눈썹·왁싱 | Beautia';
  const desc='도쿄·오사카·교토·후쿠오카 등 일본 주요 지역의 미용실·네일·속눈썹·왁싱 추천·후기·가격을 한국어로. ／ 東京・大阪など日本各地の美容室・ネイル・まつげ・脱毛を韓国語で予約・通訳代行（無料）。';
  const canon=`${SITE}/info`;
  const jsonld=[{"@context":"https://schema.org","@type":"CollectionPage","name":title,"url":canon,"inLanguage":"ko"}];
  let blocks='';
  for(const a of AREAS){
    blocks+=`<div class="areahead">${a.ko} <span style="color:var(--sub);font-weight:500">${a.ja}</span></div><div class="idxgrid">`+
      SERVICES.map(s=>`<a href="info/${a.slug}-${s.slug}.html">${a.ko} ${s.ko}<span class="s">추천·후기·가격</span></a>`).join('')+`</div>`;
  }
  const head=`<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow"><link rel="canonical" href="${canon}">
<meta name="naver-site-verification" content="bec0ee3bfd015beb74d81bfea16300eb57e61afd">
<link rel="icon" type="image/png" href="logo-icon.png"><meta name="theme-color" content="#6D4346">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap">
<link rel="stylesheet" href="info.css">
${jsonld.map(j=>`<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head><body>
<header class="hdr"><div class="hwrap">
  <a class="logo" href="community.html"><img src="logo-trim.png" alt="Beautia"></a>
  <nav class="gnav"><a href="community.html">커뮤니티</a><a href="landing.html">서비스 소개</a><a href="info.html">지역 정보</a></nav>
  <a class="btn btn-primary hcta" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">카톡 예약</a>
</div></header>
<div class="wrap">
  <div class="hero"><span class="kicker">지역 정보</span><h1>일본 뷰티, 지역으로 찾기</h1>
  <p class="lead">도쿄·오사카부터 후쿠오카·삿포로까지. 지역별 <b>미용실·네일·속눈썹·왁싱</b> 추천과 실제 후기, 가격을 한국어로 모았어요. 일본어를 못해도 Beautia가 예약·통역을 무료 대행합니다.</p></div>
  ${blocks}
  <div style="height:40px"></div>
</div>`;
  return head+FOOT.replace(/\.\.\//g,'');
}
fs.writeFileSync(path.join(__dirname,'info.html'), indexPage());

// ---- sitemap ----
function sitemap(){
  const base=[
   {loc:`${SITE}/`,cf:'weekly',pr:'1.0',hl:true},
   {loc:`${SITE}/community`,cf:'daily',pr:'0.9',hl:true},
   {loc:`${SITE}/info`,cf:'weekly',pr:'0.8',hl:false},
  ];
  const u=(o)=>`  <url>\n    <loc>${o.loc}</loc>\n${o.hl?`    <xhtml:link rel="alternate" hreflang="ko" href="${o.loc}?lang=ko"/>\n    <xhtml:link rel="alternate" hreflang="ja" href="${o.loc}?lang=ja"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${o.loc}"/>\n`:''}    <changefreq>${o.cf}</changefreq><priority>${o.pr}</priority>\n  </url>`;
  let body=base.map(u).join('\n')+'\n';
  body+=urls.map(loc=>`  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`).join('\n')+'\n';
  body+=`  <url><loc>${SITE}/privacy</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>\n`;
  body+=`  <url><loc>${SITE}/terms</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>\n`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}</urlset>\n`;
}
fs.writeFileSync(path.join(__dirname,'sitemap.xml'), sitemap());

console.log('generated', urls.length, 'info pages + info.html + sitemap.xml');
