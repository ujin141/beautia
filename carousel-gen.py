# -*- coding: utf-8 -*-
# Beautia 인스타 캐러셀 생성기 (1080x1350) — "일본 소도시 뷰티"
import os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"_carousel_html")
os.makedirs(OUT,exist_ok=True)

TPL=r"""<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;}
html,body{width:1080px;height:1350px;}
.slide{width:1080px;height:1350px;position:relative;overflow:hidden;padding:96px 88px;display:flex;flex-direction:column;
  font-family:'Pretendard','Malgun Gothic',sans-serif;}
.light{background:#fff;color:#1A1416;}
.light .kicker{color:#6D4346;}.light .hl{color:#6D4346;}.light .sub{color:#6B6064;}
.plum{background:linear-gradient(155deg,#7A4A4E 0%,#5A363A 60%,#472B2F 100%);color:#fff;}
.plum .kicker{color:#F2D7DB;}.plum .hl{color:#F6CDD2;}.plum .sub{color:rgba(255,255,255,.82);}
.blob{position:absolute;border-radius:50%;}
.light .blob{background:radial-gradient(circle at 30% 30%,#F6E7E9,transparent 70%);width:620px;height:620px;top:-200px;right:-180px;opacity:.8;}
.plum .blob{background:radial-gradient(circle,rgba(255,255,255,.12),transparent 70%);width:560px;height:560px;top:-160px;right:-160px;}
.top{position:relative;display:flex;align-items:center;justify-content:space-between;z-index:2;}
.brand{font-size:26px;font-weight:800;letter-spacing:.14em;}
.light .brand{color:#6D4346;}.plum .brand{color:#fff;}
.pg{font-size:22px;font-weight:700;opacity:.55;font-variant-numeric:tabular-nums;}
.mid{position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;z-index:2;}
.kicker{font-size:26px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:26px;}
.bignum{font-family:'Playfair Display',serif;font-size:230px;font-weight:700;line-height:.9;letter-spacing:-.02em;}
.light .bignum{color:#6D4346;}
.h1{font-size:78px;font-weight:800;line-height:1.24;letter-spacing:-.04em;}
.sub{font-size:38px;font-weight:600;line-height:1.5;margin-top:36px;letter-spacing:-.02em;}
.list{margin-top:44px;display:flex;flex-direction:column;gap:26px;}
.li{display:flex;align-items:flex-start;gap:20px;font-size:40px;font-weight:700;line-height:1.32;letter-spacing:-.02em;}
.li .em{font-size:46px;flex:0 0 auto;line-height:1.1;}
.li small{display:block;font-size:30px;font-weight:600;color:#9A8488;margin-top:4px;}
.plum .li small{color:rgba(255,255,255,.7);}
.kv{margin-top:40px;display:flex;flex-direction:column;gap:22px;}
.kv div{font-size:40px;font-weight:800;letter-spacing:-.02em;}
.kv b{color:#6D4346;}.plum .kv b{color:#F6CDD2;}
.kv span{font-weight:600;color:#9A8488;}
.bot{position:relative;z-index:2;}
.note{font-size:28px;font-weight:600;color:#9A8488;}
.plum .note{color:rgba(255,255,255,.78);}
.swipe{display:inline-flex;align-items:center;gap:14px;font-size:32px;font-weight:800;color:#6D4346;background:#F7F1F2;border:2px solid #EADFE1;padding:18px 32px;border-radius:999px;}
.cta{font-size:34px;font-weight:800;}
.handle{font-size:30px;font-weight:700;opacity:.85;margin-top:10px;}
/* 인스타 팔로우 카드 */
.igcard{background:#fff;border:1px solid #EADFE1;border-radius:40px;padding:72px 56px 60px;text-align:center;box-shadow:0 44px 100px -44px rgba(40,24,28,.34);}
.igav{width:210px;height:210px;border-radius:50%;margin:0 auto 30px;padding:7px;background:linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4);}
.igav .inner{width:100%;height:100%;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;border:5px solid #fff;overflow:hidden;}
.igav img{width:74%;height:74%;object-fit:contain;}
.ighandle{font-size:54px;font-weight:800;letter-spacing:-.02em;color:#1A1416;}
.igbio{font-size:32px;color:#6B6064;margin-top:16px;font-weight:600;line-height:1.4;}
.igfollow{display:flex;align-items:center;justify-content:center;gap:14px;background:#6D4346;color:#fff;font-size:44px;font-weight:800;padding:30px;border-radius:22px;letter-spacing:-.02em;margin-top:44px;}
</style></head>
<body><div class="slide __MODE__">
<div class="blob"></div>
<div class="top"><span class="brand">✄ BEAUTIA</span><span class="pg">__PG__</span></div>
<div class="mid">__MID__</div>
<div class="bot">__BOT__</div>
</div></body></html>"""

def hl(s): return s.replace("§",'<span class="hl">',1).replace("§","</span>",1) if "§" in s else s

S=[
 dict(mode="plum",pg="1 / 7",
   mid='<div class="kicker">일본 소도시 뷰티</div><div class="bignum" style="color:#F6CDD2">945만</div><div class="h1" style="margin-top:24px">올해 일본 간 한국인.<br>근데 다들 <span class="hl">도쿄</span>만 가더라 🫠</div>',
   bot='<span class="swipe" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);color:#fff">→ 밀어서 보기 · 저장 🔖</span>'),
 dict(mode="light",pg="2 / 7",
   mid='<div class="kicker">TREND</div><div class="h1">요즘 진짜 트렌드는<br>일본 <span class="hl">소도시</span></div><div class="sub">도쿄·오사카는 너무 붐벼서 🥵<br>조용 · 로컬 감성 · 디자인 퀄리티</div>',
   bot='<div class="note">한국인 여행, 이제 소도시로 이동 중</div>'),
 dict(mode="light",pg="3 / 7",
   mid='<div class="kicker">BUT</div><div class="h1">근데 소도시 가면<br>미용실이 전부 <span class="hl">일본어</span> 😱</div><div class="sub">한국어 메뉴? 거의 없어요.<br>"다운펌이 일본어로 뭐지…"</div>',
   bot='<div class="note">언어 때문에 그냥 포기하는 사람 많음</div>'),
 dict(mode="plum",pg="4 / 7",
   mid='<div class="kicker">SOLUTION</div><div class="h1">그래서 정리했어요.<br><span class="hl">소도시별</span> 뷰티<br>받는 법 👇</div>',
   bot='<div class="note">오키나와 · 가나자와 · 요코하마 · 고베</div>'),
 dict(mode="light",pg="5 / 7",
   mid='<div class="kicker">소도시 뷰티 MAP</div><div class="list">'
       '<div class="li"><span class="em">🏖</span><div>오키나와<small>네일 · 속눈썹 (여행 사진용)</small></div></div>'
       '<div class="li"><span class="em">⛰️</span><div>가나자와<small>차분한 분위기 헤어살롱</small></div></div>'
       '<div class="li"><span class="em">🌊</span><div>요코하마<small>도쿄 근교 당일치기</small></div></div>'
       '<div class="li"><span class="em">🥩</span><div>고베<small>트렌디 네일 · 헤어</small></div></div>'
       '</div>',
   bot='<div class="note">가격은 한국과 비슷, 디자인 퀄은 일본이 강점</div>'),
 dict(mode="light",pg="6 / 7",
   mid='<div class="kicker">TIP</div><div class="h1">일본어 못해도 OK ✌️<br>사진 + 이 단어면 끝</div>'
       '<div class="kv"><div>다운펌 <span>=</span> <b>ダウンパーマ</b></div><div>매직 <span>=</span> <b>縮毛矯正</b></div><div>뿌리염색 <span>=</span> <b>リタッチ</b></div></div>',
   bot='<div class="note">사진 2~3장 보여주는 게 제일 확실해요</div>'),
 dict(mode="light",pg="7 / 7",
   mid='<div class="igcard"><div class="igav"><div class="inner"><img src="../logo-icon.png" alt="Beautia"></div></div>'
       '<div class="ighandle">@beautia.japan</div>'
       '<div class="igbio">일본 미용실·네일을 한국어로<br>예약·통역 대행해드려요 🤍</div>'
       '<div class="igfollow">＋ 팔로우</div></div>',
   bot='<div class="note" style="text-align:center">👆 팔로우하면 일본 소도시 뷰티 <b style="color:#6D4346;font-weight:800">다음 편</b>을 놓치지 않아요 · beautia.io</div>'),
]

for i,s in enumerate(S):
    html=TPL.replace("__MODE__",s["mode"]).replace("__PG__",s["pg"]).replace("__MID__",s["mid"]).replace("__BOT__",s["bot"])
    open(os.path.join(OUT,"slide%d.html"%(i+1)),"w",encoding="utf-8").write(html)
print("wrote",len(S),"slides to",OUT)
