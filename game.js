const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
    'alaska','northwest_territory','greenland','alberta','ontario','quebec',
    'western_united_states','eastern_united_states','central_america',
    'venezuela','peru','brazil','argentina',
    'iceland','great_britain','western_europe','northern_europe',
    'scandinavia','ukraine','southern_europe',
    'north_africa','egypt','east_africa','congo','south_africa','madagascar',
    'ural','siberia','yakursk','irkutsk','kamchatka',
    'afghanistan','middle_east','india','siam','china','mongolia','japan',
    'indonesia','new_guinea','western_australia','eastern_australia',
];

const COUNTRY_SET = new Set(COUNTRIES);

const DISPLAY = {
    alaska:'Alaska', northwest_territory:'NW Territory', greenland:'Greenland',
    alberta:'Alberta', ontario:'Ontario', quebec:'Quebec',
    western_united_states:'W. USA', eastern_united_states:'E. USA',
    central_america:'C. America', venezuela:'Venezuela', peru:'Peru',
    brazil:'Brazil', argentina:'Argentina', iceland:'Iceland',
    great_britain:'Gt. Britain', western_europe:'W. Europe',
    northern_europe:'N. Europe', scandinavia:'Scandinavia',
    ukraine:'Ukraine', southern_europe:'S. Europe',
    north_africa:'N. Africa', egypt:'Egypt', east_africa:'E. Africa',
    congo:'Congo', south_africa:'S. Africa', madagascar:'Madagascar',
    ural:'Ural', siberia:'Siberia', yakursk:'Yakutsk', irkutsk:'Irkutsk',
    kamchatka:'Kamchatka', afghanistan:'Afghanistan', middle_east:'Middle East',
    india:'India', siam:'Siam', china:'China', mongolia:'Mongolia', japan:'Japan',
    indonesia:'Indonesia', new_guinea:'New Guinea',
    western_australia:'W. Australia', eastern_australia:'E. Australia',
};

const ADJ = {
    alaska:               ['northwest_territory','alberta','kamchatka'],
    northwest_territory:  ['alaska','alberta','ontario','greenland'],
    greenland:            ['northwest_territory','ontario','quebec','iceland'],
    alberta:              ['alaska','northwest_territory','ontario','western_united_states'],
    ontario:              ['northwest_territory','alberta','western_united_states','eastern_united_states','quebec','greenland'],
    quebec:               ['ontario','eastern_united_states','greenland'],
    western_united_states:['alberta','ontario','eastern_united_states','central_america'],
    eastern_united_states:['western_united_states','ontario','quebec','central_america'],
    central_america:      ['western_united_states','eastern_united_states','venezuela'],
    venezuela:            ['central_america','peru','brazil'],
    peru:                 ['venezuela','brazil','argentina'],
    brazil:               ['venezuela','peru','argentina','north_africa'],
    argentina:            ['peru','brazil'],
    iceland:              ['greenland','great_britain','scandinavia'],
    great_britain:        ['iceland','western_europe','northern_europe','scandinavia'],
    western_europe:       ['great_britain','northern_europe','southern_europe','north_africa'],
    northern_europe:      ['great_britain','scandinavia','ukraine','western_europe','southern_europe'],
    scandinavia:          ['iceland','great_britain','northern_europe','ukraine'],
    ukraine:              ['scandinavia','northern_europe','southern_europe','ural','afghanistan','middle_east'],
    southern_europe:      ['western_europe','northern_europe','ukraine','middle_east','egypt','north_africa'],
    north_africa:         ['western_europe','southern_europe','egypt','east_africa','congo','brazil'],
    egypt:                ['southern_europe','middle_east','east_africa','north_africa'],
    east_africa:          ['egypt','middle_east','north_africa','congo','south_africa','madagascar'],
    congo:                ['north_africa','east_africa','south_africa'],
    south_africa:         ['congo','east_africa','madagascar'],
    madagascar:           ['south_africa','east_africa'],
    ural:                 ['ukraine','afghanistan','siberia','china'],
    siberia:              ['ural','china','mongolia','irkutsk','yakursk'],
    yakursk:              ['siberia','irkutsk','kamchatka'],
    irkutsk:              ['siberia','yakursk','kamchatka','mongolia'],
    kamchatka:            ['yakursk','irkutsk','mongolia','japan','alaska'],
    afghanistan:          ['ukraine','ural','china','india','middle_east'],
    middle_east:          ['ukraine','southern_europe','egypt','east_africa','afghanistan','india'],
    india:                ['afghanistan','middle_east','china','siam'],
    siam:                 ['india','china','indonesia'],
    china:                ['ural','afghanistan','india','siam','mongolia','siberia'],
    mongolia:             ['china','siberia','irkutsk','kamchatka','japan'],
    japan:                ['mongolia','kamchatka'],
    indonesia:            ['siam','new_guinea','western_australia'],
    new_guinea:           ['indonesia','western_australia','eastern_australia'],
    western_australia:    ['indonesia','new_guinea','eastern_australia'],
    eastern_australia:    ['new_guinea','western_australia'],
};

const CONTINENTS = [
    { name:'North America', territories:['alaska','northwest_territory','greenland','alberta','ontario','quebec','western_united_states','eastern_united_states','central_america'], bonus:5 },
    { name:'South America', territories:['venezuela','peru','brazil','argentina'], bonus:2 },
    { name:'Europe',        territories:['iceland','great_britain','western_europe','northern_europe','scandinavia','ukraine','southern_europe'], bonus:5 },
    { name:'Africa',        territories:['north_africa','egypt','east_africa','congo','south_africa','madagascar'], bonus:3 },
    { name:'Asia',          territories:['ural','siberia','yakursk','irkutsk','kamchatka','afghanistan','middle_east','india','siam','china','mongolia','japan'], bonus:7 },
    { name:'Australia',     territories:['indonesia','new_guinea','western_australia','eastern_australia'], bonus:2 },
];

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
