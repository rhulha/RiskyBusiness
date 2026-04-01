import { G, PLAYER_COLORS, DIE_FACES, SVG_NS } from './state.js';
import { DISPLAY } from './data.js';

const $ = id => document.getElementById(id);

const soldierSrc = await fetch('../images/soldier.svg').then(r => r.text());
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

export function updateHeader() {
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

export function updateCardUI() {
    const cardsBadge = $('cards-badge');
    const tradeBtn = $('trade-btn');
    const playerCards = G.cards[G.turn];

    cardsBadge.textContent = playerCards.length > 0 ? `🃏 ${playerCards.length}` : '';

    if (!tradeBtn) return;

    if (G.phase === 'reinforce') {
        const count = {infantry: 0, cavalry: 0, artillery: 0};
        for (const card of playerCards) count[card]++;
        const hasSet = (count.infantry >= 3 || count.cavalry >= 3 || count.artillery >= 3 ||
                       (count.infantry && count.cavalry && count.artillery));
        tradeBtn.style.display = hasSet ? 'block' : 'none';
        if (playerCards.length >= 5) tradeBtn.classList.add('forced-trade');
        else tradeBtn.classList.remove('forced-trade');
    } else {
        tradeBtn.style.display = 'none';
    }
}

export function updateCursorOverlay(x, y) {
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

export function logCombat(fromId, toId, defOwner, aRolls, dRolls, aLoss, dLoss, captured) {
    const log = $('combat-log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const atkColor = G.players[G.turn].color;
    const defColor = G.players[defOwner].color;
    const atkDiceStr = aRolls.map(d => DIE_FACES[d-1]).join(' ');
    const defDiceStr = dRolls.map(d => DIE_FACES[d-1]).join(' ');

    let html = `<span style="color: ${atkColor}; font-weight: bold;">${DISPLAY[fromId]}</span> `;
    html += `→ <span style="color: ${defColor}; font-weight: bold;">${DISPLAY[toId]}</span><br>`;
    html += `Att: <span class="dice">${atkDiceStr}</span> vs Def: <span class="dice">${defDiceStr}</span><br>`;

    if (captured) {
        html += `<span style="color: #2ecc71; font-weight: bold;">⚔ Territory captured!</span>`;
    } else {
        const parts = [];
        if (aLoss) parts.push(`Attacker −${aLoss}`);
        if (dLoss) parts.push(`Defender −${dLoss}`);
        html += parts.join(' · ');
    }

    entry.innerHTML = html;
    log.insertBefore(entry, log.firstChild);

    while (log.children.length > 8) {
        log.removeChild(log.lastChild);
    }
}
