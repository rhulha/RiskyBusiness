# RISK

A browser-based implementation of the classic strategy game RISK, playable against AI opponents.

## Features

- **Local multiplayer & AI opponents** — Play against up to 5 other players (human or AI)
- **Three game phases** — Reinforce, Attack, and Fortify each turn
- **Card trading system** — Earn cards when capturing territories, trade sets for army bonuses
- **Continent bonuses** — Control entire continents for extra armies
- **Cryptographically secure dice rolls** — Fair, unpredictable combat outcomes
- **Combat log** — See detailed battle results in real time
- **Player status display** — Track how many territories each player controls

## How to Play

### Setup
1. Open `index.html` in a browser
2. Select number of players (2-6)
3. Choose which players are human vs AI

### Gameplay

Each turn has three phases:

**Reinforce** — Place new armies on your territories
- Earn armies based on: territories controlled ÷ 3 (min 3), plus continent bonuses
- Trade cards for bonus armies (sets of 3 matching or 1 of each)

**Attack** — Declare war on adjacent enemy territories
- Select your territory (2+ armies) → click enemy territory
- Roll dice to determine winners
- Move armies into captured territories
- Continue attacking or end phase

**Fortify** — Move armies between connected territories (optional)
- Select a territory → click another friendly connected territory
- Move any number of armies (leaving at least 1 behind)
- Skip to next player's turn

### Winning

Conquer all territories to dominate the world!

## Architecture

- `index.html` — Game structure
- `js/game.js` — Main orchestrator
- `js/flow.js` — Game phases and turn management
- `js/input.js` — Player input and territory selection
- `js/combat.js` — Battle resolution and dice
- `js/ai.js` — AI player logic
- `js/cards.js` — Card trading system
- `js/setup.js` — Player configuration
- `js/dialogs.js` — Army movement dialogs
- `js/state.js` — Global game state
- `js/data.js` — Map data and constants
- `js/map.js` — SVG rendering
- `js/ui.js` — Header, logs, and UI updates
