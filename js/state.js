export const SVG_NS = 'http://www.w3.org/2000/svg';

export const PLAYER_COLORS = ['#e74c3c','#3498db','#2ecc71','#f1c40f','#9b59b6','#e67e22'];
export const INIT_ARMIES   = {2:40, 3:35, 4:30, 5:25, 6:20};
export const DIE_FACES     = ['⚀','⚁','⚂','⚃','⚄','⚅'];

export const G = {
    phase: null,        // reinforce | attack | fortify | gameover
    turn: 0,
    players: [],        // [{name, color}]
    territories: {},    // id -> {owner, armies}
    armiesToPlace: 0,
    selected: null,
    cards: [],          // per player: [['infantry','cavalry',...], ...]
    conqueredThisTurn: false,
    cardTradeCount: 0,  // increments per trade
    pendingCapture: null,  // {fromId, toId, minArmies, maxArmies}
};

