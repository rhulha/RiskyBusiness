import { G } from './state.js';
import { COUNTRIES, ADJ } from './data.js';

let gameCtx = {};

export function initAI(context) {
    gameCtx = context;
}

export function aiPlaceArmy() {
    if (G.phase !== 'reinforce') return;

    if (G.armiesToPlace <= 0) {
        setTimeout(() => gameCtx.setPhase('attack'), 300);
        return;
    }

    const mine = COUNTRIES.filter(id => G.territories[id].owner === G.turn);
    const frontline = mine.filter(id => ADJ[id].some(adj => G.territories[adj]?.owner !== G.turn));
    const candidates = frontline.length > 0 ? frontline : mine;
    const target = candidates.reduce((best, id) =>
        G.territories[id].armies < G.territories[best].armies ? id : best
    );

    G.territories[target].armies++;
    G.armiesToPlace--;
    gameCtx.playSound('dip-sound');
    gameCtx.renderLabel(target);
    gameCtx.updateHeader();

    setTimeout(aiPlaceArmy, 200);
}

export function aiAttack() {
    if (G.phase !== 'attack') return;

    let bestAttacker = null, bestTarget = null, bestScore = -Infinity;

    for (const fromId of COUNTRIES) {
        const from = G.territories[fromId];
        if (from.owner !== G.turn || from.armies < 3) continue;

        for (const toId of ADJ[fromId]) {
            const to = G.territories[toId];
            if (to.owner === G.turn) continue;

            const score = from.armies - to.armies;
            if (score > bestScore) {
                bestScore = score;
                bestAttacker = fromId;
                bestTarget = toId;
            }
        }
    }

    if (!bestAttacker || bestScore <= 0) {
        setTimeout(() => gameCtx.setPhase('fortify'), 400);
        return;
    }

    const result = gameCtx.resolveBattle(bestAttacker, bestTarget);
    gameCtx.renderAll();

    if (result.captured) {
        gameCtx.playSound('boom-sound');
        if (gameCtx.checkWin()) return;
    }

    setTimeout(aiAttack, 500);
}

export function aiFortify() {
    if (G.phase !== 'fortify') return;

    const mine = COUNTRIES.filter(id => G.territories[id].owner === G.turn);
    const frontline = new Set(mine.filter(id => ADJ[id].some(adj => G.territories[adj]?.owner !== G.turn)));
    const interior = mine.filter(id => !frontline.has(id) && G.territories[id].armies > 1);

    for (const fromId of interior) {
        if (G.territories[fromId].armies < 2) continue;
        const connected = gameCtx.getConnectedOwn(fromId);

        let bestTarget = null, bestGain = 0;
        for (const toId of connected) {
            if (!frontline.has(toId)) continue;
            const gain = G.territories[fromId].armies - G.territories[toId].armies - 1;
            if (gain > bestGain) {
                bestGain = gain;
                bestTarget = toId;
            }
        }

        if (bestTarget) {
            gameCtx.doFortify(fromId, bestTarget);
            gameCtx.renderAll();
            break;
        }
    }

    gameCtx.advanceTurn();
}
