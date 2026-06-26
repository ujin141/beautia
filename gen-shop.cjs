/* Beautia — 사장님 샵 프로필 페이지 생성기 (공유·QR·후기·SEO) */
const fs=require('fs'), path=require('path');
const SITE='https://beautia.io';
const SB_URL='https://pzbxcktaljhesrfnqwzq.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Ynhja3RhbGpoZXNyZm5xd3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1MjYsImV4cCI6MjA4Mzc0MzUyNn0.aUZbTgfWbjEISNr1-cu9YJnOGj1lzjXeRVifHygAplc';
const U=(id,w)=>`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w||900}&q=70`;
const esc=s=>(''+s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const stars=n=>'★★★★★'.slice(0,Math.round(n))+'☆☆☆☆☆'.slice(0,5-Math.round(n));

const SHOPS=[
 {slug:'shibuya-hairroom', name:'시부야 헤어룸', ja:'渋谷ヘアルーム', type:'HairSalon', region:'도쿄', area:'시부야', koOK:true, rating:4.9, nrev:128,
  blurb:'시부야역 도보 3분, 한국인 단골이 많은 헤어살롱. 다운펌·매직·뿌리염색 모두 가능하고 한국어 메뉴를 준비했어요. 원하는 스타일 사진만 보여주시면 기장·컬·톤까지 맞춰드립니다.',
  svc:['헤어컷','펌','염색','다운펌'],
  cover:'1560066984-138dadb4c035', photos:['1562322140-8baeececf3df','1487412947147-5cebf100ffc2','1512496015851-a90fb38ba796'],
  menu:[['컷','¥5,000~'],['펌','¥12,000~'],['염색(전체)','¥9,000~'],['다운펌/매직','¥14,000~']],
  hours:'11:00–20:00', off:'매주 수요일', loc:'도쿄 시부야 (시부야역 3분)',
  reviews:[['워홀러여','펌 대만족 ㅠㅠ','일본어 1도 모르는데 사진 보여주고 예약했어요. 기장이랑 컬 세기까지 다 전달돼서 완전 만족. 엔저라 가격도 한국보다 쌌어요!',5],['도쿄살이','다운펌 잘해요','한국 다운펌 그대로 됐어요. 한국어 메뉴 있어서 편했어요.',5]]},
 {slug:'shinsaibashi-nail-atelier', name:'신사이바시 네일 아틀리에', ja:'心斎橋ネイルアトリエ', type:'NailSalon', region:'오사카', area:'신사이바시', koOK:true, rating:4.8, nrev:96,
  blurb:'신사이바시 중심, 섬세한 아트가 강점인 네일 아틀리에. 핀터레스트 사진 한 장이면 디자인 그대로 재현해드려요. 젤·연장·아트 모두 가능하고 한국어 응대도 OK.',
  svc:['네일'],
  cover:'1604654894610-df63bc536371', photos:['1522335789203-aabd1fc54bc9','1604654894610-df63bc536371','1596462502278-27bfdc403348'],
  menu:[['젤네일 원컬러','¥4,500~'],['젤네일 아트','¥8,000~'],['연장(스컬프)','¥11,000~'],['오프','¥1,500~']],
  hours:'10:00–21:00', off:'연중무휴', loc:'오사카 신사이바시 (신사이바시역 2분)',
  reviews:[['난바초보','아트 퀄 미쳤어요','사진만 보여줬는데 디자인 거의 똑같이 나왔어요. 한국어 돼서 편했어요!',5],['엔저덕분','젤 오래가요','3주 됐는데 멀쩡함. 오사카 가면 또 갈 듯.',5]]},
 {slug:'shinjuku-lash-studio', name:'신주쿠 래쉬 스튜디오', ja:'新宿ラッシュスタジオ', type:'BeautySalon', region:'도쿄', area:'신주쿠', koOK:false, rating:4.9, nrev:74,
  blurb:'신주쿠역 동쪽 출구 5분. 자연스러운 속눈썹 연장과 라쉬리프트 전문. 일본어가 어려워도 Beautia가 길이·컬·볼륨까지 통역해드리니 걱정 없어요.',
  svc:['속눈썹'],
  cover:'1583001931096-959e9a1a6223', photos:['1583001931096-959e9a1a6223','1522338242992-e1a54906a8da','1596462502278-27bfdc403348'],
  menu:[['속눈썹 연장(80~100본)','¥4,500~'],['볼륨래시','¥6,500~'],['라쉬리프트(펌)','¥5,500~'],['리터치','¥3,500~']],
  hours:'10:00–19:00', off:'매주 월요일', loc:'도쿄 신주쿠 (신주쿠역 동쪽 5분)',
  reviews:[['도쿄가고파','자연스러워요','너무 티 안 나고 자연스럽게 잘 됐어요. 통역해주셔서 디테일 전달 잘됐어요.',5]]},
 {slug:'namba-nailroom', name:'난바 네일룸', ja:'難波ネイルルーム', type:'NailSalon', region:'오사카', area:'난바', koOK:true, rating:4.7, nrev:61,
  blurb:'난바 도톤보리 근처, 가성비 좋은 네일룸. 심플부터 트렌디 아트까지. 한국 손님 환영, 사진 보고 상담해요.',
  svc:['네일'],
  cover:'1522335789203-aabd1fc54bc9', photos:['1604654894610-df63bc536371','1522335789203-aabd1fc54bc9','1596462502278-27bfdc403348'],
  menu:[['젤네일 원컬러','¥4,000~'],['아트','¥7,000~'],['오프','¥1,500~']],
  hours:'10:00–20:00', off:'부정기', loc:'오사카 난바 (난바역 5분)',
  reviews:[['난바초보','가성비 굿','가격 착하고 깔끔해요. 여행 중 들르기 좋아요.',5]]},
 {slug:'ginza-hair-premium', name:'긴자 헤어 프리미엄', ja:'銀座ヘアプレミアム', type:'HairSalon', region:'도쿄', area:'긴자', koOK:true, rating:4.9, nrev:53,
  blurb:'긴자의 프리미엄 헤어살롱. 차분한 분위기에서 컷·컬러·트리트먼트까지. 한국어 응대 가능, 디자이너 지명 추천.',
  svc:['헤어컷','펌','염색'],
  cover:'1521590832167-7bcbfaa6381f', photos:['1521590832167-7bcbfaa6381f','1562322140-8baeececf3df','1512496015851-a90fb38ba796'],
  menu:[['컷','¥7,000~'],['컬러','¥12,000~'],['트리트먼트','¥6,000~']],
  hours:'11:00–20:00', off:'매주 화요일', loc:'도쿄 긴자 (긴자역 3분)',
  reviews:[['서울사는데','분위기 최고','시술도 좋고 공간이 너무 예뻐요. 한국어 응대 됐어요.',5]]},
];

const HEAD=(title,desc,canon,kw,jsonld)=>`<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(kw)}"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="business.business"><meta property="og:site_name" content="Beautia">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}">
<link rel="icon" type="image/png" href="../logo-icon.png"><meta name="theme-color" content="#6D4346">
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
const FOOT=`<footer><div class="fwrap">
  <a href="../community.html">커뮤니티</a><a href="../info.html">지역 정보</a><a href="../landing.html">서비스 소개</a>
  <a href="../privacy.html">개인정보</a><a href="../terms.html">약관</a>
  <span class="cp">© 2026 Beautia</span></div></footer>`;

function shopPage(s){
  const canon=`${SITE}/shop/${s.slug}`;
  const svcTxt=s.svc.join('·');
  const title=`${s.name} — ${s.area} ${svcTxt} | 한국어 예약 Beautia`;
  const desc=`${s.area}(${s.region}) ${svcTxt} · ${s.blurb.slice(0,70)} 일본어 없이 Beautia가 한국어로 예약·통역 대행.`;
  const kw=`${s.name}, ${s.area} ${s.svc[0]}, ${s.area} ${s.svc[0]} 한국어, ${s.region} ${s.svc[0]} 추천, ${esc(s.ja)}`;
  const qr=`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(canon)}`;
  const jsonld=[
   {"@context":"https://schema.org","@type":s.type,"name":s.name,"image":U(s.cover,1200),"url":canon,
    "address":{"@type":"PostalAddress","addressLocality":s.area,"addressRegion":s.region,"addressCountry":"JP"},
    "priceRange":"¥¥","aggregateRating":{"@type":"AggregateRating","ratingValue":s.rating,"reviewCount":s.nrev},
    "makesOffer":s.svc.map(v=>({"@type":"Offer","itemOffered":{"@type":"Service","name":v}})),
    "review":s.reviews.map(r=>({"@type":"Review","author":{"@type":"Person","name":r[0]},"reviewRating":{"@type":"Rating","ratingValue":r[3]},"reviewBody":r[2]}))},
   {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
     {"@type":"ListItem","position":1,"name":"홈","item":`${SITE}/`},
     {"@type":"ListItem","position":2,"name":"샵","item":`${SITE}/shop`},
     {"@type":"ListItem","position":3,"name":s.name,"item":canon}]}
  ];
  const gallery=s.photos.map(p=>`<img src="${U(p,700)}" loading="lazy" alt="${esc(s.name)} 사진" onclick="zoom(this.src)">`).join('');
  const menu=s.menu.map(([m,y])=>`<div class="mrow"><b>${esc(m)}</b><span class="my">${esc(y)}</span></div>`).join('');
  const seedRev=s.reviews.map(r=>`<div class="rev"><div class="rcat">${stars(r[3])}</div><div class="rtitle">${esc(r[1])}</div><div class="rexc">${esc(r[2])}</div><div class="rmeta"><span>${esc(r[0])}</span></div></div>`).join('');

  const body=`
<div class="wrap">
  <div class="crumb"><a href="../landing.html">홈</a><span class="sep">›</span><a href="../shop.html">샵</a><span class="sep">›</span><span>${esc(s.name)}</span></div>
  <div class="shopcover"><img src="${U(s.cover,1400)}" alt="${esc(s.name)}"></div>
  <div class="shophead">
    <div class="si">
      <h1>${esc(s.name)} ${s.koOK?`<span class="badge-ko">한국어 OK</span>`:''}</h1>
      <div class="ja">${esc(s.ja)}</div>
      <div class="shopmeta"><span class="stars">${stars(s.rating)}<b>${s.rating}</b></span><span class="dot"></span><span>후기 ${s.nrev}</span><span class="dot"></span><span>📍 ${esc(s.area)} · ${esc(s.region)}</span></div>
      <div class="shopchips">${s.svc.map(v=>`<span class="c">${esc(v)}</span>`).join('')}</div>
      <div class="shopblurb">${esc(s.blurb)}</div>
      <div class="shopacts"><a class="btn btn-primary" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">💬 카톡으로 예약</a></div>
      <div class="sharebar">
        <button onclick="copyLink()"><i></i>🔗 링크 복사</button>
        <button onclick="window.open('https://pf.kakao.com/_xhxhixfX/chat')">💬 카카오</button>
        <button onclick="window.open('https://instagram.com/beautia.japan')">📷 인스타</button>
      </div>
    </div>
    <div class="qrcard"><img src="${qr}" alt="QR"><div class="ql">QR 저장 → 인스타·매장 공유</div></div>
  </div>

  <section><h2><span class="n">01</span> 사진</h2><div class="gallery">${gallery}</div></section>
  <section><h2><span class="n">02</span> 메뉴·가격</h2><div class="menu">${menu}</div><p class="pnote">※ 일본은 팁이 없어 표시가가 곧 결제 금액입니다. 정확한 견적은 카톡으로 문의 주세요.</p></section>
  <section><h2><span class="n">03</span> 후기</h2><div class="revgrid">${seedRev}</div><div id="revLive" class="revgrid" style="margin-top:14px"></div></section>
  <section><h2><span class="n">04</span> 매장 정보</h2>
    <div class="inforow"><span class="il">위치</span><span>${esc(s.loc)}</span></div>
    <div class="inforow"><span class="il">영업시간</span><span>${esc(s.hours)}</span></div>
    <div class="inforow"><span class="il">휴무</span><span>${esc(s.off)}</span></div>
    <div class="inforow"><span class="il">한국어</span><span>${s.koOK?'한국어 응대 가능':'Beautia 통역 지원'}</span></div>
  </section>

  <div class="ctaband">
    <h3>${esc(s.name)}, 일본어 0이어도 예약 OK</h3>
    <p>Beautia가 한국어로 ${esc(s.area)} ${svcTxt} 예약·통역까지 무료 대행해드려요. (시술비만 현장 결제)</p>
    <div class="row"><a class="btn btn-kakao" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">💬 카톡으로 예약 신청</a></div>
  </div>
</div>
<div id="lb" onclick="this.style.display='none'" style="position:fixed;inset:0;background:rgba(20,12,13,.9);display:none;align-items:center;justify-content:center;z-index:300;padding:30px;cursor:zoom-out"><img id="lbi" style="max-width:100%;max-height:100%;border-radius:10px"></div>
${FOOT}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
function copyLink(){navigator.clipboard.writeText('${canon}').then(()=>alert('링크가 복사됐어요!\\n${canon}'));}
function zoom(src){document.getElementById('lbi').src=src;document.getElementById('lb').style.display='flex';}
const SB=supabase.createClient('${SB_URL}','${SB_KEY}');
(async()=>{ try{
 const {data}=await SB.from('posts').select('*').eq('region','${s.region}').eq('hidden',false).order('like_count',{ascending:false}).limit(4);
 if(data&&data.length){ document.getElementById('revLive').innerHTML=data.map(function(p){var ex=(p.content||'').slice(0,90).replace(/[<>]/g,'');var ti=(p.title||'').replace(/[<>]/g,'');return '<a class="rev" href="../community.html?post='+p.id+'"><div class="rcat">'+(p.cat||'후기')+'</div><div class="rtitle">'+ti+'</div><div class="rexc">'+ex+'</div><div class="rmeta"><span>\\u2665 '+(p.like_count||0)+'</span><span>'+(p.nickname||'익명')+'</span></div></a>';}).join(''); }
}catch(e){} })();
</script>
</body></html>`;
  return HEAD(title,desc,canon,kw,jsonld)+body;
}

// index page /shop
function indexPage(){
  const title='Beautia 입점 샵 — 일본 미용실·네일·속눈썹 (한국어 예약)';
  const desc='Beautia에 입점한 일본 미용실·네일·속눈썹 샵. 한국어 예약·통역 대행. 사장님 입점 문의 환영.';
  const canon=`${SITE}/shop`;
  const cards=SHOPS.map(s=>`<a class="rev" href="shop/${s.slug}.html" style="display:block">
    <div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden;margin:-2px -2px 10px"><img src="${U(s.cover,600)}" style="width:100%;height:100%;object-fit:cover" alt="${esc(s.name)}"></div>
    <div class="rcat">${stars(s.rating)} ${s.rating} · 후기 ${s.nrev}</div>
    <div class="rtitle">${esc(s.name)} ${s.koOK?'· 한국어 OK':''}</div>
    <div class="rexc">📍 ${esc(s.area)} · ${s.svc.join('·')}</div></a>`).join('');
  const head=`<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="index,follow">
<link rel="canonical" href="${canon}"><link rel="icon" type="image/png" href="logo-icon.png"><meta name="theme-color" content="#6D4346">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap">
<link rel="stylesheet" href="info.css"></head><body>
<header class="hdr"><div class="hwrap">
  <a class="logo" href="community.html"><img src="logo-trim.png" alt="Beautia"></a>
  <nav class="gnav"><a href="community.html">커뮤니티</a><a href="info.html">지역 정보</a><a href="landing.html">서비스 소개</a></nav>
  <a class="btn btn-primary hcta" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">카톡 예약</a>
</div></header>
<div class="wrap">
  <div class="hero"><span class="kicker">입점 샵</span><h1>Beautia 입점 샵</h1>
  <p class="lead">Beautia가 한국어로 예약·통역을 도와드리는 일본 미용실·네일·속눈썹 샵이에요. 마음에 드는 곳을 찾았다면 카톡으로 예약하세요.</p></div>
  <div class="revgrid" style="margin-top:22px">${cards}</div>
  <div class="rankbox" style="margin-top:28px"><h3>사장님이신가요?</h3><p>한국 손님을 받고 싶은 한·일 미용실·네일·속눈썹 사장님께 <b>전용 프로필 페이지를 무료로</b> 만들어드려요. 인스타에 공유할 수 있는 링크와 QR을 드립니다.</p><a class="btn btn-primary" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">입점 문의하기</a></div>
  <div style="height:40px"></div>
</div>${FOOT.replace(/\.\.\//g,'')}</body></html>`;
  return head;
}

const outDir=path.join(__dirname,'shop');
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir);
let urls=[];
for(const s of SHOPS){ fs.writeFileSync(path.join(outDir,s.slug+'.html'), shopPage(s)); urls.push(`${SITE}/shop/${s.slug}`); }
fs.writeFileSync(path.join(__dirname,'shop.html'), indexPage());

// append shop urls to sitemap (between </... existing> — regenerate by inserting before privacy)
try{
  let sm=fs.readFileSync(path.join(__dirname,'sitemap.xml'),'utf8');
  // remove old shop entries then insert fresh before privacy
  sm=sm.replace(/\n? *<url><loc>https:\/\/beautia\.io\/shop[^<]*<\/loc>[^]*?<\/url>/g,'');
  const block='\n'+[`${SITE}/shop`].concat(urls).map(loc=>`  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`).join('\n');
  sm=sm.replace('  <url><loc>https://beautia.io/privacy</loc>', block.trim()+'\n  <url><loc>https://beautia.io/privacy</loc>');
  fs.writeFileSync(path.join(__dirname,'sitemap.xml'), sm);
}catch(e){ console.warn('sitemap update skipped', e.message); }

console.log('generated', urls.length, 'shop pages + shop.html, sitemap updated');
