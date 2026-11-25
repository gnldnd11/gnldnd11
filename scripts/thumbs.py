"""0to1 사이트 이미지에서 타일 썸네일을 잘라 assets/thumbs/ 에 둔다. 로컬에서 한 번만 돌린다(CI 는 결과만 쓴다).

python scripts/thumbs.py <0to1 저장소의 public 폴더>
필요: pip install pillow
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "thumbs"

# 타일 칸 수에 따른 썸네일 크기(2배 해상도). bento.mjs 의 THUMB_H 와 비율을 맞춘다.
SIZE = {2: (520, 380), 3: (804, 380), 4: (1088, 380)}

# slug: (원본, 칸 수, 자를 상자 또는 None, 맞춤 방식)
# 원본 경로는 0to1 public 기준. "repo:" 로 시작하면 이 저장소 기준(scripts/captures 의 직접 찍은 화면)
THUMBS = {  # iop-as, amajda-yak, saegim-works, nextcal 은 scripts/art.py 가 그린다
    "noon": ("projects/noon-watch.png", 2, None, "contain"),
    "claude-usage-crab": ("uploads/claude-usage-agents-room.png", 3, (64, 362, 620, 624), "cover"),
    "harbormaster": ("uploads/harbormaster-panel.png", 2, (0, 0, 518, 378), "cover"),
    "saegim-eval": ("img/shots/eval.png", 2, (200, 20, 1380, 881), "cover"),
    "geoubom": ("projects/geoubom-mcp.png", 2, (0, 90, 618, 541), "cover"),
    "power-scanner": ("uploads/power-scanner-entry.png", 2, (0, 320, 636, 784), "cover"),
    "ur-bmt": ("uploads/ur-bmt-chart.png", 2, (0, 0, 690, 500), "cover"),
    "saegim-ai": ("projects/saegim-ai.png", 2, (150, 212, 1060, 877), "cover"),  # 맨 윗줄 사진 칸에 실제 얼굴이 있어 그 아래부터 자른다
    "cms": ("repo:scripts/captures/cms-mock.jpg", 3, (0, 0, 1180, 558), "cover"),  # Mock 모드로 띄워 찍은 화면. 고객사 로고 줄은 뺀다
    "0to1": ("repo:scripts/captures/0to1-lab.jpg", 4, (0, 320, 1360, 795), "cover"),  # 0to1.saegim.studio/lab
    "noon-desktop": ("projects/noon-signal.png", 2, (20, 90, 380, 353), "cover"),
    "nararun": ("uploads/nararun-gwanghwamun.png", 3, None, "cover"),
    "txtfy": ("uploads/txtfy-assembled.png", 2, None, "contain"),
    "transparentfy": ("uploads/transparentfy-hero.png", 3, (0, 0, 1400, 662), "cover"),
    # 아래 둘은 0to1 옆 프로젝트 폴더의 자료다
    "the-ggi": ("../../the-ggi/docs/look/screenshots/20260830/01. 성역 바닥텍스쳐.png", 3, (1000, 400, 3840, 1742), "cover"),
    "room-planner": ("../../room-planner/docs/mockup-main.png", 2, (330, 190, 900, 607), "cover"),
}


def cover(img, size):
    tw, th = size
    w, h = img.size
    s = max(tw / w, th / h)
    img = img.resize((round(w * s), round(h * s)), Image.LANCZOS)
    w, h = img.size
    x, y = (w - tw) // 2, (h - th) // 2
    return img.crop((x, y, x + tw, y + th))


def contain(img, size, bg=(0, 0, 0)):
    tw, th = size
    w, h = img.size
    s = min(tw / w, th / h)
    img = img.resize((round(w * s), round(h * s)), Image.LANCZOS)
    canvas = Image.new("RGB", size, bg)
    canvas.paste(img, ((tw - img.width) // 2, (th - img.height) // 2), img if img.mode == "RGBA" else None)
    return canvas


def main():
    src = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, (rel, span, box, fit) in THUMBS.items():
        img = Image.open(ROOT / rel[5:] if rel.startswith("repo:") else src / rel)
        img = img.convert("RGBA") if fit == "contain" else img.convert("RGB")
        if box:
            img = img.crop(box)
        bg = img.convert("RGB").getpixel((2, 2)) if fit == "contain" else None
        out = contain(img, SIZE[span], bg) if fit == "contain" else cover(img, SIZE[span])
        path = OUT / f"{slug}.jpg"
        out.convert("RGB").save(path, "JPEG", quality=82, optimize=True, progressive=True)
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
