// Beautia · 가이드 아티클 — /guide/<slug>  (vercel.json rewrite)
//
// 2026-07-18 전면 교체. 이전 가이드 5개는 전부 한국어였고, 그 중 하나는
// "일본에서 한국어 되는 샵 찾기" — 우리가 버린 옛 방향이었다. 구글에 색인된 페이지가
// 그것뿐이라 검색엔진이 우리를 그 방향으로 알고 있었다.
//
// 지금 방향: 서울에 오는 외국인이 한국 디자이너를 찾는 것. 그래서 전부 영어다.
// 가격은 전부 DB에 실제로 등록된 값만 쓴다. 환율은 앱과 같은 실시간 값 기준(₩1,487/USD).
const SITE = 'https://beautia.io';
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const jsonld = o => JSON.stringify(o).replace(/</g, '\\u003c');

// ── 콘텐츠 ────────────────────────────────────────────────
const GUIDES = {
  'korean-salon-menu-english': {
    title: 'The Korean Salon Menu, Translated',
    desc: '열펌, 매직, 다운펌, 클리닉, 엠보 — what the words on a Korean salon menu actually mean, and which ones you can point at.',
    cat: '', catLabel: 'Seoul guide', cover: `${SITE}/og-cover.png`, read: 5, updated: '2026-07-18',
    body: `
<p>Walk into a salon in Seoul and the menu on the wall is a wall of Korean. Most of these words don't translate the way you'd guess — <strong>클리닉</strong> is not a clinic, and <strong>다운펌</strong> removes volume instead of adding it.</p>
<p>Here is what the common ones mean. Screenshot this page and point at the Korean when you get there — that genuinely works.</p>
<h2>Perms</h2>
<ul>
<li><strong>열펌</strong> (yeol-peom) — <strong>Heat perm.</strong> Rods plus heat. Gives a defined curl that holds its shape longer.</li>
<li><strong>일반펌</strong> (ilban-peom) — <strong>Cold perm.</strong> No heat, chemical only. Softer, looser wave.</li>
<li><strong>매직 스트레이트</strong> (magic straight) — the opposite of a perm. <strong>Chemical straightening.</strong> This is the one behind the very flat, very shiny "glass hair" look. It is not a blowout — it's permanent until it grows out.</li>
<li><strong>다운펌</strong> (down-peom) — <strong>Down perm.</strong> Flattens hair that sticks out, usually at the sides. Popular with men.</li>
</ul>
<h2>Cuts and treatments</h2>
<ul>
<li><strong>컷</strong> (keot) — cut.</li>
<li><strong>투블럭</strong> (two-block) — short, clipped sides with length left on top.</li>
<li><strong>클리닉</strong> (clinic) — <strong>not a hospital.</strong> It means a hair treatment — a conditioning service, usually add-on.</li>
<li><strong>염색</strong> (yeomsaek) — hair color.</li>
<li><strong>뿌리염색</strong> — root touch-up only.</li>
</ul>
<h2>Lashes and brows</h2>
<ul>
<li><strong>속눈썹연장</strong> — <strong>lash extensions.</strong> Individual fibers attached to your own lashes.</li>
<li><strong>래쉬리프트 / 속눈썹펌</strong> — <strong>lash lift / lash perm.</strong> Curls your own lashes, nothing added.</li>
<li><strong>엠보</strong> (embo) — <strong>microblading.</strong> Hair-like strokes drawn into the brow.</li>
<li><strong>반영구</strong> (banyeonggu) — "semi-permanent." The umbrella word for cosmetic tattooing.</li>
</ul>
<h2>Words that show up on the price list</h2>
<ul>
<li><strong>남</strong> / <strong>여</strong> — men's / women's price.</li>
<li><strong>단발</strong> — short (above shoulder). <strong>중단발</strong> — medium. <strong>롱</strong> — long. Longer hair usually costs more.</li>
<li><strong>디자이너</strong> vs <strong>원장</strong> — stylist vs. director. 원장 is the senior stylist and costs more.</li>
<li><strong>추가</strong> — additional charge.</li>
</ul>
<h2>What things actually cost</h2>
<p>Real prices from stylists listed on Beautia, so you have a reference point:</p>
<ul>
<li>Cut — <strong>₩25,000</strong> (about $17) at 블레스헤어 송파점, Seoul</li>
<li>Cold perm — <strong>₩80,000</strong> (about $54) at 더예뻐지는손길헤어, Seoul</li>
<li>Heat perm — <strong>₩120,000</strong> (about $81), same salon</li>
<li>Color — <strong>₩80,000</strong> (about $54), same salon</li>
</ul>
<p>Prices vary by salon, stylist level and hair length. Every designer on Beautia lists their own menu, converted into your currency.</p>
<h2>The part nobody tells you</h2>
<p>The menu is the easy problem. The hard one is that you can't tell <em>which stylist</em> does the look you want — Korean salon reviews are on Naver, in Korean, and a salon's name tells you nothing about the person holding the scissors.</p>
<p>That's why Beautia leads with portfolios. You scroll through actual work and pick the person whose photos look like what you want, then book. No menu reading required.</p>`,
    faq: [
      ['Do salons in Seoul speak English?', 'Some do, many do not. Showing a photo of what you want works far better than describing it — and on Beautia you can book and message the designer in English.'],
      ['What is 매직 스트레이트 exactly?', 'A chemical straightening service. It permanently straightens the hair you have now until it grows out — unlike a blowout, it does not wash out.'],
      ['Is 클리닉 a medical treatment?', 'No. Despite the name, 클리닉 on a salon menu means a hair conditioning treatment, usually offered as an add-on to a cut or color.'],
    ],
  },

  'hair-salon-seoul-foreigners': {
    title: 'Getting Your Hair Done in Seoul When You Don’t Speak Korean',
    desc: 'How booking works, what a cut and perm actually cost in Seoul, and how to communicate the look you want without Korean.',
    cat: 'Hair', catLabel: 'Hair · Seoul', cover: `${SITE}/og-cover.png`, read: 6, updated: '2026-07-18',
    body: `
<p>Seoul is one of the cheapest places in a developed country to get good hair work done, and a lot of visitors book a salon appointment on purpose during their trip. The barrier isn't cost or quality. It's that the booking systems, the reviews and the menus are all in Korean.</p>
<h2>What it costs</h2>
<p>These are real menu prices from stylists on Beautia — not promotional rates:</p>
<ul>
<li>Cut — <strong>₩25,000</strong>, about $17</li>
<li>Cold perm (일반펌) — <strong>₩80,000</strong>, about $54</li>
<li>Heat perm (열펌) — <strong>₩120,000</strong>, about $81</li>
<li>Color (염색) — <strong>₩80,000</strong>, about $54</li>
</ul>
<p>Longer hair usually costs more, and a senior stylist (원장) costs more than a regular one (디자이너). Ask before you sit down if the price isn't posted.</p>
<h2>Why the usual approach fails</h2>
<p>The standard advice is "search Naver." That doesn't help much — Naver is in Korean, the reviews are in Korean, and the blog posts that rank are frequently sponsored. Google Maps has thin coverage of Korean salons compared to what actually exists.</p>
<p>The bigger issue is that in Korea you are booking <strong>a person, not a salon</strong>. Two stylists in the same shop can produce completely different results. A salon's rating averages that away.</p>
<h2>Bring a photo. Always.</h2>
<p>This is the single highest-leverage thing you can do, and it works regardless of language. Save 2–3 photos of the result you want and show them at the chair.</p>
<p>Better: pick a stylist whose <em>own</em> portfolio already contains the look you want. Then there's nothing to interpret — you're pointing at their work and saying "this one."</p>
<h2>Book ahead, not walk-in</h2>
<p>Popular stylists fill up, especially weekends. Walk-ins exist but you'll likely get whoever is free, which defeats the point of choosing a person.</p>
<h2>Timing your appointment</h2>
<ul>
<li>A cut runs roughly an hour. A perm or color can take two to four — don't schedule it before something you can't be late for.</li>
<li>If you want a perm <em>and</em> color, ask whether they'll do both in one visit. Some stylists prefer to split them.</li>
<li>Book it early in your trip if it's a big change, so you have time to go back if something's off.</li>
</ul>
<h2>Words worth recognizing</h2>
<p>You don't need Korean, but four words help: <strong>컷</strong> (cut), <strong>펌</strong> (perm), <strong>염색</strong> (color), <strong>클리닉</strong> (treatment). Our <a href="/guide/korean-salon-menu-english">salon menu guide</a> covers the rest.</p>
<h2>How Beautia handles this</h2>
<p>Every stylist on Beautia shows their actual portfolio first — you choose by looking, not by reading. Prices convert to your currency automatically, and you book and message in English. <a href="/designers">Browse the stylists</a> and see what's there.</p>`,
    faq: [
      ['How much is a haircut in Seoul?', 'Around ₩25,000 (about $17) at the salons listed on Beautia. Prices rise with hair length and stylist seniority, and vary a lot by neighbourhood.'],
      ['Do I need to book in advance?', 'Yes, if you want a specific stylist. Walk-ins are sometimes possible but you will be assigned whoever is available.'],
      ['Can I get my hair done in Seoul without speaking Korean?', 'Yes. Bring reference photos — that communicates more precisely than words anyway. On Beautia you can also book and message the designer in English.'],
    ],
  },

  'korean-perm-guide': {
    title: 'Korean Perm: Heat Perm vs Cold Perm vs Magic Straight',
    desc: 'The three things Korean salons mean by "perm," how they differ, what each costs, and which one gives you the look you have in mind.',
    cat: 'Hair', catLabel: 'Hair', cover: `${SITE}/og-cover.png`, read: 5, updated: '2026-07-18',
    body: `
<p>"Korean perm" isn't one service. On a Seoul salon menu it splits into at least three, and picking the wrong one is how people end up with a result they didn't want.</p>
<h2>열펌 — heat perm</h2>
<p>Rods plus heat. The heat sets the shape, so the curl comes out <strong>defined and springy</strong> and tends to hold its form longer as it grows out. This is what most people picture when they say they want a Korean perm — the soft, rounded C-curl.</p>
<p><strong>₩120,000</strong>, about $81, at 더예뻐지는손길헤어 in Seoul.</p>
<h2>일반펌 — cold perm</h2>
<p>Chemical only, no heat. The result is <strong>looser and more natural</strong> — closer to a wave than a curl. Often gentler on the hair, and cheaper.</p>
<p><strong>₩80,000</strong>, about $54, same salon.</p>
<h2>매직 스트레이트 — magic straight</h2>
<p>The opposite service, confusingly filed alongside perms. It's <strong>chemical straightening</strong>, and it's what's behind the very flat, very reflective "glass hair" look.</p>
<p>Two things people get wrong about it. First, it is not a blowout — it doesn't wash out, it grows out. Second, it's a commitment: your roots will come in with your natural texture, so you're on a schedule from then on.</p>
<h2>Which one do you actually want?</h2>
<ul>
<li>Want visible, bouncy curl that survives a few washes? — <strong>heat perm</strong>.</li>
<li>Want it to look like your hair just happens to be wavy? — <strong>cold perm</strong>.</li>
<li>Want it dead straight and glossy? — <strong>magic straight</strong>.</li>
<li>Hair sticking out at the sides and you want it flat? — that's <strong>다운펌</strong>, down perm, a much smaller service.</li>
</ul>
<h2>Before you book</h2>
<ul>
<li><strong>Bring photos.</strong> "Korean perm" means five different things depending on who's saying it. A photo doesn't.</li>
<li><strong>Say if your hair is colored or previously treated.</strong> It changes what's safe to do and how the result will hold.</li>
<li><strong>Budget the time.</strong> Perms commonly run two hours or more.</li>
<li><strong>Ask about washing.</strong> Stylists differ on how long to wait before the first wash — follow the one who did it.</li>
</ul>
<h2>Pick the stylist, not the salon</h2>
<p>Curl is a taste thing. Two stylists working from the same photo produce different results, and no star rating captures that. Look at what each one has actually done — <a href="/designers">the hair stylists on Beautia</a> show their real work, with prices.</p>`,
    faq: [
      ['How much does a perm cost in Seoul?', 'On Beautia, a cold perm is ₩80,000 (about $54) and a heat perm ₩120,000 (about $81) at 더예뻐지는손길헤어 in Seoul. Prices vary with hair length and stylist seniority.'],
      ['What is the difference between heat perm and cold perm?', 'A heat perm uses heat to set the curl, giving a more defined and longer-holding result. A cold perm is chemical only and produces a softer, looser wave.'],
      ['Is magic straight the same as a Japanese straightening?', 'They are the same category of service — chemical straightening. Korean salons list it as 매직 스트레이트. It grows out rather than washing out.'],
    ],
  },

  'lash-extensions-seoul': {
    title: 'Lash Extensions vs Lash Lift in Korea',
    desc: 'What the two services actually do, how long each lasts, and how to pick a lash artist when you cannot read the reviews.',
    cat: 'Lash', catLabel: 'Lash', cover: `${SITE}/og-cover.png`, read: 5, updated: '2026-07-18',
    body: `
<p>Lashes are a popular thing to get done on a Korea trip, partly because you can be in and out in an hour or two and the result travels with you. There are two different services, and they solve different problems.</p>
<h2>속눈썹연장 — lash extensions</h2>
<p>Individual fibers are attached to your own lashes, one at a time. This <strong>adds length and volume that isn't there</strong>, so it works even if your natural lashes are sparse or short.</p>
<ul>
<li>Lasts roughly three to four weeks before it needs a refill, as your own lashes shed naturally.</li>
<li>Use oil-free cleanser and try not to rub your eyes — oil and friction are what break the bond.</li>
<li>Best if you want an obvious result and want to skip eye makeup entirely.</li>
</ul>
<h2>래쉬리프트 / 속눈썹펌 — lash lift</h2>
<p>Nothing is added. Your <strong>own lashes are curled</strong> upward from the root, which opens up the eye. Especially effective if your lashes are decent in length but grow straight down.</p>
<ul>
<li>Lasts longer than extensions — usually six to eight weeks, since it fades with your own lash cycle.</li>
<li>Avoid water and mascara on the day of the appointment.</li>
<li>Best if you want a subtle result and low upkeep.</li>
</ul>
<h2>Which one</h2>
<p>Short version: <strong>extensions add lashes, a lift repositions the ones you have.</strong> If your problem is "not enough lashes," extensions. If it's "my lashes point the wrong way," a lift.</p>
<p>Doing both at once is generally not recommended — the curl from a lift can make extensions sit at an awkward angle. Ask the artist rather than deciding yourself.</p>
<h2>Picking the artist matters more here than almost anywhere</h2>
<p>Two reasons. <strong>Hygiene</strong> — this is work done millimetres from your eye, and adhesive handling and sanitation are entirely down to the person. And <strong>taste</strong> — "good at lashes" tells you nothing, because some people want them barely noticeable and some want a full dramatic set.</p>
<p>So pick by the work. Scroll a lash artist's actual portfolio and find sets that look like what you want on eyes that look like yours.</p>
<h2>Booking without Korean</h2>
<p>Bring a reference photo, same as with hair. It settles length, curl and density faster than any conversation. <a href="/designers">The lash artists on Beautia</a> each show their real sets, and you can book and message in English.</p>`,
    faq: [
      ['How long do lash extensions last?', 'Typically three to four weeks before a refill, because they come away as your own lashes shed on their natural cycle.'],
      ['Does a lash lift damage your lashes?', 'Done properly, no meaningful damage. Overly heavy extension sets and habitual eye-rubbing are more likely to shorten the life of your natural lashes.'],
      ['Can I get lash extensions and a lash lift together?', 'It is usually not recommended — the lifted curl can leave extensions sitting at an odd angle. Ask the artist, since it depends on your natural lashes.'],
    ],
  },

  'eyebrow-tattoo-korea': {
    title: 'Semi-Permanent Eyebrows in Korea: Methods and Real Prices',
    desc: 'Microblading, powder brows, combo and nano hairstrokes explained — what each looks like, how healing works, and what Seoul studios charge.',
    cat: 'Makeup', catLabel: 'Semi-permanent', cover: `${SITE}/og-cover.png`, read: 6, updated: '2026-07-18',
    body: `
<p>Semi-permanent brows — <strong>반영구</strong> in Korean — last one to three years, so this is the service where choosing the wrong artist costs you the most. Here is what the methods actually are, and what a Seoul studio charges.</p>
<h2>The four methods</h2>
<ul>
<li><strong>Microblading (엠보)</strong> — individual hair-like strokes drawn into the skin. Reads as natural, best if you want to fill in sparse areas rather than build a shape.</li>
<li><strong>Powder brows (파우더 그라데이션)</strong> — a soft shaded fill, like brow powder that doesn't come off. More defined, more "makeup" looking.</li>
<li><strong>Combo (콤보)</strong> — strokes at the front, shading toward the tail. The most dimensional of the three, and usually the most expensive of the standard options.</li>
<li><strong>Nano hairstrokes (나노 헤어스트록)</strong> — strokes done with a fine needle instead of a blade. Finer and more controlled, priced accordingly.</li>
</ul>
<h2>Real prices</h2>
<p>From STROK87 in Seoul, whose full menu is on Beautia:</p>
<ul>
<li>Microblading — <strong>₩420,000</strong>, about $282</li>
<li>Powder brows — <strong>₩420,000</strong>, about $282</li>
<li>Combo brows — <strong>₩480,000</strong>, about $323</li>
<li>Nano hairstrokes — <strong>₩820,000</strong>, about $551</li>
<li>Basic eyeliner — <strong>₩370,000</strong>, about $249</li>
<li>Ombré eyeliner — <strong>₩490,000</strong>, about $330</li>
<li>Lip tint — <strong>₩670,000</strong>, about $451</li>
</ul>
<h2>Skin type changes the answer</h2>
<p>Crisp strokes hold better on drier skin. On oily skin, fine strokes tend to blur over time, and a powder or combo result usually ages better. A good artist will raise this with you — if nobody asks about your skin, that's a signal.</p>
<h2>Healing, week by week</h2>
<ul>
<li><strong>Days 1–3</strong> — darker and thicker than the final result. This is normal. Keep water off.</li>
<li><strong>Days 4–7</strong> — flaking. <strong>Do not pick.</strong> Pulling flakes off takes pigment with them and leaves patches.</li>
<li><strong>Weeks 2–4</strong> — colour fades, then comes back up as it settles. Expect to land around 60–70% of how it looked on day one.</li>
</ul>
<h2>The touch-up is part of the service</h2>
<p>A follow-up session four to six weeks later is standard, to fill in wherever pigment didn't take. Confirm whether it's included in the price before you book — it's a normal thing to ask.</p>
<h2>When to postpone</h2>
<p>If you're pregnant or breastfeeding, prone to keloid scarring, have a breakout in the brow area, or take blood thinners, talk to your doctor and the artist first. Also: if you're getting this done before a wedding or an event, finish it <strong>at least three to four weeks ahead</strong> so it's past the flaking stage and through the touch-up.</p>
<h2>Judge by healed work</h2>
<p>Fresh brows look good in almost every photo. What separates artists is how the work looks <em>healed</em>, one to two years in. Look for a portfolio with volume and consistency — many sets, on many face shapes, not five hero shots.</p>
<p><a href="/designers">Semi-permanent artists on Beautia</a> show their full portfolios and menus, and you can book in English.</p>`,
    faq: [
      ['How much do semi-permanent eyebrows cost in Korea?', 'At STROK87 in Seoul, microblading and powder brows are ₩420,000 (about $282), combo brows ₩480,000 (about $323), and nano hairstrokes ₩820,000 (about $551).'],
      ['How long do semi-permanent brows last?', 'Usually one to three years depending on the method, your skin type and aftercare. Oilier skin tends to fade faster and needs touch-ups sooner.'],
      ['Does it hurt?', 'Numbing cream is used and most people find it manageable. Blade-based methods can feel slightly more abrasive than shading.'],
      ['How far before a wedding should I get it done?', 'At least three to four weeks, so the flaking stage is over and the touch-up session is complete before the day.'],
    ],
  },
};

const ORDER = [
  'korean-salon-menu-english',
  'hair-salon-seoul-foreigners',
  'korean-perm-guide',
  'lash-extensions-seoul',
  'eyebrow-tattoo-korea',
];

function relatedLinks(slug) {
  return ORDER.filter(s => s !== slug).slice(0, 3).map(s =>
    `<a class="rel" href="/guide/${s}"><span>${esc(GUIDES[s].catLabel || 'Guide')}</span>${esc(GUIDES[s].title)}</a>`).join('');
}

export default async function handler(req, res) {
  const slug = (req.query && req.query.slug || '').toString().toLowerCase();
  const g = GUIDES[slug];
  if (!g) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page404()); return; }

  const canon = `${SITE}/guide/${slug}`;
  const bc = [
    { '@type': 'ListItem', position: 1, name: 'Beautia', item: SITE + '/community' },
    { '@type': 'ListItem', position: 2, name: 'Guides', item: SITE + '/guides' },
    { '@type': 'ListItem', position: 3, name: g.title, item: canon },
  ];
  const ld = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Article', '@id': canon + '#article', headline: g.title, description: g.desc, image: g.cover,
        datePublished: g.updated, dateModified: g.updated, inLanguage: 'en',
        author: { '@type': 'Organization', name: 'Beautia' }, publisher: { '@type': 'Organization', name: 'Beautia', logo: { '@type': 'ImageObject', url: SITE + '/logo-mark.png' } },
        mainEntityOfPage: canon, articleSection: g.catLabel },
      { '@type': 'BreadcrumbList', itemListElement: bc },
      g.faq && g.faq.length ? { '@type': 'FAQPage', mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) } : null,
    ].filter(Boolean),
  };
  const faqHtml = (g.faq && g.faq.length) ? `<h2 class="faqh">Frequently asked</h2>${g.faq.map(([q, a]) => `<div class="faq"><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('')}` : '';

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(g.title)} | Beautia</title>
<meta name="description" content="${esc(g.desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
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
:root{--plum:#6E4A50;--mauve:#B5828C;--gold:#EBC98C;--cream:#F7F2F1;--ink:#1C1418;--sub:#736c64;--line:#ece6e4}
*{box-sizing:border-box;margin:0}body{font-family:Pretendard,system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.7;-webkit-font-smoothing:antialiased;letter-spacing:-.011em}
header.top{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);z-index:5}
.wrap{max-width:720px;margin:0 auto;padding:0 20px}
.top .wrap{display:flex;align-items:center;gap:9px;height:58px}
.top img{height:30px}.top b{font-family:Fraunces,serif;font-style:italic;font-size:22px;color:var(--plum);font-weight:500}
.crumb{font-size:12.5px;color:var(--sub);margin:22px 0 6px}.crumb a{color:var(--sub);text-decoration:none}
.crumb a:hover{color:var(--plum)}
.cat{display:inline-block;font-size:12px;font-weight:800;color:var(--plum);background:#f5e9ec;padding:5px 12px;border-radius:999px;letter-spacing:.02em}
h1{font-size:32px;font-weight:800;letter-spacing:-.028em;margin:14px 0 10px;line-height:1.22}
.meta{font-size:13px;color:var(--sub);margin-bottom:26px;padding-bottom:22px;border-bottom:1px solid var(--line)}
article h2{font-size:21px;font-weight:800;letter-spacing:-.022em;margin:34px 0 10px}
article p{margin:12px 0;font-size:16.5px;color:#2b2226}
article ul{margin:12px 0;padding-left:20px}article li{margin:8px 0;font-size:16.5px;color:#2b2226}
article strong{color:var(--plum)}
article a{color:var(--plum);font-weight:700;text-underline-offset:2px}
.cta{margin:34px 0;padding:22px;background:var(--cream);border-radius:18px;text-align:center}
.cta p{font-size:15px;color:#4a3d41;margin:0 0 14px}
.cta a{display:inline-flex;align-items:center;gap:7px;background:var(--plum);color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:13px 26px;border-radius:999px}
.faqh{font-size:21px;font-weight:800;margin:38px 0 6px}
.faq{border-top:1px solid var(--line);padding:16px 0}.faq h3{font-size:16.5px;font-weight:800;margin-bottom:6px}.faq p{font-size:15.5px;color:#4a3d41;margin:0}
.rels{margin:40px 0 20px}.rels h2{font-size:18px;font-weight:800;margin-bottom:12px}
.rel{display:block;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:10px;font-weight:700;font-size:15.5px}
.rel:hover{border-color:var(--plum)}
.rel span{display:block;font-size:12px;color:var(--plum);font-weight:800;margin-bottom:3px}
footer{border-top:1px solid var(--line);margin-top:30px;padding:26px 0;font-size:12.5px;color:var(--sub)}
footer a{color:var(--sub);text-decoration:none;margin-right:14px}
footer a:hover{color:var(--plum)}
@media(max-width:640px){h1{font-size:26px}}
</style></head><body>
<header class="top"><div class="wrap"><a href="/community" style="display:flex;align-items:center;gap:9px;text-decoration:none"><img src="/logo-mark.png" alt="Beautia"><b>Beautia</b></a></div></header>
<div class="wrap">
<div class="crumb"><a href="/community">Beautia</a> › <a href="/guides">Guides</a></div>
<span class="cat">${esc(g.catLabel || 'Guide')}</span>
<h1>${esc(g.title)}</h1>
<div class="meta">${g.read} min read · Updated ${esc(g.updated)}</div>
<article>${g.body}
<div class="cta"><p>Looking for someone who does the look you want?<br>Browse real portfolios and book in English.</p><a href="/designers">See the designers →</a></div>
${faqHtml}
</article>
<div class="rels"><h2>Read next</h2>${relatedLinks(slug)}</div>
</div>
<footer><div class="wrap"><a href="/community">Home</a><a href="/designers">Designers</a><a href="/guides">Guides</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><div style="margin-top:10px">© Beautia · Your style, found.</div></div></footer>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).end(html);
}

function page404() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Guide not found — Beautia</title><meta name="robots" content="noindex"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"></head><body style="font-family:Pretendard,sans-serif;text-align:center;padding:80px 20px"><h1 style="font-size:22px">Guide not found</h1><a style="margin-top:20px;display:inline-block;color:#6E4A50;font-weight:700" href="/guides">See all guides →</a></body></html>`;
}

export { GUIDES, ORDER };
