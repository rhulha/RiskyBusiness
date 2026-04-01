import { COUNTRIES, DISPLAY } from './data.js';
import { G, SVG_NS } from './state.js';

const $ = id => document.getElementById(id);

const resp = await fetch('./images/Risk_board.svg');
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

const attackFxG = document.createElementNS(SVG_NS, 'g');
attackFxG.id = 'attack-fx-group';
attackFxG.setAttribute('transform', layer4.getAttribute('transform') ?? '');
attackFxG.style.pointerEvents = 'none';
svg.appendChild(attackFxG);

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

function ensureAttackArrowMarker() {
    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svg.insertBefore(defs, svg.firstChild);
    }

    if (svg.getElementById('attack-arrow-head')) return;

    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.id = 'attack-arrow-head';
    marker.setAttribute('viewBox', '0 0 12 12');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '6');
    marker.setAttribute('markerWidth', '12');
    marker.setAttribute('markerHeight', '12');
    marker.setAttribute('orient', 'auto-start-reverse');

    const head = document.createElementNS(SVG_NS, 'path');
    head.setAttribute('d', 'M1,1 L11,6 L1,11 L4,6 Z');
    head.setAttribute('fill', '#ffffff');
    marker.appendChild(head);
    defs.appendChild(marker);
}

function getTerritoryCenter(id) {
    const path = svg.getElementById(id);
    if (!path) return null;
    const box = path.getBBox();
    return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
    };
}

export function showAttackArrow(fromId, toId, color = '#ffffff') {
    ensureAttackArrowMarker();
    const from = getTerritoryCenter(fromId);
    const to = getTerritoryCenter(toId);
    if (!from || !to) return;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const bend = Math.min(70, Math.max(28, dist * 0.2));
    const cx = (from.x + to.x) / 2 + nx * bend;
    const cy = (from.y + to.y) / 2 + ny * bend;
    const pathD = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;

    const glow = document.createElementNS(SVG_NS, 'path');
    glow.setAttribute('d', pathD);
    glow.setAttribute('class', 'attack-arrow-glow');
    glow.setAttribute('stroke', color);

    const arrow = document.createElementNS(SVG_NS, 'path');
    arrow.setAttribute('d', pathD);
    arrow.setAttribute('class', 'attack-arrow');
    arrow.setAttribute('stroke', color);
    arrow.setAttribute('marker-end', 'url(#attack-arrow-head)');

    attackFxG.appendChild(glow);
    attackFxG.appendChild(arrow);

    setTimeout(() => {
        glow.remove();
        arrow.remove();
    }, 700);
}

export function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}
