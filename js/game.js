import { G } from './state.js';
import { initSetup } from './setup.js';
import { initFlow, startGame, setPhase, advanceTurn, checkWin } from './flow.js';
import { initDialogs, showCaptureDialog, showFortifyDialog } from './dialogs.js';
import { initInput, setSelected } from './input.js';
import { tradeCards, findValidCardSet } from './cards.js';
import { renderLabel, highlightLabel } from './map.js';
import { updateCardUI } from './ui.js';
import { getConnectedOwn } from './combat.js';

const $ = id => document.getElementById(id);
const ga = (el, n, cb) => $(el).addEventListener(n, cb);

function playSound(elementId) {
    const audio = $(elementId);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}

function onEndPhase() {
    if (G.phase === 'attack') { setPhase('fortify'); }
    else if (G.phase === 'fortify') { setSelected(null); advanceTurn(); }
}

// Initialize all modules
initSetup(startGame);
initFlow(setSelected, checkWin, getConnectedOwn);
initDialogs(checkWin, advanceTurn, setSelected);
initInput({
    playSound,
    renderLabel,
    highlightLabel,
    setPhase,
    showCaptureDialog,
    showFortifyDialog,
});

// Setup remaining event listeners
ga('end-btn', 'click', onEndPhase);

$('trade-btn')?.addEventListener('click', () => {
    if (tradeCards()) {
        if (G.cards[G.turn].length < 5 && !findValidCardSet(G.cards[G.turn])) {
            updateCardUI();
        }
    }
});
