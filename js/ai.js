import { G } from './state.js';
import { COUNTRIES, ADJ, CONTINENTS } from './data.js';
import { moveArmiesAfterCapture } from './combat.js';

let gameCtx = {};
const AI_ATTACK_ARROW_DELAY_MS = 140;

const CONTINENT_INDEX_BY_TERRITORY = new Map();
for (let i = 0; i < CONTINENTS.length; i++) {
    for (const territoryId of CONTINENTS[i].territories) {
        const indices = CONTINENT_INDEX_BY_TERRITORY.get(territoryId) ?? [];
        indices.push(i);
        CONTINENT_INDEX_BY_TERRITORY.set(territoryId, indices);
    }
}

function buildContinentStats() {
    return CONTINENTS.map(continent => {
        const byOwner = new Map();
        for (const id of continent.territories) {
            const owner = G.territories[id]?.owner;
            byOwner.set(owner, (byOwner.get(owner) ?? 0) + 1);
        }
        return {
            total: continent.territories.length,
            bonus: continent.bonus,
            byOwner,
        };
    });
}

function getContinentPriorityBonus(toId, attackerOwner, defenderOwner, continentStats) {
    let bonus = 0;
    const continentIndices = CONTINENT_INDEX_BY_TERRITORY.get(toId) ?? [];

    for (const idx of continentIndices) {
        const stats = continentStats[idx];
        const enemyCount = stats.byOwner.get(defenderOwner) ?? 0;
        const myCount = stats.byOwner.get(attackerOwner) ?? 0;

        if (enemyCount === stats.total) {
            bonus += 140 + stats.bonus * 10;
            continue;
        }

        if (enemyCount === stats.total - 1) {
            bonus += 80 + stats.bonus * 8;
        }

        if (myCount === stats.total - 1) {
            bonus += 110 + stats.bonus * 9;
        }
    }

    return bonus;
}

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
    gameCtx.highlightLabel(target);
    gameCtx.updateHeader();

    setTimeout(aiPlaceArmy, 200);
}

export function aiAttack() {
    if (G.phase !== 'attack') return;

    let bestAttacker = null, bestTarget = null, bestScore = -Infinity;
    const continentStats = buildContinentStats();

    for (const fromId of COUNTRIES) {
        const from = G.territories[fromId];
        if (from.owner !== G.turn || from.armies < 3) continue;

        for (const toId of ADJ[fromId]) {
            const to = G.territories[toId];
            if (to.owner === G.turn) continue;

            const score =
                (from.armies - to.armies) +
                getContinentPriorityBonus(toId, from.owner, to.owner, continentStats);
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

    gameCtx.showAttackArrow?.(bestAttacker, bestTarget, G.players[G.turn]?.color);

    setTimeout(() => {
        if (G.phase !== 'attack') return;

        const attacker = G.territories[bestAttacker];
        const target = G.territories[bestTarget];
        if (!attacker || !target || attacker.owner !== G.turn || target.owner === G.turn || attacker.armies < 2) {
            setTimeout(aiAttack, 300);
            return;
        }

        const result = gameCtx.resolveBattle(bestAttacker, bestTarget);
        gameCtx.renderAll();

        if (result.captured) {
            gameCtx.playSound('boom-sound');
            const minArmies = Math.max(1, result.atkDice - result.aLoss);
            const maxArmies = G.territories[bestAttacker].armies;
            const movingArmies = maxArmies > minArmies ? maxArmies - 1 : minArmies;
            moveArmiesAfterCapture(bestAttacker, bestTarget, movingArmies);
            gameCtx.renderAll();
            if (gameCtx.checkWin()) return;
        } else {
            gameCtx.playSound('hit-sound');
        }

        setTimeout(aiAttack, 500);
    }, AI_ATTACK_ARROW_DELAY_MS);
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
