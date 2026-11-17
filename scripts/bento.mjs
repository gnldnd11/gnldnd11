// 프로필 벤토 타일을 그린다. 문구·링크는 scripts/projects.json(title, line, status, url), 썸네일은 assets/thumbs/<slug>.jpg.
// 글꼴은 fonts/Paperlogy-*.woff2 에서 타일마다 쓰인 글자만 잘라 SVG 안에 넣는다(README 이미지는 바깥 글꼴을 못 불러온다).
// 필요: node 20, python + fonttools·brotli (pip install fonttools brotli)
// node scripts/bento.mjs             → assets/bento/*.svg, README.md
// node scripts/bento.mjs --preview   → 저장소 루트에 _preview.html(라이트·다크 나란히, 커밋하지 않음)도 쓴다
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = 'assets/bento';
const PY = process.env.PYTHON || 'python';

const PROFILE = { name: '김휘웅', handle: '@gnldnd11', role: 'AI 서비스 개발 · 프론트엔드 + 백엔드' };

// 한 줄 = 6칸. span 은 칸 수, h 는 그 줄 높이(px). 썸네일은 scripts/thumbs.py 가 칸 수에 맞춰 자른다.
const ROWS = [
  { h: 180, tiles: [{ id: 'intro', span: 4 }, { id: 'stats', span: 2 }] },
  { h: 318, tiles: [{ id: 'noon', span: 2 }, { id: 'claude-usage-crab', span: 2 }, { id: 'harbormaster', span: 2 }] },
  { h: 296, tiles: [{ id: 'cms', span: 3 }, { id: 'iop-as', span: 3 }] },
  { h: 318, tiles: [{ id: 'saegim-eval', span: 2 }, { id: 'geoubom', span: 2 }, { id: 'power-scanner', span: 2 }] },
  { h: 296, tiles: [{ id: 'ur-bmt', span: 3 }, { id: 'saegim-ai', span: 3 }] },
];
const THUMB_H = 190;
const LOOK = { noon: 'watch', 'saegim-ai': 'muted' };
const TONE = { 출시: 'ship', 라이브: 'live', 납품: 'live', 프로덕션: 'live', 공모전: 'contest', 완료: 'done', 종료: 'done' };

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
    tone: { ship: '#C2410C', live: '#1D4ED8', contest: '#6D28D9', done: '#66645E' },
  },
  dark: {
    base: { bg: '#161B22', border: '1px solid #30363D', fg: '#E6EDF3', sub: '#9198A1', body: '#C9D1D9', line: '#30363D' },
    invert: { bg: '#F2F1EC', border: '1px solid #F2F1EC', fg: '#17171A', sub: '#5E5C57', body: '#3A3935' },
    watch: { bg: '#000000', border: '1px solid #30363D', fg: '#E6EDF3', sub: '#9198A1', body: '#C9D1D9', line: '#000000' },
    muted: { bg: 'transparent', border: '1.5px dashed #3D444D', fg: '#C9D1D9', sub: '#9198A1', body: '#9198A1', line: '#30363D' },
    tone: { ship: '#F0883E', live: '#58A6FF', contest: '#BC8CFF', done: '#9198A1' },
  },
};

const projects = Object.fromEntries(
  JSON.parse(readFileSync(join(ROOT, 'scripts/projects.json'), 'utf8')).map((p) => [p.slug, p]),
);

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
<div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:38px;font-weight:700;line-height:1">${T(String(all.length), 700)}</span><span style="font-size:13px;color:${c.sub}">${T('프로젝트')}</span></div>
<div style="flex-grow:1"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;font-size:13px">${cells}</div>`, { pad: '22px 24px 20px', gap: '10px' });
}

const thumbCache = new Map();
function thumb(slug) {
  if (!thumbCache.has(slug)) thumbCache.set(slug, readFileSync(join(ROOT, 'assets/thumbs', `${slug}.jpg`)).toString('base64'));
  return thumbCache.get(slug);
}

function projectHtml(t, p) {
  const look = LOOK[p.slug] || 'base';
  const c = t[look];
  const pill = look === 'watch' ? c.fg : t.tone[TONE[p.status] || 'done'];
  const dim = look === 'muted' ? 'filter:grayscale(1);opacity:0.75;' : '';
  return frame(c, `
<img src="data:image/jpeg;base64,${thumb(p.slug)}" style="display:block;width:100%;height:${THUMB_H}px;object-fit:cover;flex-shrink:0;border-bottom:1px solid ${c.line};${dim}" />
<div style="padding:16px 20px 18px;display:flex;flex-direction:column;gap:7px">
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-size:${p.title.length > 14 ? 17 : 19}px;font-weight:700;letter-spacing:-0.01em;line-height:1.3;white-space:nowrap">${T(p.title, 700)}</span><span style="font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:999px;border:1px solid ${pill};color:${pill};white-space:nowrap">${T(p.status, 600)}</span></div>
<div style="font-size:13.5px;line-height:1.6;color:${c.body}">${T(p.line)}</div>
</div>`);
}

function svg(w, h, html, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<foreignObject x="${M}" y="${M}" width="${w - M * 2}" height="${h - M * 2}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%"><style>${fontCss()}</style>${html}</div></foreignObject>
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
  const cells = [];
  const prev = { light: [], dark: [] };
  for (const tile of row.tiles) {
    const w = widthOf(tile.span);
    const p = projects[tile.id];
    if (!p && tile.id !== 'intro' && tile.id !== 'stats') throw new Error(`projects.json 에 없는 slug: ${tile.id}`);
    used.add(tile.id);
    const label = tile.id === 'intro' ? `${PROFILE.name} — ${PROFILE.role}`
      : tile.id === 'stats' ? `프로젝트 ${Object.keys(projects).length}개`
      : `${p.title} (${p.status}) — ${p.line}`;
    const pct = ((tile.span / 6) * 100).toFixed(2) + '%';
    for (const name of ['light', 'dark']) {
      glyphs = { 400: '', 600: '', 700: '' };
      const t = THEMES[name];
      const html = tile.id === 'intro' ? introHtml(t) : tile.id === 'stats' ? statsHtml(t) : projectHtml(t, p);
      const s = svg(w, row.h, html, label);
      bytes += Buffer.byteLength(s);
      writeFileSync(join(ROOT, OUT, `${tile.id}-${name}.svg`), s);
      prev[name].push(`<img src="${OUT}/${tile.id}-${name}.svg" style="width:${pct}">`);
    }
    const img = `<picture><source media="(prefers-color-scheme: dark)" srcset="${OUT}/${tile.id}-dark.svg" /><img src="${OUT}/${tile.id}-light.svg" width="${pct}" alt="${esc(label)}" /></picture>`;
    cells.push(p ? `<a href="${esc(p.url)}">${img}</a>` : img);
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

writeFileSync(join(ROOT, 'README.md'), `<!-- scripts/bento.mjs 가 만든다. 직접 고치지 말고 scripts/projects.json 을 고친다. -->
<p>
${readmeRows.join('<br>\n')}
</p>

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
