import { G } from './state.js';
import { COUNTRY_SET, ADJ } from './data.js';
import { svg, showAttackArrow, renderAll } from './map.js';
import { updateHeader, updateCursorOverlay } from './ui.js';
import { resolveBattle, connectedOwn, getConnectedOwn } from './combat.js';

let lastMouseX = 0, lastMouseY = 0;
let playSound = null;
let renderLabel = null;
let highlightLabel = null;
let setPhase = null;
let showCaptureDialog = null;
let showFortifyDialog = null;

let holdingTerritory = null;
let holdInterval = null;

export function initInput(deps) {
    playSound = deps.playSound;
    renderLabel = deps.renderLabel;
    highlightLabel = deps.highlightLabel;
    setPhase = deps.setPhase;
    showCaptureDialog = deps.showCaptureDialog;
    showFortifyDialog = deps.showFortifyDialog;

    svg.addEventListener('click', onMapClick);
    svg.addEventListener('mousedown', onMapMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
}

export function setSelected(id) {
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

function onMouseMove(e) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    updateCursorOverlay(e.clientX, e.clientY);
}

function onMapClick(e) {
    if (!G.phase || G.phase === 'gameover') return;
    let el = e.target;
    while (el && el !== svg) {
        if (COUNTRY_SET.has(el.id)) {
            if (G.phase !== 'reinforce') onTerritoryClick(el.id);
            return;
        }
        el = el.parentElement;
    }
    if (G.phase === 'attack' || G.phase === 'fortify') setSelected(null);
}

function onMapMouseDown(e) {
    if (G.phase !== 'reinforce') return;
    let el = e.target;
    while (el && el !== svg) {
        if (COUNTRY_SET.has(el.id)) {
            holdingTerritory = el.id;
            holdInterval = setInterval(() => placeArmy(holdingTerritory), 80);
            placeArmy(el.id);
            return;
        }
        el = el.parentElement;
    }
}

function onMouseUp() {
    if (holdInterval) {
        clearInterval(holdInterval);
        holdInterval = null;
    }
    holdingTerritory = null;
}

function placeArmy(id) {
    const t = G.territories[id];
    if (t.owner !== G.turn || G.armiesToPlace <= 0) return;
    t.armies++;
    G.armiesToPlace--;
    playSound('dip-sound');
    renderLabel(id);
    highlightLabel(id);
    updateHeader();
    updateCursorOverlay(lastMouseX, lastMouseY);
    if (G.armiesToPlace === 0) {
        if (holdInterval) clearInterval(holdInterval);
        holdInterval = null;
        holdingTerritory = null;
        setTimeout(() => setPhase('attack'), 250);
    }
}

function onTerritoryClick(id) {
    const t = G.territories[id];

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
            showAttackArrow(G.selected, id, G.players[G.turn].color);
            const result = resolveBattle(G.selected, id);
            renderAll();
            if (result.captured) {
                playSound('boom-sound');
                const minArmies = Math.max(1, result.atkDice - result.aLoss);
                const maxArmies = G.territories[G.selected].armies;
                const attackerId = G.selected;
                setSelected(null);
                showCaptureDialog(attackerId, id, minArmies, maxArmies);
            } else if (result.shouldDeselect) {
                playSound('hit-sound');
                setSelected(null);
            } else {
                playSound('hit-sound');
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
            const fromId = G.selected;
            const maxArmies = G.territories[fromId].armies - 1;
            setSelected(null);
            showFortifyDialog(fromId, id, maxArmies);
        }
        return;
    }
}

