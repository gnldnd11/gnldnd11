"""프로필 이미지 렌더러.

0to1.saegim.studio 의 라이브 현황판과 VS Code 마켓플레이스에서 오늘 수치를 읽어
assets/ 아래에 헤더와 현황판 PNG 를 다크·라이트로 그린다.
그리기는 헤드리스 Chrome 이 한다. 서체는 사이트와 같은 Pretendard, JetBrains Mono 를 CDN 에서 받는다.

사용법:  python scripts/render.py            (수집 + 렌더)
         python scripts/render.py --offline  (assets/data.json 으로만 렌더)
"""
from __future__ import annotations

import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
TEMPLATES = ROOT / "scripts" / "templates"
DATA = ASSETS / "data.json"

LAB_URL = "https://0to1.saegim.studio/lab/"
MARKET_URL = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery"
EXTENSIONS = ["saegim.claude-usage-crab", "saegim.harbormaster"]

PALETTE = {
    "dark": dict(
        canvas="#05141a", paper="#0c1f23", line="#1c3a3d", text="#eef2f8", muted="#8f9caa",
        dim="#71808f", accent="#5fd3cf", num="#4ec8c5", ok="#4ade80", warn="#d9a53b", fail="#ef5a73",
        mint="#35b0ad", idle="#1a3238", glow="rgba(95,211,207,.18)",
    ),
    "light": dict(
        canvas="#f7f9fb", paper="#ffffff", line="#e7ecf1", text="#0c1f23", muted="#5b6b74",
        dim="#8593a0", accent="#1f8f8c", num="#2f9e9b", ok="#0b7a3b", warn="#b45309", fail="#e11d48",
        mint="#2f9e9b", idle="#e2e8f0", glow="rgba(47,158,155,.16)",
    ),
}

KST = timezone(timedelta(hours=9))


def fetch(url: str, data: bytes | None = None, headers: dict | None = None) -> str:
    req = urllib.request.Request(url, data=data, headers=headers or {"User-Agent": "profile-render/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def strip_tags(page: str) -> list[str]:
    body = re.sub(r"<script.*?</script>|<style.*?</style>", "", page, flags=re.S)
    text = html.unescape(re.sub(r"<[^>]+>", "|", body))
    return [t.strip() for t in text.split("|") if t.strip()]


def parse_lab(page: str) -> dict:
    tokens = strip_tags(page)

    def index_of(value: str, start: int = 0) -> int:
        for i in range(start, len(tokens)):
            if tokens[i] == value:
                return i
        raise ValueError(f"lab page: '{value}' not found")

    i = index_of("Live")
    as_of = tokens[i + 1]
    status_line = tokens[i + 4] if tokens[i + 3].endswith("->") else tokens[i + 3]
    summary = []
    j = index_of(status_line) + 1
    while j < len(tokens) and not tokens[j].startswith("자동화"):
        summary.append(tokens[j])
        j += 1

    # 자동화 | 7 | ? | 이름 | 마지막 실행 | · | 주기 | 84% | 상태 | ...
    j = index_of("자동화")
    count = int(tokens[j + 1])
    j += 3
    automations = []
    while len(automations) < count:
        name, last, dot, schedule, pct, state = tokens[j:j + 6]
        if dot != "·":
            raise ValueError(f"lab page: automation row shape changed near {tokens[j:j+6]}")
        automations.append(dict(name=name, last=last, schedule=schedule, pct=int(pct.rstrip("%")), state=state))
        j += 6

    # 문서 신선도 | 16 | ? | rag | 53 | % | llm-judge | 91 | mcp | 95 ...
    j = index_of("문서 신선도", start=j)
    count = int(tokens[j + 1])
    j += 3
    freshness = []
    while len(freshness) < count:
        name, score = tokens[j], tokens[j + 1]
        j += 2
        if j < len(tokens) and tokens[j] == "%":
            j += 1
        freshness.append(dict(name=name, score=int(score)))

    return dict(as_of=as_of, status_line=status_line, summary=" ".join(summary),
                automations=automations, freshness=freshness)


def fetch_market() -> list[dict]:
    body = json.dumps({
        "filters": [{"criteria": [{"filterType": 7, "value": e} for e in EXTENSIONS]}],
        "flags": 914,
    }).encode()
    page = fetch(MARKET_URL, body, {
        "Content-Type": "application/json",
        "Accept": "application/json;api-version=3.0-preview.1",
        "User-Agent": "profile-render/1.0",
    })
    out = []
    for ext in json.loads(page)["results"][0]["extensions"]:
        stats = {s["statisticName"]: s["value"] for s in ext.get("statistics", [])}
        out.append(dict(
            id=f'{ext["publisher"]["publisherName"]}.{ext["extensionName"]}',
            name=ext["displayName"],
            installs=int(stats.get("install", 0)),
            version=ext["versions"][0]["version"],
        ))
    return out


def collect() -> dict:
    lab = parse_lab(fetch(LAB_URL))
    market = fetch_market()
    return dict(fetched_at=datetime.now(KST).strftime("%Y-%m-%d %H:%M"), lab=lab, market=market)


def state_color(state: str, p: dict) -> str:
    return {"정상": p["ok"], "불안정": p["warn"]}.get(state, p["fail"])


def fresh_color(score: int, p: dict) -> str:
    if score >= 70:
        return p["ok"]
    if score >= 40:
        return p["warn"]
    return p["fail"]


def render_live(data: dict, theme: str) -> str:
    p = PALETTE[theme]
    lab = data["lab"]
    rows = []
    for a in lab["automations"]:
        color = state_color(a["state"], p)
        rows.append(f"""
        <div class="row">
          <div class="name">{html.escape(a["name"])}</div>
          <div class="meta">{html.escape(a["schedule"])}</div>
          <div class="bar"><i style="width:{a["pct"]}%;background:{color}"></i></div>
          <div class="pct" style="color:{color}">{a["pct"]}%</div>
          <div class="state" style="color:{color}">{html.escape(a["state"])}</div>
          <div class="last">{html.escape(a["last"])}</div>
        </div>""")
    fresh = []
    for f in lab["freshness"]:
        fresh.append(f"""
        <div class="cell">
          <div class="fbar"><i style="height:{f["score"]}%;background:{fresh_color(f["score"], p)}"></i></div>
          <div class="fscore">{f["score"]}</div>
          <div class="fname">{html.escape(f["name"])}</div>
        </div>""")
    market = " &nbsp;·&nbsp; ".join(
        f'{html.escape(m["name"])} <b>{m["installs"]:,}</b> installs' for m in data["market"]
    )
    ok_line = lab["status_line"]
    tpl = Template((TEMPLATES / "live.html").read_text(encoding="utf-8"))
    return tpl.substitute(
        **p,
        as_of=html.escape(lab["as_of"]),
        ok_line=html.escape(ok_line),
        ok_color=p["ok"] if ok_line == "이상 없음" else p["warn"],
        summary=html.escape(lab["summary"]),
        rows="".join(rows),
        fresh="".join(fresh),
        n_auto=len(lab["automations"]),
        n_fresh=len(lab["freshness"]),
        market=market,
    )


def render_header(theme: str) -> str:
    p = PALETTE[theme]
    tpl = Template((TEMPLATES / "header.html").read_text(encoding="utf-8"))
    return tpl.substitute(**p)


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


def screenshot(html_text: str, out: Path, width: int, height: int) -> None:
    chrome = find_chrome()
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


def main(argv: list[str]) -> None:
    ASSETS.mkdir(exist_ok=True)
    if "--offline" in argv:
        data = json.loads(DATA.read_text(encoding="utf-8"))
    else:
        data = collect()
        DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for theme in ("dark", "light"):
        screenshot(render_header(theme), ASSETS / f"header-{theme}.png", 1200, 300)
        screenshot(render_live(data, theme), ASSETS / f"live-{theme}.png", 1200, 640)
    print("rendered", sorted(p.name for p in ASSETS.glob("*.png")))


if __name__ == "__main__":
    main(sys.argv[1:])
