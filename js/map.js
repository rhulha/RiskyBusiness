import { COUNTRIES, DISPLAY } from './data.js';
import { G, SVG_NS } from './state.js';

const $ = id => document.getElementById(id);

const resp = await fetch('../images/Risk_board.svg');
$('svgContainer').innerHTML = await resp.text();
export const svg = $('svgContainer').querySelector('svg');
const layer4 = svg.getElementById('layer4');

for (const id of COUNTRIES) {
    const p = svg.getElementById(id);
    if (p) { p.style.fill = 'transparent'; p.style.pointerEvents = 'all'; }
}

await new Promise(r => requestAnimationFrame(r));
await new Promise(r => requestAnimationFrame(r));

const labelG = document.createElementNS(SVG_NS, 'g');
labelG.id = 'label-group';
labelG.setAttribute('transform', layer4.getAttribute('transform') ?? '');
svg.appendChild(labelG);

for (const id of COUNTRIES) {
    const path = svg.getElementById(id);
    if (!path) continue;
    const b = path.getBBox();
    const cx = b.x + b.width  / 2;
    const cy = b.y + b.height / 2;

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.id = `bg-${id}`;
    circle.setAttribute('cx', cx); circle.setAttribute('cy', cy);
    circle.setAttribute('r', '11');
    circle.setAttribute('stroke', 'rgba(0,0,0,0.6)');
    circle.setAttribute('stroke-width', '1.5');
    circle.style.pointerEvents = 'none';
    labelG.appendChild(circle);

    const txt = document.createElementNS(SVG_NS, 'text');
    txt.id = `lbl-${id}`;
    txt.setAttribute('x', cx); txt.setAttribute('y', cy);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('dominant-baseline', 'middle');
    txt.setAttribute('font-size', '13');
    txt.setAttribute('font-weight', 'bold');
    txt.setAttribute('fill', 'white');
    txt.setAttribute('stroke', 'rgba(0,0,0,0.5)');
    txt.setAttribute('stroke-width', '0.4');
    txt.setAttribute('paint-order', 'stroke');
    txt.style.pointerEvents = 'none';
    labelG.appendChild(txt);
}

export function renderAll() {
    for (const id of COUNTRIES) renderTerritory(id);
}

export function renderTerritory(id) {
    const t    = G.territories[id];
    const path = svg.getElementById(id);
    const bg   = svg.getElementById(`bg-${id}`);
    const lbl  = svg.getElementById(`lbl-${id}`);
    if (!path || !bg || !lbl) return;
    const col = G.players[t.owner]?.color ?? '#888';
    path.style.fill = hexAlpha(col, 0.55);
    bg.setAttribute('fill', col);
    lbl.textContent = t.armies;
}

const highlightTimeouts = {};

export function renderLabel(id) {
    const lbl = svg.getElementById(`lbl-${id}`);
    if (lbl) lbl.textContent = G.territories[id].armies;
}

export function highlightLabel(id) {
    const lbl = svg.getElementById(`lbl-${id}`);
    if (!lbl) return;

    if (highlightTimeouts[id]) clearTimeout(highlightTimeouts[id]);

    lbl.classList.add('reinforced');

    highlightTimeouts[id] = setTimeout(() => {
        lbl.classList.remove('reinforced');
        delete highlightTimeouts[id];
    }, 10000);
}

export function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}
