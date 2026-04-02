import { G } from './state.js';
import { initSetup } from './setup.js';
import { initFlow, startGame, setPhase, advanceTurn, checkWin } from './flow.js';
import { initDialogs, showCaptureDialog, showFortifyDialog } from './dialogs.js';
import { initInput, setSelected } from './mobile-input.js';
import { tradeCards, findValidCardSet } from './cards.js';
import { renderLabel, highlightLabel } from './map.js';
import { updateCardUI } from './ui.js';
import { getConnectedOwn } from './combat.js';

const $ = id => document.getElementById(id);
const ga = (el, n, cb) => $(el)?.addEventListener(n, cb);

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
    updateMobileSidebar,
});

// Setup event listeners
ga('end-btn', 'click', () => {
    onEndPhase();
    updateMobileSidebar();
});

ga('win-banner', 'click', (e) => {
    if (e.target.id === 'win-banner') {
        $('win-banner').style.display = 'none';
    }
});

$('trade-btn')?.addEventListener('click', () => {
    if (tradeCards()) {
        updateCardUI();
        updateMobileSidebar();
    }
});

function updateMobileSidebar() {
    if (!G.phase || !G.players || !G.players[G.turn]) return;
    if (G.phase === 'gameover') return;

    const player = G.players[G.turn];
    const phaseLabel = $('phase-label');
    const armiesDisplay = $('armies-display');
    const cardsDisplay = $('cards-display');
    const actionHint = $('action-hint');
    const tradeBtn = $('trade-btn');
    const endBtn = $('end-btn');

    const phaseText = {
        reinforce: 'REINFORCE',
        attack: 'ATTACK',
        fortify: 'FORTIFY'
    }[G.phase] || '';

    if (phaseLabel) {
        phaseLabel.textContent = phaseText;
        phaseLabel.style.color = player.color;
    }

    if (armiesDisplay) armiesDisplay.textContent = `Armies: ${G.armiesToPlace || '0'}`;
    if (cardsDisplay) cardsDisplay.textContent = `Cards: ${(G.cards[G.turn] || []).length}`;

    let hint = '';
    if (G.phase === 'reinforce') {
        hint = 'Tap territory to place army';
    } else if (G.phase === 'attack') {
        hint = G.selected ? 'Tap enemy to attack' : 'Tap territory (2+ armies)';
    } else if (G.phase === 'fortify') {
        hint = G.selected ? 'Tap connected territory' : 'Tap territory (2+ armies)';
    }
    if (actionHint) actionHint.textContent = hint;

    if (endBtn) {
        endBtn.disabled = G.phase === 'reinforce' && G.armiesToPlace > 0;
        endBtn.textContent = G.phase === 'attack' ? 'End Attack' : G.phase === 'fortify' ? 'End Fortify' : 'End Phase';
    }

    if (tradeBtn) {
        tradeBtn.style.display = findValidCardSet(G.cards[G.turn] || []) ? 'block' : 'none';
    }
}

