"""scripts/art/<slug>.html 을 크롬으로 찍어 assets/thumbs/<slug>.jpg 로 둔다. 로컬에서만 돌린다.

python scripts/art.py [slug ...]      # 인자가 없으면 scripts/art/ 의 전부
필요: 크롬(CHROME 환경 변수로 경로 지정 가능), pip install pillow
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "scripts" / "art"
OUT = ROOT / "assets" / "thumbs"
CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
SIZE = {2: (260, 190), 3: (402, 190)}  # 2배로 찍는다. thumbs.py 의 SIZE 와 같다
SPAN = {"amajda-yak": 2, "saegim-works": 2, "nextcal": 2}  # 없으면 3


def main():
    slugs = sys.argv[1:] or [p.stem for p in sorted(ART.glob("*.html"))]
    with tempfile.TemporaryDirectory() as tmp:
        for slug in slugs:
            png = Path(tmp) / f"{slug}.png"
            subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", f"--user-data-dir={tmp}/prof",
                            "--window-size=%d,%d" % SIZE[SPAN.get(slug, 3)], "--force-device-scale-factor=2", "--virtual-time-budget=3000",
                            f"--screenshot={png}", (ART / f"{slug}.html").as_uri()], check=True, capture_output=True)
            path = OUT / f"{slug}.jpg"
            Image.open(png).convert("RGB").save(path, "JPEG", quality=88, optimize=True, progressive=True)
            print(f"{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
