import { G } from './state.js';
import { renderAll } from './map.js';
import { moveArmiesAfterCapture } from './combat.js';

const $ = id => document.getElementById(id);
const ga = (el, n, cb) => $(el).addEventListener(n, cb);

let checkWinFn = null;
let advanceTurnFn = null;
let setSelectedFn = null;

export function initDialogs(checkWin, advanceTurn, setSelected) {
    checkWinFn = checkWin;
    advanceTurnFn = advanceTurn;
    setSelectedFn = setSelected;

    ga('army-slider', 'input', (e) => {
        $('army-value').textContent = e.target.value;
    });
    ga('army-slider', 'keydown', (e) => {
        if (e.key === 'Enter') confirmCapture();
    });
    ga('capture-confirm-btn', 'click', confirmCapture);
    ga('capture-box', 'click', confirmCapture);
    ga('capture-overlay', 'click', (e) => {
        if (e.target.id === 'capture-overlay') confirmCapture();
    });

    ga('fortify-slider', 'input', (e) => {
        $('fortify-value').textContent = e.target.value;
    });
    ga('fortify-slider', 'keydown', (e) => {
        if (e.key === 'Enter') confirmFortify();
    });
    ga('fortify-confirm-btn', 'click', confirmFortify);
    ga('fortify-box', 'click', confirmFortify);
    ga('fortify-overlay', 'click', (e) => {
        if (e.target.id === 'fortify-overlay') confirmFortify();
    });
}

export function showCaptureDialog(fromId, toId, minArmies, maxArmies) {
    G.pendingCapture = {fromId, toId, minArmies, maxArmies};

    $('capture-msg').textContent = `Moving armies from ${fromId} to ${toId}`;

    const slider = $('army-slider');
    slider.min = minArmies;
    slider.max = maxArmies;
    slider.value = maxArmies;
    $('army-value').textContent = maxArmies;

    $('capture-overlay').style.display = 'flex';
    slider.focus();
}

export function confirmCapture() {
    if (!G.pendingCapture) return;

    const {fromId, toId} = G.pendingCapture;
    const movingArmies = parseInt($('army-slider').value);

    moveArmiesAfterCapture(fromId, toId, movingArmies);
    renderAll();

    G.pendingCapture = null;
    $('capture-overlay').style.display = 'none';

    if (checkWinFn()) return;

    setSelectedFn(toId);
}

export function showFortifyDialog(fromId, toId, maxArmies) {
    G.pendingFortify = {fromId, toId, maxArmies};

    $('fortify-msg').textContent = `Moving armies from ${fromId} to ${toId}`;

    const slider = $('fortify-slider');
    slider.min = 1;
    slider.max = maxArmies;
    slider.value = maxArmies;
    $('fortify-value').textContent = maxArmies;

    $('fortify-overlay').style.display = 'flex';
    slider.focus();
}

export function confirmFortify() {
    if (!G.pendingFortify) return;

    const {fromId, toId} = G.pendingFortify;
    const movingArmies = parseInt($('fortify-slider').value);

    const from = G.territories[fromId];
    const to = G.territories[toId];
    from.armies -= movingArmies;
    to.armies += movingArmies;

    renderAll();
    G.pendingFortify = null;
    $('fortify-overlay').style.display = 'none';

    advanceTurnFn();
}
