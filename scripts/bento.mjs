// 프로필 벤토 타일을 그린다. 문구·링크는 scripts/projects.json(title, line, status, url), 썸네일은 assets/thumbs/<slug>.jpg.
// 글꼴은 fonts/Paperlogy-*.woff2 에서 타일마다 쓰인 글자만 잘라 SVG 안에 넣는다(README 이미지는 바깥 글꼴을 못 불러온다).
// 필요: node 20, python + fonttools·brotli (pip install fonttools brotli)
// node scripts/bento.mjs             → assets/bento/*.svg, README.md
// node scripts/bento.mjs --preview   → 저장소 루트에 _preview.html(라이트·다크 나란히, 커밋하지 않음)도 쓴다
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = 'assets/bento';
const PY = process.env.PYTHON || 'python';

const PROFILE = { name: 'Hwiwoong Kim', handle: '@gnldnd11', role: 'AI Engineer · LLM apps, RAG, agents and evals' };

// 한 줄 = 6칸. span 은 칸 수, h 는 그 줄 높이(px). 썸네일은 scripts/thumbs.py 가 칸 수에 맞춰 자른다.
const ROWS = [
  { h: 180, tiles: [{ id: 'intro', span: 4 }, { id: 'stats', span: 2 }] },
  { heading: 'Featured · AI systems' },
  { h: 296, tiles: [{ id: 'claude-usage-crab', span: 3 }, { id: 'iop-as', span: 3 }] },
  { h: 318, tiles: [{ id: 'saegim-ai', span: 2 }, { id: 'saegim-works', span: 2 }, { id: 'saegim-eval', span: 2 }] },
  { heading: 'More projects' },
  { h: 318, tiles: [{ id: 'noon', span: 2 }, { id: 'noon-desktop', span: 2 }, { id: 'amajda-yak', span: 2 }] },
  { h: 296, tiles: [{ id: '0to1', span: 4 }, { id: 'nextcal', span: 2 }] },
  { h: 296, tiles: [{ id: 'cms', span: 3 }, { id: 'the-ggi', span: 3 }] },
  { h: 318, tiles: [{ id: 'harbormaster', span: 2 }, { id: 'room-planner', span: 2 }, { id: 'ur-bmt', span: 2 }] },
  { h: 296, tiles: [{ id: 'transparentfy', span: 3 }, { id: 'nararun', span: 3 }] },
  { h: 318, tiles: [{ id: 'txtfy', span: 2 }, { id: 'geoubom', span: 2 }, { id: 'power-scanner', span: 2 }] },
];
const THUMB_H = 190;

// 직접 그린 썸네일(scripts/art/<slug>.html)은 그림으로 찍지 않고 HTML 을 그대로 넣어 CSS 애니메이션이 돈다.
// 그림 안에서는 스크립트가 돌지 않으므로 art HTML 은 CSS 만 쓴다. 폭은 art.py 의 SIZE 와 같다
const ART_DIR = join(ROOT, 'scripts/art');
const ART_W = { 2: 260, 3: 402 };

// 캡처 썸네일의 움직임(GitHub 는 호버를 받지 않아 저절로 돈다). kenburns = 천천히 확대·이동, glitch = 잠깐 흔들림,
// blink = 눈 위에 눈꺼풀을 덮는다(eyes 는 썸네일 520×380 기준 눈 상자 x0, y0, x1, y1)
const MOTION = {
  noon: { kind: 'blink', eyes: [[198, 155, 252, 234], [289, 155, 343, 234]] },
  'noon-desktop': { kind: 'glitch' },
  '0to1': { kind: 'kenburns' },
  cms: { kind: 'kenburns' },
  'the-ggi': { kind: 'kenburns' },
  nararun: { kind: 'kenburns' },
  'claude-usage-crab': { kind: 'kenburns' },
};
const THUMB_SRC = { w: 520, h: 380 };

// 움직임 스위치. 20개 타일이 한꺼번에 돌면 브라우저가 버벅여 11-24 에 껐다(false 면 모든 애니메이션을 멈춘 첫 장면)
const ANIMATE = false;

// 켜 두어도 동작 줄이기를 켠 사람에게는 멈춰 보인다
const MOTION_CSS = ANIMATE ? '@media (prefers-reduced-motion: reduce){*{animation:none!important}}' : '*{animation:none!important}';
const LOOK = { noon: 'watch' };
const TONE = { Shipped: 'ship', Live: 'live', Delivered: 'live', Production: 'live', Running: 'live', Building: 'wip', Prototype: 'wip', Contest: 'contest', Done: 'done', Ended: 'done' };

const TOTAL_W = 852; // 타일마다 바깥 6px 여백이 있어 이웃 타일 사이는 12px
const M = 6;
const FONTS = { 400: 'fonts/Paperlogy-4Regular.woff2', 600: 'fonts/Paperlogy-6SemiBold.woff2', 700: 'fonts/Paperlogy-7Bold.woff2' };
const FAMILY = "Paperlogy, Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

const THEMES = {
  light: {
    base: { bg: '#F6F5F1', border: '1px solid #E4E2DA', fg: '#17171A', sub: '#66645E', body: '#3A3935', line: '#E4E2DA' },
    invert: { bg: '#17171A', border: '1px solid #17171A', fg: '#F2F1EC', sub: '#B9B7AF', body: '#D6D4CC' },
    watch: { bg: '#000000', border: '1px solid #000000', fg: '#F2F1EC', sub: '#B9B7AF', body: '#D6D4CC', line: '#000000' },
    muted: { bg: 'transparent', border: '1.5px dashed #C9C6BC', fg: '#3A3935', sub: '#66645E', body: '#4A4843', line: '#E4E2DA' },
    flagship: '#F5B400',
    tone: { ship: '#C2410C', live: '#1D4ED8', contest: '#6D28D9', wip: '#B45309', done: '#66645E' },
  },
  dark: {
    base: { bg: '#161B22', border: '1px solid #30363D', fg: '#E6EDF3', sub: '#9198A1', body: '#C9D1D9', line: '#30363D' },
    invert: { bg: '#F2F1EC', border: '1px solid #F2F1EC', fg: '#17171A', sub: '#5E5C57', body: '#3A3935' },
    watch: { bg: '#000000', border: '1px solid #30363D', fg: '#E6EDF3', sub: '#9198A1', body: '#C9D1D9', line: '#000000' },
    muted: { bg: 'transparent', border: '1.5px dashed #3D444D', fg: '#C9D1D9', sub: '#9198A1', body: '#9198A1', line: '#30363D' },
    flagship: '#E3B341',
    tone: { ship: '#F0883E', live: '#58A6FF', contest: '#BC8CFF', wip: '#D29922', done: '#9198A1' },
  },
};

const projects = Object.fromEntries(
  JSON.parse(readFileSync(join(ROOT, 'scripts/projects.json'), 'utf8')).map((p) => [p.slug, p]),
);

// VS Code 마켓플레이스 공개 수치(설치 수·평점). 생성 때 받아 오고, 못 받으면 projects.json 의 stats 를 쓴다
async function fetchMarketplaceStats(id) {
  const res = await fetch('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json;api-version=3.0-preview.1' },
    body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: id }] }], flags: 256 }),
    signal: AbortSignal.timeout(15000),
  });
  const ext = (await res.json()).results?.[0]?.extensions?.[0];
  const st = Object.fromEntries((ext?.statistics ?? []).map((s) => [s.statisticName, s.value]));
  if (!st.install) throw new Error('no stats');
  return { installs: Math.round(st.install), rating: st.averagerating ?? null };
}
for (const p of Object.values(projects)) {
  if (!p.marketplace) continue;
  try {
    p.stats = { ...p.stats, ...(await fetchMarketplaceStats(p.marketplace)) };
  } catch (e) {
    console.warn(`마켓플레이스 수치를 못 받아 저장된 값을 쓴다(${p.slug}): ${e.message}`);
  }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const widthOf = (span) => Math.round((TOTAL_W / 6) * span);

// 타일 하나를 그리는 동안 굵기별로 쓰인 글자를 모은다.
let glyphs;
const T = (s, w = 400) => { glyphs[w] += s; return esc(s); };

// ── 글꼴 잘라 넣기 ───────────────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), 'bento-'));
const subsetCache = new Map();
function subset(weight, text) {
  const chars = [...new Set(text + ' ')].sort().join('');
  const key = weight + '|' + chars;
  if (subsetCache.has(key)) return subsetCache.get(key);
  const txt = join(tmp, 'text.txt');
  const out = join(tmp, 'out.woff2');
  writeFileSync(txt, chars, 'utf8');
  const r = spawnSync(PY, ['-m', 'fontTools.subset', join(ROOT, FONTS[weight]), `--text-file=${txt}`, '--flavor=woff2',
    `--output-file=${out}`, '--layout-features=kern', '--no-hinting', '--desubroutinize'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`글꼴 자르기 실패(${weight}): ${r.stderr || r.error}`);
  const b64 = readFileSync(out).toString('base64');
  subsetCache.set(key, b64);
  return b64;
}
function fontCss() {
  return Object.keys(FONTS)
    .filter((w) => glyphs[w].trim())
    .map((w) => `@font-face{font-family:Paperlogy;font-weight:${w};src:url(data:font/woff2;base64,${subset(w, glyphs[w])}) format('woff2')}`)
    .join('');
}

// ── 타일 ─────────────────────────────────────────────────────
function frame(c, inner, { pad = '0', gap = '0' } = {}) {
  return `<div style="box-sizing:border-box;width:100%;height:100%;border-radius:18px;overflow:hidden;background:${c.bg};border:${c.border};padding:${pad};display:flex;flex-direction:column;gap:${gap};font-family:${esc(FAMILY)};color:${c.fg};word-break:keep-all;overflow-wrap:anywhere;-webkit-font-smoothing:antialiased">${inner}</div>`;
}

function introHtml(t) {
  const c = t.base;
  return frame(c, `
<div style="font-size:13px;color:${c.sub}">${T(PROFILE.handle)}</div>
<div style="flex-grow:1"></div>
<div style="font-size:44px;font-weight:700;letter-spacing:-0.02em;line-height:1.2">${T(PROFILE.name, 700)}</div>
<div style="font-size:16px;color:${c.body}">${T(PROFILE.role)}</div>`, { pad: '24px 28px 24px', gap: '8px' });
}

function statsHtml(t) {
  const c = t.invert;
  const all = Object.values(projects);
  const counts = {};
  for (const p of all) counts[p.status] = (counts[p.status] || 0) + 1;
  const cells = Object.entries(counts)
    .map(([k, n]) => `<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:${c.body}">${T(k)}</span><span style="font-weight:700">${T(String(n), 700)}</span></div>`)
    .join('');
  return frame(c, `
<div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:38px;font-weight:700;line-height:1">${T(String(all.length), 700)}</span><span style="font-size:13px;color:${c.sub}">${T('projects')}</span></div>
<div style="flex-grow:1"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 16px;font-size:11.5px;line-height:1.3;white-space:nowrap">${cells}</div>`, { pad: '22px 24px 20px', gap: '10px' });
}

const thumbCache = new Map();
function thumb(slug) {
  if (!thumbCache.has(slug)) thumbCache.set(slug, readFileSync(join(ROOT, 'assets/thumbs', `${slug}.jpg`)).toString('base64'));
  return thumbCache.get(slug);
}

/** art HTML 의 CSS 를 그 타일 안으로 좁힌다. body 는 감싸는 칸으로, @font-face 는 빼고(글꼴은 fontCss 가 넣는다) @keyframes 는 그대로 */
function scopeCss(css, scope) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '';
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open < 0) break;
    const sel = src.slice(i, open).trim();
    if (sel.startsWith('@')) {
      let depth = 0;
      let j = open;
      for (; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}' && --depth === 0) break;
      }
      if (!sel.startsWith('@font-face')) out += src.slice(i, j + 1).trim();
      i = j + 1;
      continue;
    }
    const close = src.indexOf('}', open);
    const decl = src.slice(open + 1, close).replace(/font-family:P,/g, `font-family:${FAMILY},`);
    const sels = sel.split(',').map((x) => x.trim()).filter((x) => x && x !== 'html')
      .map((x) => (x.startsWith('body') ? scope + x.slice(4) : `${scope} ${x}`));
    if (sels.length) out += `${sels.join(',')}{${decl}}`;
    i = close + 1;
  }
  return out;
}

/** 직접 그린 썸네일. 그 폭으로 그린 HTML 을 타일 폭에 맞춰 키우고 세로 가운데에 둔다 */
function artHtml(slug, span, innerW, line) {
  const src = readFileSync(join(ART_DIR, `${slug}.html`), 'utf8');
  const css = src.match(/<style>([\s\S]*?)<\/style>/)[1];
  const body = src.match(/<body>([\s\S]*?)<\/body>/)[1].replace(/<!--[\s\S]*?-->/g, '').replace(/<br>/g, '<br/>');
  const text = body.replace(/<[^>]+>/g, '');
  for (const w of [400, 600, 700]) T(text, w);
  const aw = ART_W[span] ?? ART_W[3];
  const s = innerW / aw;
  const top = (THUMB_H - THUMB_H * s) / 2;
  const scope = `art-${slug}`;
  return `<div style="position:relative;width:100%;height:${THUMB_H}px;overflow:hidden;flex-shrink:0;border-bottom:1px solid ${line}"><style>${scopeCss(css, `.${scope}`)}</style><div class="${scope}" style="position:absolute;left:0;top:${top.toFixed(2)}px;width:${aw}px;height:${THUMB_H}px;transform:scale(${s.toFixed(4)});transform-origin:0 0;overflow:hidden">${body}</div></div>`;
}

/** 캡처 썸네일. MOTION 에 있으면 움직임을 붙인다 */
/** 대표작 리본: ★ Flagship + 설치 수·평점 */
function flagshipBadge(p, t) {
  if (!p.flagship) return '';
  const chip = 'display:inline-block;font-size:11px;font-weight:700;padding:4px 9px;border-radius:999px;white-space:nowrap';
  const parts = [`<span style="${chip};background:${t.flagship};color:#1A1200">${T('★ Flagship', 700)}</span>`];
  if (p.stats?.installs) {
    const rating = p.stats.rating ? ` · ★ ${p.stats.rating.toFixed(1)}` : '';
    parts.push(`<span style="${chip};background:rgba(0,0,0,.62);color:#fff">${T(`${p.stats.installs.toLocaleString('en-US')} installs${rating}`, 700)}</span>`);
  }
  return `<div style="position:absolute;left:10px;top:10px;display:flex;gap:6px">${parts.join('')}</div>`;
}

function shotHtml(p, innerW, line, dim, badge = '') {
  const m = MOTION[p.slug];
  let css = '';
  let imgAnim = '';
  let overlay = '';
  if (m?.kind === 'kenburns') {
    css = '@keyframes kb{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.1) translate(-2.5%,-1.5%)}}';
    imgAnim = 'animation:kb 14s ease-in-out infinite alternate;';
  } else if (m?.kind === 'glitch') {
    css = '@keyframes gl{0%,86%,100%{transform:none;filter:none}88%{transform:translate(-4px,0);filter:hue-rotate(90deg) saturate(2)}90%{transform:translate(3px,1px);filter:hue-rotate(-60deg)}92%{transform:translate(-1px,0);filter:none}}';
    imgAnim = 'animation:gl 3.6s linear infinite;';
  } else if (m?.kind === 'blink') {
    // object-fit:cover 와 같은 셈으로 눈 상자를 타일 위치로 옮긴다
    const sc = Math.max(innerW / THUMB_SRC.w, THUMB_H / THUMB_SRC.h);
    const ox = (innerW - THUMB_SRC.w * sc) / 2;
    const oy = (THUMB_H - THUMB_SRC.h * sc) / 2;
    const half = (Math.max(...m.eyes.map(([, y0, , y1]) => y1 - y0)) * sc + 2) / 2;
    css = `@keyframes lid{0%,91%,100%{border-top-width:0;border-bottom-width:0}95%{border-top-width:${half.toFixed(1)}px;border-bottom-width:${half.toFixed(1)}px}}`;
    overlay = m.eyes.map(([x0, y0, x1, y1]) => `<div style="position:absolute;box-sizing:border-box;left:${(ox + x0 * sc - 1).toFixed(1)}px;top:${(oy + y0 * sc - 1).toFixed(1)}px;width:${((x1 - x0) * sc + 2).toFixed(1)}px;height:${((y1 - y0) * sc + 2).toFixed(1)}px;border:0 solid #000;animation:lid 4.8s infinite"></div>`).join('');
  }
  return `<div style="position:relative;width:100%;height:${THUMB_H}px;overflow:hidden;flex-shrink:0;border-bottom:1px solid ${line}">${css ? `<style>${css}</style>` : ''}<img src="data:image/jpeg;base64,${thumb(p.slug)}" style="display:block;width:100%;height:${THUMB_H}px;object-fit:cover;${dim}${imgAnim}" />${overlay}${badge}</div>`;
}

function projectHtml(t, p, span) {
  const look = LOOK[p.slug] || 'base';
  const c = t[look];
  const pill = look === 'watch' ? c.fg : t.tone[TONE[p.status] || 'done'];
  const dim = look === 'muted' ? 'filter:grayscale(1);opacity:0.75;' : '';
  // 대표작은 금색 2px 테두리
  const box = p.flagship ? { ...c, border: `2px solid ${t.flagship}` } : c;
  // 타일 안쪽 폭(바깥 여백 양쪽, 테두리 양쪽 뺌)
  const innerW = widthOf(span) - M * 2 - (p.flagship ? 4 : 2);
  return frame(box, `
${existsSync(join(ART_DIR, `${p.slug}.html`)) ? artHtml(p.slug, span, innerW, c.line) : shotHtml(p, innerW, c.line, dim, flagshipBadge(p, t))}
<div style="padding:16px 20px 18px;display:flex;flex-direction:column;gap:7px">
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-size:${p.title.length > 18 ? 15 : p.title.length > 14 ? 17 : 19}px;font-weight:700;letter-spacing:-0.01em;line-height:1.3;white-space:nowrap">${T(p.title, 700)}</span><span style="font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:999px;border:1px solid ${pill};color:${pill};white-space:nowrap">${T(p.status, 600)}</span></div>
<div style="font-size:13.5px;line-height:1.6;color:${c.body}">${T(p.line)}</div>
</div>`);
}

function svg(w, h, html, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<foreignObject x="${M}" y="${M}" width="${w - M * 2}" height="${h - M * 2}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%"><style>${fontCss()}${MOTION_CSS}</style>${html}</div></foreignObject>
</svg>
`;
}

// ── 만들기 ───────────────────────────────────────────────────
mkdirSync(join(ROOT, OUT), { recursive: true });
const readmeRows = [];
const preview = { light: [], dark: [] };
const used = new Set();
let bytes = 0;

for (const row of ROWS) {
  if (row.heading) {
    // 구획 제목. README 에서는 마크다운 제목(테마 글자색을 따른다)
    readmeRows.push({ heading: row.heading });
    for (const [name, color] of [['light', '#1f2328'], ['dark', '#e6edf3']]) {
      preview[name].push(`<div style="font:600 20px sans-serif;color:${color};padding:20px 6px 10px;line-height:1.3">${esc(row.heading)}</div>`);
    }
    continue;
  }
  const cells = [];
  const prev = { light: [], dark: [] };
  for (const tile of row.tiles) {
    const w = widthOf(tile.span);
    const p = projects[tile.id];
    if (!p && tile.id !== 'intro' && tile.id !== 'stats') throw new Error(`projects.json 에 없는 slug: ${tile.id}`);
    used.add(tile.id);
    const label = tile.id === 'intro' ? `${PROFILE.name} — ${PROFILE.role}`
      : tile.id === 'stats' ? `${Object.keys(projects).length} projects`
      : `${p.title} (${p.status}) — ${p.line}`;
    const pct = ((tile.span / 6) * 100).toFixed(2) + '%';
    for (const name of ['light', 'dark']) {
      glyphs = { 400: '', 600: '', 700: '' };
      const t = THEMES[name];
      const html = tile.id === 'intro' ? introHtml(t) : tile.id === 'stats' ? statsHtml(t) : projectHtml(t, p, tile.span);
      const s = svg(w, row.h, html, label);
      bytes += Buffer.byteLength(s);
      writeFileSync(join(ROOT, OUT, `${tile.id}-${name}.svg`), s);
      prev[name].push(`<img src="${OUT}/${tile.id}-${name}.svg" style="width:${pct}">`);
    }
    const img = `<picture><source media="(prefers-color-scheme: dark)" srcset="${OUT}/${tile.id}-dark.svg" /><img src="${OUT}/${tile.id}-light.svg" width="${pct}" alt="${esc(label)}" /></picture>`;
    cells.push(p?.url ? `<a href="${esc(p.url)}">${img}</a>` : img);
  }
  readmeRows.push(cells.join(''));
  preview.light.push(`<div class="row">${prev.light.join('')}</div>`);
  preview.dark.push(`<div class="row">${prev.dark.join('')}</div>`);
}
rmSync(tmp, { recursive: true, force: true });

const missing = Object.keys(projects).filter((s) => !used.has(s));
if (missing.length) throw new Error(`ROWS 에 배치하지 않은 프로젝트: ${missing.join(', ')}`);

const SNAKE = `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gnldnd11/gnldnd11/output/github-contribution-grid-snake-dark.svg" />
  <img src="https://raw.githubusercontent.com/gnldnd11/gnldnd11/output/github-contribution-grid-snake.svg" alt="contribution snake" />
</picture>`;

const blocks = [];
let run = [];
const flush = () => {
  if (run.length) blocks.push(`<p>\n${run.join('<br>\n')}\n</p>`);
  run = [];
};
for (const r of readmeRows) {
  if (typeof r === 'string') {
    run.push(r);
  } else {
    flush();
    blocks.push(`### ${r.heading}`);
  }
}
flush();

writeFileSync(join(ROOT, 'README.md'), `<!-- scripts/bento.mjs 가 만든다. 직접 고치지 말고 scripts/projects.json 을 고친다. -->
${blocks.join('\n\n')}

<br />

${SNAKE}
`);

if (process.argv.includes('--preview')) {
  writeFileSync(join(ROOT, '_preview.html'), `<!doctype html><meta charset="utf-8"><title>preview</title>
<style>body{margin:0;display:flex;flex-wrap:wrap;gap:24px;padding:24px;background:#888}.pane{width:830px;padding:16px;box-sizing:border-box}.row{display:flex;line-height:0}.row img{display:block}</style>
<div class="pane" style="background:#fff">${preview.light.join('')}</div>
<div class="pane" style="background:#0d1117">${preview.dark.join('')}</div>
`);
}

console.log(`${OUT}/ ${used.size * 2} svg (${Math.round(bytes / 1024)} KB), README.md`);
