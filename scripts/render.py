"""프로젝트 카드 렌더러.

scripts/projects.json 의 프로젝트를 scripts/templates/card.html 에 얹어
assets/cards/<slug>-{dark,light}.png 로 그린다. 그리기는 헤드리스 Chrome 이 하고,
서체는 0to1.saegim.studio 와 같은 Pretendard, JetBrains Mono 를 CDN 에서 받는다.

사용법:  python scripts/render.py
"""
from __future__ import annotations

import html
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "assets" / "cards"
TEMPLATE = ROOT / "scripts" / "templates" / "card.html"
PROJECTS = ROOT / "scripts" / "projects.json"

PALETTE = {
    "dark": dict(
        paper="#0c1f23", line="#1c3a3d", text="#eef2f8", muted="#a7b3c1", dim="#71808f",
        accent="#5fd3cf", ok="#4ade80", glow="rgba(95,211,207,.14)",
    ),
    "light": dict(
        paper="#ffffff", line="#e7ecf1", text="#0c1f23", muted="#5b6b74", dim="#8593a0",
        accent="#1f8f8c", ok="#0b7a3b", glow="rgba(47,158,155,.12)",
    ),
}

CARD_W, CARD_H = 580, 176


def bar_color(kind: str, p: dict) -> str:
    return {"ok": p["ok"], "accent": p["accent"]}.get(kind, p["dim"])


def render_card(project: dict, theme: str) -> str:
    p = PALETTE[theme]
    tpl = Template(TEMPLATE.read_text(encoding="utf-8"))
    return tpl.substitute(
        **p,
        bar=bar_color(project.get("kind", "dim"), p),
        tag=html.escape(project["tag"]),
        status=html.escape(project["status"]),
        title=html.escape(project["title"]),
        desc=html.escape(project["desc"]),
        stack=html.escape(project["stack"]),
    )


def find_chrome() -> str:
    for name in ("CHROME", "CHROME_BIN"):
        if os.environ.get(name):
            return os.environ[name]
    candidates = [
        "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ]
    for c in candidates:
        path = shutil.which(c) or (c if os.path.exists(c) else None)
        if path:
            return path
    raise SystemExit("Chrome 을 찾지 못했다. CHROME 환경변수로 경로를 준다.")


def screenshot(chrome: str, html_text: str, out: Path, width: int, height: int) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "page.html"
        src.write_text(html_text, encoding="utf-8")
        cmd = [
            chrome, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
            "--force-device-scale-factor=2", "--default-background-color=00000000",
            "--virtual-time-budget=20000", f"--window-size={width},{height}",
            f"--screenshot={out}", src.as_uri(),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    if not out.exists() or out.stat().st_size < 1000:
        raise SystemExit(f"렌더 실패: {out}")


def main() -> None:
    CARDS.mkdir(parents=True, exist_ok=True)
    chrome = find_chrome()
    projects = json.loads(PROJECTS.read_text(encoding="utf-8"))
    wanted = set()
    for project in projects:
        for theme in ("dark", "light"):
            out = CARDS / f'{project["slug"]}-{theme}.png'
            screenshot(chrome, render_card(project, theme), out, CARD_W, CARD_H)
            wanted.add(out.name)
    for stale in CARDS.glob("*.png"):
        if stale.name not in wanted:
            stale.unlink()
    print(f"rendered {len(wanted)} cards")


if __name__ == "__main__":
    main()
