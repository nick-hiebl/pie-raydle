const STATES = [
    'player-win',
    'player',
    'empty',
    'candidate',
    'unknown',
];

const newCell = (x, y, isTarget, cell) => {
    return {
        x,
        y,
        isTarget,
        empty: false,
        candidate: false,
        html: cell,
    };
};

const samePos = (a, b) => {
    return a.x === b.x && a.y === b.y;
};

const absDist = (a, b) => {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
};

const getCellState = (cell, player, config) => {
    if (samePos(cell, player)) {
        if (cell.isTarget) {
            return 'player-win';
        } else {
            return 'player';
        }
    } else if (config.showTarget && cell.isTarget) {
        return 'debug-target';
    } else if (config.showEmpty && cell.empty) {
        return 'empty';
    } else if (config.showCandidate && cell.candidate) {
        return 'candidate';
    } else {
        return 'unknown';
    }
};

const MIN_RADIUS = 2;
const MAX_RADIUS = 32;

const MIN_X = -16;
const MAX_X = 16;
const MIN_Y = -16;
const MAX_Y = 16;

const SCORE_RADIUS = 1;
const SCORE_MOVE = 10;

const chooseRandomStart = () => {
    const x = MIN_X + Math.floor(Math.random() * (MAX_X - MIN_X + 1));
    const y = MIN_Y + Math.floor(Math.random() * (MAX_Y - MIN_Y + 1));

    if (x === 0 && y === 0) {
        return chooseRandomStart();
    }

    return { x, y };
}

const eventListener = (id, eventName, callback) => {
    document.getElementById(id).addEventListener(eventName, callback);
};

const removeListener = (id, eventName, callback) => {
    document.getElementById(id).removeEventListener(eventName, callback);
};

const loadGrid = () => {
    const cells = [];

    for (const row of Array.from(document.getElementById('grid').children)) {
        cells.push(Array.from(row.children));
    }

    return cells;
};

const createOrLoadGrid = () => {
    const grid = document.getElementById('grid');

    if (grid.children.length > 0) {
        return loadGrid();
    }

    const cells = [];

    for (let y = MIN_Y; y <= MAX_Y; y++) {
        const row = document.createElement('row');
        row.classList.add('grid-row');
        const dataRow = [];

        for (let x = MIN_X; x <= MAX_X; x++) {
            const htmlCell = document.createElement('div');
            htmlCell.classList.add('cell');

            dataRow.push(htmlCell);
            row.appendChild(htmlCell);
        }

        cells.push(dataRow);
        grid.appendChild(row);
    }

    return cells;
};

function startGame(onComplete, onReset, gameConfig) {
    const pos = { x: 0, y: 0 };
    let radius = 8;
    const targetSpot = chooseRandomStart();
    let score = 0;
    let isFinished = false;
    let timeStarted = false;
    let startTime = 0;
    let endTime;
    let hasMarkedCandidates = false;

    const data = [];

    const cells = createOrLoadGrid();

    for (let y = MIN_Y; y <= MAX_Y; y++) {
        const cellsRow = cells[y - MIN_Y];

        const dataRow = [];

        for (let x = MIN_X; x <= MAX_X; x++) {
            const htmlCell = cellsRow[x - MIN_X];

            const isTarget = x === targetSpot.x && y === targetSpot.y;

            const cell = newCell(x, y, isTarget, htmlCell);

            dataRow.push(cell);
        }

        data.push(dataRow);
    }

    const updateTimestamp = () => {
        const duration = endTime
            ? endTime - startTime
            : startTime > 0
                ? performance.now() - startTime
                : 0;

        document.getElementById('time').innerText = `${(duration / 1_000).toFixed(2)}s`;
    };

    const updateVisuals = () => {
        const distanceToTarget = absDist(pos, targetSpot);
        const detected = distanceToTarget <= radius;

        const markingCandidates = detected && !hasMarkedCandidates;

        if (markingCandidates) {
            hasMarkedCandidates = true;
        }

        for (let row of data) {
            for (let cell of row) {
                const inRange = absDist(pos, cell) <= radius;

                if (!detected && inRange) {
                    cell.empty = true;
                    cell.candidate = false;
                } else if (markingCandidates && inRange) {
                    cell.candidate = true;
                } else if (detected && !inRange) {
                    cell.candidate = false;
                } else if (samePos(cell, pos)) {
                    cell.candidate = false;
                }

                cell.html.dataset.state = getCellState(cell, pos, gameConfig);
                cell.html.dataset.border = gameConfig.showRadius && absDist(cell, pos) === radius ? 'highlight' : undefined;
            }
        }

        updateTimestamp();

        document.getElementById('radius').innerText = radius.toString();
        document.getElementById('detected').innerText = detected ? 'YES' : 'NO';
        document.getElementById('score').innerText = score.toString();
    };

    updateVisuals();

    const startTimeLoop = () => {
        updateTimestamp();

        if (!isFinished) {
            requestAnimationFrame(startTimeLoop);
        }
    };

    const radiusInc = () => {
        if (!isFinished && radius < MAX_RADIUS) {
            score += SCORE_RADIUS;
            radius += 1;
            updateVisuals();

            if (!timeStarted) {
                startTimeLoop();
                timeStarted = true;
                startTime = performance.now();
            }
        }
    };

    const radiusDec = () => {
        if (!isFinished && radius > MIN_RADIUS) {
            score += SCORE_RADIUS;
            radius -= 1;
            updateVisuals();

            if (!timeStarted) {
                startTimeLoop();
                timeStarted = true;
                startTime = performance.now();
            }
        }
    };

    const postMove = () => {
        if (!timeStarted) {
            startTimeLoop();
            timeStarted = true;
            startTime = performance.now();
        }

        score += SCORE_MOVE;
        updateVisuals();
        if (samePos(pos, targetSpot)) {
            isFinished = true;
            endTime = performance.now();
            onComplete({ score, duration: endTime - startTime });
        }
    };

    const moveLeft = () => {
        if (!isFinished) {
            pos.x -= 1;
            postMove();
        }
    };
    const moveRight = () => {
        if (!isFinished) {
            pos.x += 1;
            postMove();
        }
    };
    const moveUp = () => {
        if (!isFinished) {
            pos.y -= 1;
            postMove();
        }
    };
    const moveDown = () => {
        if (!isFinished) {
            pos.y += 1;
            postMove();
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'f') {
            radiusInc();
        } else if (e.key === 'F') {
            radiusDec();
        } else if (['w', 'arrowup'].includes(e.key.toLowerCase())) {
            moveUp();
        } else if (['s', 'arrowdown'].includes(e.key.toLowerCase())) {
            moveDown();
        } else if (['a', 'arrowleft'].includes(e.key.toLowerCase())) {
            moveLeft();
        } else if (['d', 'arrowright'].includes(e.key.toLowerCase())) {
            moveRight();
        } else if (['r'].includes(e.key.toLowerCase())) {
            onReset();
        }
    };

    eventListener('radius-inc', 'click', radiusInc);
    eventListener('radius-dec', 'click', radiusDec);

    eventListener('up', 'click', moveUp);
    eventListener('down', 'click', moveDown);
    eventListener('left', 'click', moveLeft);
    eventListener('right', 'click', moveRight);

    eventListener('reset-game', 'click', onReset);

    document.addEventListener('keydown', onKeyDown);

    const cleanup = () => {
        isFinished = true;

        removeListener('radius-inc', 'click', radiusInc);
        removeListener('radius-dec', 'click', radiusDec);

        removeListener('up', 'click', moveUp);
        removeListener('down', 'click', moveDown);
        removeListener('left', 'click', moveLeft);
        removeListener('right', 'click', moveRight);

        removeListener('reset-game', 'click', onReset);

        document.removeEventListener('keydown', onKeyDown);
    };

    return {
        cleanup,
    };
}

const INTRO_CONFIG = {
    showTarget: true,
    showCandidate: true,
    showEmpty: true,
    showRadius: true,
};

const EASY_CONFIG = {
    showTarget: false,
    showCandidate: true,
    showEmpty: true,
    showRadius: true,
};

const HARD_CONFIG = {
    showTarget: false,
    showCandidate: false,
    showEmpty: false,
    showRadius: false,
};

document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('game-menu');
    const game = document.getElementById('game-layout');

    let lastCleanup = null;
    let currentConfig = HARD_CONFIG;

    const onComplete = (data) => {
        console.log('data', data);
    };

    const backToMenu = () => {
        menu.dataset.hidden = false;
        game.dataset.hidden = true;

        if (lastCleanup) {
            lastCleanup();
        }
    };

    const onStart = () => {
        if (lastCleanup) {
            lastCleanup();
        }

        setTimeout(() => {
            menu.dataset.hidden = true;
            game.dataset.hidden = false;

            const { cleanup } = startGame(
                onComplete,
                onStart,
                currentConfig,
            );

            lastCleanup = cleanup;
        }, 100);
    };

    game.dataset.hidden = true;

    eventListener('start-intro', 'click', () => {
        currentConfig = INTRO_CONFIG;
        onStart();
    });

    eventListener('start-easy', 'click', () => {
        currentConfig = EASY_CONFIG;
        onStart();
    });

    eventListener('start-hard', 'click', () => {
        currentConfig = HARD_CONFIG;
        onStart();
    });

    eventListener('return-to-menu', 'click', () => {
        backToMenu();
    });
});
