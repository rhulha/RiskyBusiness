import { G, PLAYER_COLORS } from './state.js';

const $ = id => document.getElementById(id);
const ga = (el, n, cb) => $(el).addEventListener(n, cb);

export function initSetup(startGame) {
    for (let n = 2; n <= 6; n++) {
        const btn = document.createElement('button');
        btn.className = 'pbtn';
        btn.textContent = n;
        btn.style.background = PLAYER_COLORS[n - 2];
        btn.addEventListener('click', () => showPlayerConfig(n, startGame));
        $('player-btns').appendChild(btn);
    }
}

export function showPlayerConfig(numPlayers, startGame) {
    $('setup-step1').style.display = 'none';
    $('setup-step2').style.display = 'block';

    const config = $('player-config');
    config.innerHTML = '';

    for (let i = 0; i < numPlayers; i++) {
        const row = document.createElement('div');
        row.className = 'player-config-row';
        const humanBtn = document.createElement('button');
        const aiBtn = document.createElement('button');

        const defaultIsAI = i > 0;

        humanBtn.className = `toggle-btn${defaultIsAI ? '' : ' active'}`;
        humanBtn.textContent = 'Human';
        humanBtn.dataset.player = i;
        humanBtn.dataset.type = 'human';

        aiBtn.className = `toggle-btn${defaultIsAI ? ' active' : ''}`;
        aiBtn.textContent = 'AI';
        aiBtn.dataset.player = i;
        aiBtn.dataset.type = 'ai';

        [humanBtn, aiBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                config.querySelectorAll(`.toggle-btn[data-player="${i}"]`).forEach(b =>
                    b.classList.toggle('active', b === btn)
                );
            });
        });

        const dot = document.createElement('div');
        dot.className = 'player-config-dot';
        dot.style.background = PLAYER_COLORS[i];

        const label = document.createElement('span');
        label.textContent = `Player ${i + 1}`;

        const toggle = document.createElement('div');
        toggle.className = 'ai-toggle';
        toggle.appendChild(humanBtn);
        toggle.appendChild(aiBtn);

        row.appendChild(dot);
        row.appendChild(label);
        row.appendChild(toggle);
        config.appendChild(row);
    }

    $('start-btn').onclick = () => {
        const aiFlags = Array.from({length: numPlayers}, (_, i) => {
            const aiBtn = config.querySelector(`.toggle-btn[data-player="${i}"][data-type="ai"]`);
            return aiBtn.classList.contains('active');
        });
        startGame(numPlayers, aiFlags);
    };
}
