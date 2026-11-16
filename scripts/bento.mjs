// 프로필 벤토 타일을 그린다. 문구·링크는 scripts/projects.json, 배치는 아래 ROWS.
// node scripts/bento.mjs                     → assets/bento/*.svg, README.md
// node scripts/bento.mjs --preview           → 저장소 루트에 _preview.html(라이트·다크 나란히, 커밋하지 않음)도 쓴다
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = 'assets/bento';

const PROFILE = {
  name: '김휘웅',
  handle: '@gnldnd11',
  role: 'AI 서비스 개발 · 프론트엔드 + 백엔드',
};

// 한 줄 = 6칸. span 은 칸 수, h 는 그 줄 높이(px).
const ROWS = [
  { h: 210, tiles: [{ id: 'intro', span: 4 }, { id: 'stats', span: 2 }] },
  { h: 390, tiles: [{ id: 'noon', span: 2 }, { id: 'claude-usage-crab', span: 2 }, { id: 'harbormaster', span: 2 }] },
  { h: 245, tiles: [{ id: 'cms', span: 3 }, { id: 'iop-as', span: 3 }] },
  { h: 300, tiles: [{ id: 'saegim-eval', span: 2 }, { id: 'geoubom', span: 2 }, { id: 'power-scanner', span: 2 }] },
  { h: 245, tiles: [{ id: 'ur-bmt', span: 3 }, { id: 'saegim-ai', span: 3 }] },
];
const LOOK = { noon: 'watch', 'saegim-ai': 'muted' };
const TONE = { 출시: 'ship', 라이브: 'live', 납품: 'live', 프로덕션: 'live', 공모전: 'contest', 완료: 'done', 종료: 'done' };
const NOON_GREEN = '#00FF41'; // noon AppConstants.matrixGreen

const TOTAL_W = 852; // 타일마다 바깥 6px 여백이 있어 이웃 타일 사이는 12px
const M = 6;
const SANS = "Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', sans-serif";
// 고정폭 글꼴에 한글이 없으면 고정폭 한글로 떨어져 띄엄띄엄 보인다. 그 앞에 한글 산세리프를 둔다.
const MONO = "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', 'D2Coding', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', monospace";

const THEMES = {
  light: {
    base: { bg: '#F6F5F1', border: '1px solid #E4E2DA', fg: '#17171A', sub: '#66645E', body: '#3A3935' },
    invert: { bg: '#17171A', border: '1px solid #17171A', fg: '#F2F1EC', sub: '#B9B7AF', body: '#D6D4CC' },
    watch: { bg: '#000000', border: '1px solid #000000', fg: '#F2F1EC', sub: '#B9B7AF', body: '#D6D4CC', eye: NOON_GREEN },
    muted: { bg: 'transparent', border: '1.5px dashed #C9C6BC', fg: '#3A3935', sub: '#66645E', body: '#4A4843' },
    tone: { ship: '#C2410C', live: '#1D4ED8', contest: '#6D28D9', done: '#66645E' },
  },
  dark: {
    base: { bg: '#161B22', border: '1px solid #30363D', fg: '#E6EDF3', sub: '#9198A1', body: '#C9D1D9' },
    invert: { bg: '#F2F1EC', border: '1px solid #F2F1EC', fg: '#17171A', sub: '#5E5C57', body: '#3A3935' },
    watch: { bg: '#000000', border: '1px solid #30363D', fg: '#E6EDF3', sub: '#9198A1', body: '#C9D1D9', eye: NOON_GREEN },
    muted: { bg: 'transparent', border: '1.5px dashed #3D444D', fg: '#C9D1D9', sub: '#9198A1', body: '#9198A1' },
    tone: { ship: '#F0883E', live: '#58A6FF', contest: '#BC8CFF', done: '#9198A1' },
  },
};

const projects = Object.fromEntries(
  JSON.parse(readFileSync(join(ROOT, 'scripts/projects.json'), 'utf8')).map((p) => [p.slug, p]),
);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const widthOf = (span) => Math.round((TOTAL_W / 6) * span);

function frame(c, inner, pad = '22px 22px 20px') {
  return `<div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:100%;height:100%;border-radius:18px;background:${c.bg};border:${c.border};padding:${pad};display:flex;flex-direction:column;gap:10px;font-family:${esc(SANS)};color:${c.fg};word-break:keep-all;overflow-wrap:anywhere;-webkit-font-smoothing:antialiased">${inner}</div>`;
}

function introHtml(t) {
  const c = t.base;
  return frame(c, `
<div style="font-family:${esc(MONO)};font-size:12px;color:${c.sub}">${esc(PROFILE.handle)}</div>
<div style="flex-grow:1"></div>
<div style="font-size:44px;font-weight:700;letter-spacing:-0.03em;line-height:1.2">${esc(PROFILE.name)}</div>
<div style="font-size:16px;color:${c.body}">${esc(PROFILE.role)}</div>`, '26px 28px 26px');
}

function statsHtml(t) {
  const c = t.invert;
  const all = Object.values(projects);
  const counts = {};
  for (const p of all) counts[p.status] = (counts[p.status] || 0) + 1;
  const cells = Object.entries(counts)
    .map(([k, n]) => `<div style="display:flex;justify-content:space-between;gap:8px"><span style="color:${c.body}">${esc(k)}</span><span style="font-weight:700">${n}</span></div>`)
    .join('');
  return frame(c, `
<div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:40px;font-weight:700;letter-spacing:-0.03em;line-height:1">${all.length}</span><span style="font-size:13px;color:${c.sub}">프로젝트</span></div>
<div style="flex-grow:1"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 18px;font-size:13px">${cells}</div>`, '24px 24px 22px');
}

function projectHtml(t, p, span) {
  const look = LOOK[p.slug] || 'base';
  const c = t[look];
  const pill = look === 'watch' ? c.fg : t.tone[TONE[p.status] || 'done'];
  const titleSize = span >= 3 ? 22 : look === 'watch' ? 26 : 20;
  const eyes = look === 'watch'
    ? `<style>@keyframes blink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(0.06)}}.eye{width:38px;height:54px;border-radius:14px;background:${c.eye};animation:blink 5s ease-in-out infinite}.eye+.eye{animation-delay:0.18s}</style>
<div style="display:flex;justify-content:center;gap:26px;padding:22px 0 12px"><span class="eye"></span><span class="eye"></span></div>`
    : '';
  return frame(c, `
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-family:${esc(MONO)};font-size:11px;letter-spacing:0.03em;color:${c.sub}">${esc(p.tag)}</span><span style="font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:999px;border:1px solid ${pill};color:${pill};white-space:nowrap">${esc(p.status)}</span></div>
${eyes}
<div style="font-size:${titleSize}px;font-weight:700;letter-spacing:-0.02em;line-height:1.3">${esc(p.title)}</div>
<div style="font-size:13.5px;line-height:1.65;color:${c.body};flex-grow:1">${esc(p.desc)}</div>
<div style="font-family:${esc(MONO)};font-size:11.5px;color:${c.sub}">${esc(p.stack)}</div>`);
}

function svg(w, h, html, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<foreignObject x="${M}" y="${M}" width="${w - M * 2}" height="${h - M * 2}">${html}</foreignObject>
</svg>
`;
}

mkdirSync(join(ROOT, OUT), { recursive: true });
const readmeRows = [];
const preview = { light: [], dark: [] };
const used = new Set();

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
      : `${p.title} (${p.status}) — ${p.desc}`;
    for (const name of ['light', 'dark']) {
      const t = THEMES[name];
      const html = tile.id === 'intro' ? introHtml(t) : tile.id === 'stats' ? statsHtml(t) : projectHtml(t, p, tile.span);
      writeFileSync(join(ROOT, OUT, `${tile.id}-${name}.svg`), svg(w, row.h, html, label));
      prev[name].push(`<img src="${OUT}/${tile.id}-${name}.svg" style="width:${((tile.span / 6) * 100).toFixed(2)}%">`);
    }
    const img = `<picture><source media="(prefers-color-scheme: dark)" srcset="${OUT}/${tile.id}-dark.svg" /><img src="${OUT}/${tile.id}-light.svg" width="${((tile.span / 6) * 100).toFixed(2)}%" alt="${esc(label)}" /></picture>`;
    cells.push(p ? `<a href="${esc(p.url)}">${img}</a>` : img);
  }
  readmeRows.push(cells.join(''));
  preview.light.push(`<div class="row">${prev.light.join('')}</div>`);
  preview.dark.push(`<div class="row">${prev.dark.join('')}</div>`);
}

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

const pi = process.argv.indexOf('--preview');
if (pi > -1) {
  const file = join(ROOT, process.argv[pi + 1] || '_preview.html'); // 저장소 루트 기준. 커밋하지 않는다
  const fix = (rows) => rows.join('');
  writeFileSync(file, `<!doctype html><meta charset="utf-8"><title>preview</title>
<style>body{margin:0;display:flex;flex-wrap:wrap;gap:24px;padding:24px;background:#888}.pane{width:830px;padding:16px;box-sizing:border-box}.row{display:flex;line-height:0}.row img{display:block}</style>
<div class="pane" style="background:#fff">${fix(preview.light)}</div>
<div class="pane" style="background:#0d1117">${fix(preview.dark)}</div>
`);
}

console.log(`${OUT}/ ${used.size * 2} svg, README.md`);
