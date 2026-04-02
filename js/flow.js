import { G, PLAYER_COLORS, INIT_ARMIES } from './state.js';
import { COUNTRIES, CONTINENTS } from './data.js';
import { renderAll, renderLabel, highlightLabel, showAttackArrow } from './map.js';
import { updateHeader, updateCardUI } from './ui.js';
import { initAI, aiPlaceArmy, aiAttack, aiFortify } from './ai.js';
import { initCards, findValidCardSet, tradeCards } from './cards.js';
import { resolveBattle, doFortify } from './combat.js';

const $ = id => document.getElementById(id);

let setSelectedFn = null;
let checkWinFn = null;
let getConnectedOwnFn = null;

export function initFlow(setSelected, checkWin, getConnectedOwn) {
    setSelectedFn = setSelected;
    checkWinFn = checkWin;
    getConnectedOwnFn = getConnectedOwn;
}

export function startGame(numPlayers, aiFlags = [], cardTradeType = 'increasing') {
    $('setup-overlay').style.display = 'none';

    const resolvedAIFlags = Array.from({length: numPlayers}, (_, i) =>
        aiFlags[i] ?? (i > 0)
    );

    G.cardTradeType = cardTradeType;
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
        showAttackArrow,
        updateHeader,
        resolveBattle,
        renderAll,
        checkWin: checkWinFn,
        doFortify,
        getConnectedOwn: getConnectedOwnFn,
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

export function setPhase(phase) {
    G.phase = phase;
    setSelectedFn(null);

    const tradeBtn = $('trade-btn');
    if (phase === 'reinforce') {
        G.armiesToPlace = calcReinforcements();
        $('end-btn').disabled = true;
        $('end-btn').textContent = 'End Phase';

        while (G.cards[G.turn].length >= 5 && findValidCardSet(G.cards[G.turn])) {
            tradeCards();
        }

        if (tradeBtn) tradeBtn.disabled = false;
        updateCardUI();
    } else if (phase === 'attack') {
        $('end-btn').disabled = false;
        $('end-btn').textContent = 'End Attack';
        if (tradeBtn) tradeBtn.disabled = true;
    } else if (phase === 'fortify') {
        $('end-btn').disabled = false;
        $('end-btn').textContent = 'Skip Fortify';
        if (tradeBtn) tradeBtn.disabled = true;
    }
    updateHeader();

    if (G.players[G.turn]?.ai) {
        if (phase === 'reinforce') setTimeout(aiPlaceArmy, 600);
        else if (phase === 'attack') setTimeout(aiAttack, 600);
        else if (phase === 'fortify') setTimeout(aiFortify, 400);
    }
}

export function advanceTurn() {
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

export function calcReinforcements() {
    const mine = COUNTRIES.filter(id => G.territories[id]?.owner === G.turn);
    if (mine.length === 0) {
        const fallback = Object.values(G.territories).filter(t => t.owner === G.turn).length;
        return Math.max(3, Math.floor(fallback / 3));
    }
    let n = Math.max(3, Math.floor(mine.length / 3));
    for (const c of CONTINENTS) {
        if (c.territories.every(id => G.territories[id]?.owner === G.turn)) n += c.bonus;
    }
    return n;
}

export function checkWin() {
    if (COUNTRIES.every(id => G.territories[id].owner === G.turn)) {
        G.phase = 'gameover';
        const p = G.players[G.turn];
        $('win-name').textContent  = p.name;
        $('win-name').style.color  = p.color;
        $('win-banner').style.display = 'flex';
        $('end-btn').disabled = true;
        playSound('didi-sound');
        return true;
    }
    return false;
}

function playSound(elementId) {
    const audio = $(elementId);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}
