import { G, PLAYER_COLORS, INIT_ARMIES } from './state.js';
import { COUNTRIES, COUNTRY_SET, ADJ, CONTINENTS } from './data.js';
import { svg, renderAll, renderLabel, highlightLabel } from './map.js';
import { updateHeader, updateCursorOverlay, updateCardUI } from './ui.js';
import { resolveBattle, doFortify, getConnectedOwn, connectedOwn, moveArmiesAfterCapture } from './combat.js';
import { initAI, aiPlaceArmy, aiAttack, aiFortify } from './ai.js';
import { initCards, findValidCardSet, tradeCards } from './cards.js';

const $ = id => document.getElementById(id);

let lastMouseX = 0, lastMouseY = 0;

function playSound(elementId) {
    const audio = $(elementId);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

// ── UI Setup ──────────────────────────────────────────────────────────────

for (let n = 2; n <= 6; n++) {
    const btn = document.createElement('button');
    btn.className = 'pbtn';
    btn.textContent = n;
    btn.style.background = PLAYER_COLORS[n - 2];
    btn.addEventListener('click', () => showPlayerConfig(n));
    $('player-btns').appendChild(btn);
}

$('end-btn').addEventListener('click', onEndPhase);
$('trade-btn')?.addEventListener('click', () => {
    if (tradeCards()) {
        if (G.cards[G.turn].length < 5 && !findValidCardSet(G.cards[G.turn])) {
            updateCardUI();
        }
    }
});
$('army-slider').addEventListener('input', (e) => {
    $('army-value').textContent = e.target.value;
});
$('capture-confirm-btn').addEventListener('click', confirmCapture);
svg.addEventListener('click', onMapClick);
document.addEventListener('mousemove', onMouseMove);

// ── Setup & Config ───────────────────────────────────────────────────────

function showPlayerConfig(numPlayers) {
    $('setup-step1').style.display = 'none';
    $('setup-step2').style.display = 'block';

    const config = $('player-config');
    config.innerHTML = '';

    for (let i = 0; i < numPlayers; i++) {
        const row = document.createElement('div');
        row.className = 'player-config-row';
        const humanBtn = document.createElement('button');
        const aiBtn = document.createElement('button');

        const defaultIsAI = i > 0;

        humanBtn.className = `toggle-btn${defaultIsAI ? '' : ' active'}`;
        humanBtn.textContent = 'Human';
        humanBtn.dataset.player = i;
        humanBtn.dataset.type = 'human';

        aiBtn.className = `toggle-btn${defaultIsAI ? ' active' : ''}`;
        aiBtn.textContent = 'AI';
        aiBtn.dataset.player = i;
        aiBtn.dataset.type = 'ai';

        [humanBtn, aiBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                config.querySelectorAll(`.toggle-btn[data-player="${i}"]`).forEach(b =>
                    b.classList.toggle('active', b === btn)
                );
            });
        });

        const dot = document.createElement('div');
        dot.className = 'player-config-dot';
        dot.style.background = PLAYER_COLORS[i];

        const label = document.createElement('span');
        label.textContent = `Player ${i + 1}`;

        const toggle = document.createElement('div');
        toggle.className = 'ai-toggle';
        toggle.appendChild(humanBtn);
        toggle.appendChild(aiBtn);

        row.appendChild(dot);
        row.appendChild(label);
        row.appendChild(toggle);
        config.appendChild(row);
    }

    $('start-btn').onclick = () => {
        const aiFlags = Array.from({length: numPlayers}, (_, i) => {
            const aiBtn = config.querySelector(`.toggle-btn[data-player="${i}"][data-type="ai"]`);
            return aiBtn.classList.contains('active');
        });
        startGame(numPlayers, aiFlags);
    };
}

// ── Game Logic ────────────────────────────────────────────────────────────

function startGame(numPlayers, aiFlags = []) {
    $('setup-overlay').style.display = 'none';

    const resolvedAIFlags = Array.from({length: numPlayers}, (_, i) =>
        aiFlags[i] ?? (i > 0)
    );

    G.players = Array.from({length: numPlayers}, (_, i) => ({
        name: `Player ${i + 1}`,
        color: PLAYER_COLORS[i],
        ai: resolvedAIFlags[i],
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

    G.cards = Array.from({length: numPlayers}, () => []);
    G.conqueredThisTurn = false;
    G.cardTradeCount = 0;

    initAI({
        setPhase,
        renderLabel,
        highlightLabel,
        updateHeader,
        resolveBattle,
        renderAll,
        checkWin,
        doFortify,
        getConnectedOwn,
        advanceTurn,
        playSound,
    });

    initCards({
        updateHeader,
        updateCardUI,
    });

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

        while (G.cards[G.turn].length >= 5 && findValidCardSet(G.cards[G.turn])) {
            tradeCards();
        }

        updateCardUI();
    } else if (phase === 'attack') {
        $('end-btn').disabled = false;
        $('end-btn').textContent = 'End Attack';
    } else if (phase === 'fortify') {
        $('end-btn').disabled = false;
        $('end-btn').textContent = 'Skip Fortify';
    }
    updateHeader();

    if (G.players[G.turn]?.ai) {
        if (phase === 'reinforce') setTimeout(aiPlaceArmy, 600);
        else if (phase === 'attack') setTimeout(aiAttack, 600);
        else if (phase === 'fortify') setTimeout(aiFortify, 400);
    }
}

function onEndPhase() {
    if (G.phase === 'attack') { setPhase('fortify'); }
    else if (G.phase === 'fortify') { setSelected(null); advanceTurn(); }
}

function advanceTurn() {
    if (G.conqueredThisTurn) {
        const cardTypes = ['infantry', 'cavalry', 'artillery'];
        const card = cardTypes[Math.floor(Math.random() * 3)];
        G.cards[G.turn].push(card);
        G.conqueredThisTurn = false;
    }

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

// ── Selection & Highlights ────────────────────────────────────────────────

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

// ── Event Handling ────────────────────────────────────────────────────────

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
        playSound('dip-sound');
        renderLabel(id);
        highlightLabel(id);
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
            const result = resolveBattle(G.selected, id);
            renderAll();
            if (result.captured) {
                playSound('boom-sound');
                setSelected(null);
                const minArmies = Math.max(1, result.atkDice - result.aLoss);
                const maxArmies = G.territories[G.selected].armies;
                showCaptureDialog(G.selected, id, minArmies, maxArmies);
            } else if (result.shouldDeselect) {
                setSelected(null);
            }
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
            setSelected(null);
            renderAll();
            advanceTurn();
        }
        return;
    }
}
