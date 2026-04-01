import { G, DIE_FACES } from './state.js';
import { ADJ, COUNTRIES } from './data.js';
import { logCombat } from './ui.js';

export function resolveBattle(fromId, toId) {
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
        G.conqueredThisTurn = true;
    }

    logCombat(fromId, toId, defOwnerBefore, aRolls, dRolls, aLoss, dLoss, captured);

    return {
        captured,
        shouldDeselect: atk.armies < 2
    };
}

export function rollDice(n) {
    return Array.from({length: n}, () => Math.ceil(Math.random() * 6));
}

export function doFortify(fromId, toId) {
    const from = G.territories[fromId];
    const to   = G.territories[toId];
    const move = from.armies - 1;
    from.armies = 1;
    to.armies  += move;
}

export function getConnectedOwn(startId) {
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

export function connectedOwn(fromId, toId) {
    return getConnectedOwn(fromId).has(toId);
}
