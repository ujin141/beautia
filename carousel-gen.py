# -*- coding: utf-8 -*-
# Beautia 인스타 캐러셀 (1080x1350) — "일본 소도시 뷰티" · 슬라이드별 테마 사진(전부 다름)
import os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"_carousel_html")
os.makedirs(OUT,exist_ok=True)
def U(i): return "https://images.unsplash.com/photo-%s?auto=format&fit=crop&w=1080&q=72"%i
# 테마 확인된 이미지만 (슬라이드 주제에 매칭, 7장 모두 다른 사진)
IMG={
 'tokyo':U('1503899036084-c55cdd92da26'),   # 일본 도시
 'street':U('1540959733332-eab4deabeeaf'),   # 일본 거리/골목
 'salon':U('1521590832167-7bcbfaa6381f'),    # 미용실 인테리어
 'hairsvc':U('1560066984-138dadb4c035'),     # 헤어 시술
 'nail':U('1604654894610-df63bc536371'),     # 네일
 'hair':U('1512496015851-a90fb38ba796'),     # 헤어
 'cosmetic':U('1596462502278-27bfdc403348'), # 화장품
}

TPL=r"""<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&display=swap">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;}
html,body{width:1080px;height:1350px;}
.slide{width:1080px;height:1350px;position:relative;overflow:hidden;padding:96px 88px;display:flex;flex-direction:column;
  font-family:'Pretendard','Malgun Gothic',sans-serif;color:#fff;background-size:cover;background-position:center;}
.slide:before{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(26,18,16,.42) 0%,rgba(26,18,16,.55) 45%,rgba(40,22,26,.86) 100%);}
.slide.soft:before{background:linear-gradient(180deg,rgba(255,255,255,.62),rgba(247,241,242,.82));}
.top,.mid,.bot{position:relative;z-index:2;}
.top{display:flex;align-items:center;justify-content:space-between;}
.brand{font-size:26px;font-weight:800;letter-spacing:.14em;color:#fff;}
.soft .brand{color:#6D4346;}
.pg{font-size:22px;font-weight:700;opacity:.7;font-variant-numeric:tabular-nums;}
.soft .pg{color:#6D4346;opacity:.55;}
.mid{flex:1;display:flex;flex-direction:column;justify-content:center;}
.kicker{font-size:26px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin-bottom:26px;color:#F6CDD2;}
.bignum{font-family:'Playfair Display',serif;font-size:240px;font-weight:700;line-height:.9;letter-spacing:-.02em;color:#fff;text-shadow:0 4px 30px rgba(0,0,0,.35);}
.h1{font-size:80px;font-weight:800;line-height:1.22;letter-spacing:-.04em;text-shadow:0 2px 20px rgba(0,0,0,.32);}
.hl{color:#F6CDD2;}
.sub{font-size:38px;font-weight:600;line-height:1.5;margin-top:36px;letter-spacing:-.02em;color:rgba(255,255,255,.92);text-shadow:0 2px 14px rgba(0,0,0,.3);}
.list{margin-top:40px;display:flex;flex-direction:column;gap:24px;}
.li{display:flex;align-items:flex-start;gap:20px;font-size:42px;font-weight:800;line-height:1.3;letter-spacing:-.02em;text-shadow:0 2px 14px rgba(0,0,0,.35);}
.li .em{font-size:48px;flex:0 0 auto;}
.li small{display:block;font-size:30px;font-weight:600;color:rgba(255,255,255,.82);margin-top:4px;}
.kv{margin-top:40px;display:flex;flex-direction:column;gap:22px;}
.kv div{font-size:42px;font-weight:800;letter-spacing:-.02em;text-shadow:0 2px 14px rgba(0,0,0,.35);}
.kv b{color:#F6CDD2;}.kv span{font-weight:600;color:rgba(255,255,255,.72);}
.note{font-size:30px;font-weight:600;color:rgba(255,255,255,.92);text-shadow:0 2px 12px rgba(0,0,0,.3);}
.soft .note{color:#6B6064;text-shadow:none;}
.swipe{display:inline-flex;align-items:center;gap:14px;font-size:32px;font-weight:800;color:#fff;background:rgba(255,255,255,.16);border:2px solid rgba(255,255,255,.4);padding:18px 34px;border-radius:999px;backdrop-filter:blur(4px);}
/* 인스타 팔로우 카드 */
.igcard{background:#fff;border-radius:40px;padding:72px 56px 60px;text-align:center;box-shadow:0 50px 110px -40px rgba(20,10,12,.5);}
.igav{width:210px;height:210px;border-radius:50%;margin:0 auto 30px;padding:7px;background:linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4);}
.igav .inner{width:100%;height:100%;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;border:5px solid #fff;overflow:hidden;}
.igav img{width:74%;height:74%;object-fit:contain;}
.ighandle{font-size:54px;font-weight:800;letter-spacing:-.02em;color:#1A1416;}
.igbio{font-size:32px;color:#6B6064;margin-top:16px;font-weight:600;line-height:1.4;}
.igfollow{display:flex;align-items:center;justify-content:center;gap:14px;background:#6D4346;color:#fff;font-size:44px;font-weight:800;padding:30px;border-radius:22px;letter-spacing:-.02em;margin-top:44px;}
</style></head>
<body><div class="slide __CLS__" style="background-image:__BG__">
<div class="top"><span class="brand">✄ BEAUTIA</span><span class="pg">__PG__</span></div>
<div class="mid">__MID__</div>
<div class="bot">__BOT__</div>
</div></body></html>"""

S=[
 dict(pg="1 / 7",img='tokyo',
   mid='<div class="kicker">일본 소도시 뷰티</div><div class="bignum">945만</div><div class="h1" style="margin-top:24px">올해 일본 간 한국인.<br>근데 다들 <span class="hl">도쿄</span>만 가더라 🫠</div>',
   bot='<span class="swipe">→ 밀어서 보기 · 저장 🔖</span>'),
 dict(pg="2 / 7",img='street',
   mid='<div class="kicker">TREND</div><div class="h1">요즘 진짜 트렌드는<br>일본 <span class="hl">소도시</span></div><div class="sub">도쿄·오사카는 너무 붐벼서 🥵<br>조용 · 로컬 감성 · 디자인 퀄리티</div>',
   bot='<div class="note">한국인 여행, 이제 소도시로 이동 중</div>'),
 dict(pg="3 / 7",img='salon',
   mid='<div class="kicker">BUT</div><div class="h1">근데 소도시 가면<br>미용실이 전부 <span class="hl">일본어</span> 😱</div><div class="sub">한국어 메뉴? 거의 없어요.<br>"다운펌이 일본어로 뭐지…"</div>',
   bot='<div class="note">언어 때문에 그냥 포기하는 사람 많음</div>'),
 dict(pg="4 / 7",img='hairsvc',
   mid='<div class="kicker">SOLUTION</div><div class="h1">그래서 정리했어요.<br><span class="hl">소도시별</span> 뷰티<br>받는 법 👇</div>',
   bot='<div class="note">오키나와 · 가나자와 · 요코하마 · 고베</div>'),
 dict(pg="5 / 7",img='nail',
   mid='<div class="kicker">소도시 뷰티 MAP</div><div class="list">'
       '<div class="li"><span class="em">🏖</span><div>오키나와<small>네일 · 속눈썹 (여행 사진용)</small></div></div>'
       '<div class="li"><span class="em">⛰️</span><div>가나자와<small>차분한 분위기 헤어살롱</small></div></div>'
       '<div class="li"><span class="em">🌊</span><div>요코하마<small>도쿄 근교 당일치기</small></div></div>'
       '<div class="li"><span class="em">🥩</span><div>고베<small>트렌디 네일 · 헤어</small></div></div></div>',
   bot='<div class="note">가격은 한국과 비슷, 디자인 퀄은 일본이 강점</div>'),
 dict(pg="6 / 7",img='hair',
   mid='<div class="kicker">TIP</div><div class="h1">일본어 못해도 OK ✌️<br>사진 + 이 단어면 끝</div>'
       '<div class="kv"><div>다운펌 <span>=</span> <b>ダウンパーマ</b></div><div>매직 <span>=</span> <b>縮毛矯正</b></div><div>뿌리염색 <span>=</span> <b>リタッチ</b></div></div>',
   bot='<div class="note">사진 2~3장 보여주는 게 제일 확실해요</div>'),
 dict(pg="7 / 7",img='cosmetic',cls='soft',
   mid='<div class="igcard"><div class="igav"><div class="inner"><img src="../logo-icon.png" alt="Beautia"></div></div>'
       '<div class="ighandle">@beautia.japan</div>'
       '<div class="igbio">일본 미용실·네일을 한국어로<br>예약·통역 대행해드려요 🤍</div>'
       '<div class="igfollow">＋ 팔로우</div></div>',
   bot='<div class="note" style="text-align:center">👆 팔로우하면 일본 소도시 뷰티 <b style="color:#6D4346;font-weight:800">다음 편</b>을 놓치지 않아요 · beautia.io</div>'),
]

for i,s in enumerate(S):
    bg="url('%s')"%IMG[s['img']]
    html=(TPL.replace("__CLS__",s.get('cls','')).replace("__BG__",bg)
            .replace("__PG__",s['pg']).replace("__MID__",s['mid']).replace("__BOT__",s['bot']))
    open(os.path.join(OUT,"slide%d.html"%(i+1)),"w",encoding="utf-8").write(html)
print("wrote",len(S),"slides (themed photos, all distinct):",", ".join(s['img'] for s in S))
