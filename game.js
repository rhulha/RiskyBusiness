const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = await fetch('countries.json').then(r => r.json());
const COUNTRY_SET = new Set(COUNTRIES);

const DISPLAY = await fetch('display.json').then(r => r.json());

const ADJ = await fetch('adjacency.json').then(r => r.json());
const CONTINENTS = await fetch('continents.json').then(r => r.json());

const PLAYER_COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22'];
const INIT_ARMIES   = {2:40, 3:35, 4:30, 5:25, 6:20};
const DIE_FACES     = ['⚀','⚁','⚂','⚃','⚄','⚅'];

// ── State ────────────────────────────────────────────────────────────────────

let G = {
    phase: null,        // reinforce | attack | fortify | gameover
    turn: 0,
    players: [],        // [{name, color}]
    territories: {},    // id -> {owner, armies}
    armiesToPlace: 0,
    selected: null,
};

let lastMouseX = 0, lastMouseY = 0;

// ── SVG setup ────────────────────────────────────────────────────────────────

const resp = await fetch('Risk_board.svg');
$('svgContainer').innerHTML = await resp.text();
const svg = $('svgContainer').querySelector('svg');
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

svg.addEventListener('click', onMapClick);

// ── Setup UI ─────────────────────────────────────────────────────────────────

for (let n = 2; n <= 6; n++) {
    const btn = document.createElement('button');
    btn.className = 'pbtn';
    btn.textContent = n;
    btn.style.background = PLAYER_COLORS[n - 2];
    btn.addEventListener('click', () => startGame(n));
    $('player-btns').appendChild(btn);
}

$('end-btn').addEventListener('click', onEndPhase);

// Load soldier SVG
const soldierSrc = await fetch('soldier.svg').then(r => r.text());
const soldierDoc = new DOMParser().parseFromString(soldierSrc, 'text/xml');
const soldierPath = soldierDoc.querySelector('path');
const soldierSvg = $('soldier-svg');
if (soldierPath) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.appendChild(soldierPath.cloneNode(true));
    const origG = soldierDoc.querySelector('g[fill]');
    if (origG) {
        const trans = origG.getAttribute('transform');
        if (trans) g.setAttribute('transform', trans);
    }
    soldierSvg.appendChild(g);
}

document.addEventListener('mousemove', onMouseMove);

// ── Game logic ────────────────────────────────────────────────────────────────

function startGame(numPlayers) {
    $('setup-overlay').style.display = 'none';

    G.players = Array.from({length: numPlayers}, (_, i) => ({
        name: `Player ${i + 1}`,
        color: PLAYER_COLORS[i],
    }));

    const shuffled = [...COUNTRIES].sort(() => Math.random() - 0.5);
    G.territories = {};
    COUNTRIES.forEach(id => { G.territories[id] = {owner: 0, armies: 0}; });
    shuffled.forEach((id, i) => { G.territories[id] = {owner: i % numPlayers, armies: 1}; });

    const initArmy = INIT_ARMIES[numPlayers];
    const placed   = Array(numPlayers).fill(0);
    COUNTRIES.forEach(id => placed[G.territories[id].owner]++);
    const remaining = G.players.map((_, i) => initArmy - placed[i]);

    while (remaining.some(r => r > 0)) {
        for (let p = 0; p < numPlayers; p++) {
            if (remaining[p] <= 0) continue;
            const own = COUNTRIES.filter(id => G.territories[id].owner === p);
            G.territories[own[Math.floor(Math.random() * own.length)]].armies++;
            remaining[p]--;
        }
    }

    G.turn = 0;
    renderAll();
    setPhase('reinforce');
}

function setPhase(phase) {
    G.phase = phase;
    setSelected(null);

    if (phase === 'reinforce') {
        G.armiesToPlace = calcReinforcements();
        $('end-btn').disabled = true;
        $('end-btn').textContent = 'End Phase';
    } else if (phase === 'attack') {
        $('end-btn').disabled = false;
        $('end-btn').textContent = 'End Attack';
    } else if (phase === 'fortify') {
        $('end-btn').disabled = false;
        $('end-btn').textContent = 'Skip Fortify';
    }
    updateHeader();
}

function onEndPhase() {
    if (G.phase === 'attack') { setPhase('fortify'); }
    else if (G.phase === 'fortify') { setSelected(null); advanceTurn(); }
}

function advanceTurn() {
    let next = (G.turn + 1) % G.players.length;
    let guard = 0;
    while (!COUNTRIES.some(id => G.territories[id].owner === next)) {
        next = (next + 1) % G.players.length;
        if (++guard > G.players.length) break;
    }
    G.turn = next;
    setPhase('reinforce');
}

function calcReinforcements() {
    const mine = COUNTRIES.filter(id => G.territories[id].owner === G.turn);
    let n = Math.max(3, Math.floor(mine.length / 3));
    for (const c of CONTINENTS) {
        if (c.territories.every(id => G.territories[id].owner === G.turn)) n += c.bonus;
    }
    return n;
}

// ── Click handling ────────────────────────────────────────────────────────────

function updateCursorOverlay(x, y) {
    if (G.phase !== 'reinforce' || G.armiesToPlace <= 0) {
        $('cursor-overlay').style.display = 'none';
        return;
    }
    const overlay = $('cursor-overlay');
    overlay.style.display = 'flex';
    overlay.style.left = (x + 12) + 'px';
    overlay.style.top = (y + 12) + 'px';

    const soldierSvg = $('soldier-svg');
    if (soldierSvg && G.players[G.turn]) {
        const g = soldierSvg.querySelector('g');
        if (g) g.setAttribute('fill', G.players[G.turn].color);
    }
    $('army-number').textContent = G.armiesToPlace;
    $('army-number').style.color = G.players[G.turn].color;
}

function onMouseMove(e) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    updateCursorOverlay(e.clientX, e.clientY);
}

function onMapClick(e) {
    if (!G.phase || G.phase === 'gameover') return;
    let el = e.target;
    while (el && el !== svg) {
        if (COUNTRY_SET.has(el.id)) { onTerritoryClick(el.id); return; }
        el = el.parentElement;
    }
    if (G.phase === 'attack' || G.phase === 'fortify') setSelected(null);
}

function onTerritoryClick(id) {
    const t = G.territories[id];

    if (G.phase === 'reinforce') {
        if (t.owner !== G.turn || G.armiesToPlace <= 0) return;
        t.armies++;
        G.armiesToPlace--;
        renderLabel(id);
        updateHeader();
        updateCursorOverlay(lastMouseX, lastMouseY);
        if (G.armiesToPlace === 0) setTimeout(() => setPhase('attack'), 250);
        return;
    }

    if (G.phase === 'attack') {
        if (!G.selected) {
            if (t.owner !== G.turn || t.armies < 2) return;
            setSelected(id);
        } else if (id === G.selected) {
            setSelected(null);
        } else if (t.owner === G.turn) {
            if (t.armies >= 2) setSelected(id);
        } else {
            if (!ADJ[G.selected].includes(id)) return;
            resolveAttack(G.selected, id);
        }
        return;
    }

    if (G.phase === 'fortify') {
        if (!G.selected) {
            if (t.owner !== G.turn || t.armies < 2) return;
            setSelected(id);
        } else if (id === G.selected) {
            setSelected(null);
        } else if (t.owner !== G.turn) {
            setSelected(null);
        } else if (connectedOwn(G.selected, id)) {
            doFortify(G.selected, id);
        }
        return;
    }
}

// ── Selection & highlights ────────────────────────────────────────────────────

function setSelected(id) {
    if (G.selected) svg.getElementById(G.selected)?.classList.remove('sel');
    clearTargetHighlights();
    G.selected = id;
    if (!id) { updateHeader(); return; }
    svg.getElementById(id)?.classList.add('sel');
    if (G.phase === 'attack')  highlightAttackTargets(id);
    if (G.phase === 'fortify') highlightFortifyTargets(id);
    updateHeader();
}

function highlightAttackTargets(fromId) {
    for (const adj of ADJ[fromId]) {
        if (G.territories[adj].owner !== G.turn)
            svg.getElementById(adj)?.classList.add('atk-target');
    }
}

function highlightFortifyTargets(fromId) {
    const reachable = getConnectedOwn(fromId);
    for (const id of reachable) {
        if (id !== fromId) svg.getElementById(id)?.classList.add('fort-target');
    }
}

function clearTargetHighlights() {
    svg.querySelectorAll('.atk-target,.fort-target').forEach(el =>
        el.classList.remove('atk-target','fort-target')
    );
}

// ── Combat ────────────────────────────────────────────────────────────────────

function resolveAttack(fromId, toId) {
    const atk = G.territories[fromId];
    const def = G.territories[toId];
    const defOwnerBefore = def.owner;

    const atkDice = Math.min(atk.armies - 1, 3);
    const defDice = Math.min(def.armies, 2);

    const aRolls = rollDice(atkDice).sort((a,b) => b - a);
    const dRolls = rollDice(defDice).sort((a,b) => b - a);

    let aLoss = 0, dLoss = 0;
    const cmp = Math.min(aRolls.length, dRolls.length);
    for (let i = 0; i < cmp; i++) {
        if (aRolls[i] > dRolls[i]) dLoss++;
        else aLoss++;
    }

    atk.armies -= aLoss;
    def.armies -= dLoss;

    let captured = false;
    if (def.armies <= 0) {
        captured = true;
        const moving = Math.max(1, atkDice - aLoss);
        def.owner   = G.turn;
        def.armies  = moving;
        atk.armies -= moving;
        if (atk.armies < 1) atk.armies = 1;
    }

    showDice(fromId, toId, defOwnerBefore, aRolls, dRolls, aLoss, dLoss, captured);
    renderAll();
    if (captured) {
        setSelected(null);
        if (checkWin()) return;
    } else if (atk.armies < 2) {
        setSelected(null);
    }
}

function rollDice(n) {
    return Array.from({length: n}, () => Math.ceil(Math.random() * 6));
}

function showDice(fromId, toId, defOwner, aRolls, dRolls, aLoss, dLoss, captured) {
    $('dice-title').textContent = `${DISPLAY[fromId]}  →  ${DISPLAY[toId]}`;
    $('atk-name').style.color = G.players[G.turn].color;
    $('def-name').style.color = G.players[defOwner].color;
    $('atk-name').textContent = G.players[G.turn].name;
    $('def-name').textContent = G.players[defOwner].name;
    $('atk-dice').textContent = aRolls.map(d => DIE_FACES[d-1]).join(' ');
    $('def-dice').textContent = dRolls.map(d => DIE_FACES[d-1]).join(' ');

    if (captured) {
        $('dice-result').style.color = '#2ecc71';
        $('dice-result').textContent = '⚔ Territory captured!';
    } else {
        const parts = [];
        if (aLoss) parts.push(`Attacker −${aLoss}`);
        if (dLoss) parts.push(`Defender −${dLoss}`);
        $('dice-result').style.color = '#eee';
        $('dice-result').textContent = parts.join('  ·  ');
    }

    $('dice-overlay').style.display = 'flex';
    setTimeout(() => { $('dice-overlay').style.display = 'none'; }, 1800);
}

// ── Fortify ───────────────────────────────────────────────────────────────────

function doFortify(fromId, toId) {
    const from = G.territories[fromId];
    const to   = G.territories[toId];
    const move = from.armies - 1;
    from.armies = 1;
    to.armies  += move;
    setSelected(null);
    renderAll();
    advanceTurn();
}

function connectedOwn(fromId, toId) {
    return getConnectedOwn(fromId).has(toId);
}

function getConnectedOwn(startId) {
    const visited = new Set([startId]);
    const queue = [startId];
    while (queue.length) {
        const cur = queue.shift();
        for (const adj of ADJ[cur]) {
            if (!visited.has(adj) && G.territories[adj].owner === G.turn) {
                visited.add(adj);
                queue.push(adj);
            }
        }
    }
    return visited;
}

// ── Win check ─────────────────────────────────────────────────────────────────

function checkWin() {
    if (COUNTRIES.every(id => G.territories[id].owner === G.turn)) {
        G.phase = 'gameover';
        const p = G.players[G.turn];
        $('win-name').textContent  = p.name;
        $('win-name').style.color  = p.color;
        $('win-banner').style.display = 'flex';
        $('end-btn').disabled = true;
        return true;
    }
    return false;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderAll() {
    for (const id of COUNTRIES) renderTerritory(id);
}

function renderTerritory(id) {
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

function renderLabel(id) {
    const lbl = svg.getElementById(`lbl-${id}`);
    if (lbl) lbl.textContent = G.territories[id].armies;
}

function updateHeader() {
    if (!G.phase) return;
    const p = G.players[G.turn];
    $('player-dot').style.background = p.color;

    const phases = {reinforce:'Reinforce', attack:'Attack', fortify:'Fortify', gameover:'Game Over'};
    $('phase-label').textContent = `${p.name} — ${phases[G.phase]}`;
    $('phase-label').style.color = p.color;

    if (G.phase === 'reinforce') {
        $('armies-badge').textContent = G.armiesToPlace > 0 ? `+${G.armiesToPlace}` : '';
        $('action-hint').textContent  = G.armiesToPlace > 0
            ? `Place ${G.armiesToPlace} arm${G.armiesToPlace === 1 ? 'y' : 'ies'} on your territories`
            : 'All armies placed…';
    } else if (G.phase === 'attack') {
        $('armies-badge').textContent = '';
        $('action-hint').textContent  = G.selected
            ? `Attacking from ${DISPLAY[G.selected]} — click a red territory`
            : 'Select your territory to attack from (2+ armies)';
    } else if (G.phase === 'fortify') {
        $('armies-badge').textContent = '';
        $('action-hint').textContent  = G.selected
            ? `Moving from ${DISPLAY[G.selected]} — click a blue connected territory`
            : 'Move armies to a connected friendly territory (optional)';
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}
