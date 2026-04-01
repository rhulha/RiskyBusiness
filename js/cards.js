import { G } from './state.js';

let gameCtx = {};

export function initCards(context) {
    gameCtx = context;
}

export function findValidCardSet(cards) {
    const count = {infantry: 0, cavalry: 0, artillery: 0};
    for (const card of cards) count[card]++;

    if (count.infantry >= 3) return ['infantry', 'infantry', 'infantry'];
    if (count.cavalry >= 3) return ['cavalry', 'cavalry', 'cavalry'];
    if (count.artillery >= 3) return ['artillery', 'artillery', 'artillery'];
    if (count.infantry && count.cavalry && count.artillery) {
        return ['infantry', 'cavalry', 'artillery'];
    }
    return null;
}

export function getCardTradeValue(tradeIndex) {
    const schedule = [4, 6, 8, 10, 12, 15];
    if (tradeIndex < schedule.length) return schedule[tradeIndex];
    return 20 + (tradeIndex - 5) * 5;
}

export function tradeCards() {
    const playerCards = G.cards[G.turn];
    const set = findValidCardSet(playerCards);
    if (!set) return false;

    for (const card of set) {
        const idx = playerCards.indexOf(card);
        if (idx >= 0) playerCards.splice(idx, 1);
    }

    const bonus = getCardTradeValue(G.cardTradeCount);
    G.armiesToPlace += bonus;
    G.cardTradeCount++;

    gameCtx.updateHeader();
    gameCtx.updateCardUI();
    return true;
}
