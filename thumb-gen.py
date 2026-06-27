# -*- coding: utf-8 -*-
# Beautia 썸네일 시리즈 생성기 — 제목/칩만 바꿔서 통일감 있게 찍어내기
# 사용: 아래 CONFIGS에 항목 추가 → python thumb-gen.py → scratchpad에 .html 생성 → chrome로 렌더
import os
OUTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_thumb_html")
os.makedirs(OUTDIR, exist_ok=True)

TPL = r"""<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
 *{margin:0;padding:0;box-sizing:border-box;}
 :root{--plum:#6D4346;--ink:#1A1416;--soft:#F7F1F2;--line:#EADFE1;}
 html,body{width:1200px;height:900px;}
 .wrap{width:1200px;height:900px;position:relative;overflow:hidden;
   font-family:'Pretendard','Malgun Gothic','Yu Gothic','Meiryo',sans-serif;}
 /* ===== LIGHT ===== */
 .light{background:#fff;}
 .light .frame{border:1.5px solid var(--line);}
 .light .kick{color:var(--plum);} .light .kick .dot{background:var(--plum);}
 .light .h1{color:var(--ink);} .light .h1 .hl{color:var(--plum);}
 .light .sub{color:#5C5054;}
 .light .chip{color:var(--plum);background:var(--soft);border:1.5px solid var(--line);}
 .light .chip span{color:#9A8488;}
 .light .foot{color:var(--ink);} .light .foot b{color:var(--plum);} .light .arr{color:var(--plum);}
 .light .b1{background:radial-gradient(circle at 30% 30%,#F3E4E6,#fff);}
 .light .b2{background:radial-gradient(circle at 40% 40%,#F7F1F2,#fff);}
 /* ===== PLUM ===== */
 .plum{background:linear-gradient(135deg,#7A4A4E 0%,#5A363A 60%,#482C30 100%);}
 .plum .frame{border:1.5px solid rgba(255,255,255,.22);}
 .plum .kick{color:#F2D7DB;} .plum .kick .dot{background:#F2D7DB;}
 .plum .h1{color:#fff;} .plum .h1 .hl{color:#F6CDD2;}
 .plum .sub{color:rgba(255,255,255,.82);}
 .plum .chip{color:#fff;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.28);}
 .plum .chip span{color:rgba(255,255,255,.66);}
 .plum .foot{color:#fff;} .plum .foot b{color:#F6CDD2;} .plum .arr{color:#F6CDD2;}
 .plum .b1{background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.14),transparent);}
 .plum .b2{background:radial-gradient(circle at 40% 40%,rgba(255,255,255,.10),transparent);}
 /* ===== shared ===== */
 .blob{position:absolute;border-radius:50%;opacity:.7;}
 .b1{width:520px;height:520px;top:-160px;right:-120px;}
 .b2{width:420px;height:420px;bottom:-160px;left:-120px;}
 .frame{position:absolute;inset:46px;border-radius:34px;}
 .inner{position:absolute;inset:46px;padding:84px 92px;display:flex;flex-direction:column;}
 .kick{display:inline-flex;align-items:center;gap:12px;font-size:23px;font-weight:800;letter-spacing:.06em;}
 .kick .dot{width:9px;height:9px;border-radius:50%;}
 .h1{margin-top:38px;font-size:__TITLESIZE__px;line-height:1.16;font-weight:800;letter-spacing:-.02em;}
 .sub{margin-top:30px;font-size:34px;font-weight:600;letter-spacing:-.01em;}
 .chips{margin-top:auto;display:flex;gap:16px;flex-wrap:wrap;__CHIPSDISPLAY__}
 .chip{font-size:30px;font-weight:700;padding:16px 28px;border-radius:999px;}
 .chip span{font-weight:600;font-size:25px;margin-left:8px;}
 .foot{position:absolute;bottom:96px;right:104px;font-size:30px;font-weight:800;letter-spacing:.02em;}
 .arr{margin:0 16px;font-weight:800;}
</style></head>
<body><div class="wrap __MODE__">
 <div class="blob b1"></div><div class="blob b2"></div>
 <div class="frame"></div>
 <div class="inner">
   <div class="kick"><span class="dot"></span>__KICK__</div>
   <div class="h1">__TITLE__</div>
   <div class="sub">__SUB__</div>
   <div class="chips">__CHIPS__</div>
 </div>
 <div class="foot">__FOOT__</div>
</div></body></html>"""

def chip(ko, read):
    return '<div class="chip">%s<span>%s</span></div>' % (ko, read)

# 시리즈 항목: name, mode(light/plum), kick, title(§...§=강조), sub, chips[(ko,read)], foot, titlesize
CONFIGS = [
 dict(name="korean-phrases-plum", mode="plum",
   kick="BEAUTIA · 韓国ビューティー情報",
   title="韓国の美容室で<br>使える§韓国語§<br>フレーズ集",
   sub="発音つき｜予約 · カット · パーマ · カラー",
   chips=[("예약했어요","イェヤッケッソヨ"),("컷","コッ"),("펌","ポム"),("이 사진처럼","この写真みたいに")],
   foot='日本語 <span class="arr">↔</span> 한국어 · <b>beautia.io</b>', titlesize=88),
 dict(name="korean-phrases-big", mode="light",
   kick="BEAUTIA · 韓国ビューティー情報",
   title="韓国の美容室で<br>使える§韓国語§",
   sub="発音つき｜予約 · カット · カラー · ネイル",
   chips=[], titlesize=112,
   foot='日本語 <span class="arr">↔</span> 한국어 · <b>beautia.io</b>'),
 dict(name="japanese-phrases", mode="light",
   kick="BEAUTIA · 日本ビューティー情報",
   title="일본 미용실에서<br>쓰는 §일본어§",
   sub="발음 함께｜예약 · 컷 · 펌 · 염색",
   chips=[("予約しました","예약했어요"),("ダウンパーマ","다운펌"),("縮毛矯正","매직"),("この写真みたいに","이 사진처럼")],
   foot='한국어 <span class="arr">↔</span> 日本語 · <b>beautia.io</b>', titlesize=88),
 dict(name="korean-nail-booking", mode="plum",
   kick="BEAUTIA · 韓国ビューティー情報",
   title="韓国でネイルを<br>§予約§する方法",
   sub="ネイバー予約・カカオ・インスタDM",
   chips=[("젤네일","ジェルネイル"),("이 디자인으로","このデザインで"),("얼마예요?","いくらですか")],
   foot='日本語 <span class="arr">↔</span> 한국어 · <b>beautia.io</b>', titlesize=92),
]

for c in CONFIGS:
    title = c["title"].replace("§", '<span class="hl">', 1).replace("§", "</span>", 1)
    chips_html = "".join(chip(k, r) for k, r in c["chips"])
    html = (TPL
        .replace("__MODE__", c["mode"])
        .replace("__KICK__", c["kick"])
        .replace("__TITLE__", title)
        .replace("__SUB__", c["sub"])
        .replace("__CHIPS__", chips_html)
        .replace("__CHIPSDISPLAY__", "display:none;" if not c["chips"] else "")
        .replace("__FOOT__", c["foot"])
        .replace("__TITLESIZE__", str(c["titlesize"])))
    path = os.path.join(OUTDIR, c["name"] + ".html")
    open(path, "w", encoding="utf-8").write(html)
    print(c["name"])
print("HTML ->", OUTDIR)
