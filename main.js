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

const DEBUG_SHOW_TARGET = false;
const DEBUG_SHOW_EMPTY = false;
const DEBUG_SHOW_RADIUS = false;
const DEBUG_SHOW_CANDIDATE = false;

const samePos = (a, b) => {
    return a.x === b.x && a.y === b.y;
};

const absDist = (a, b) => {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
};

const getCellState = (cell, player) => {
    if (samePos(cell, player)) {
        if (cell.isTarget) {
            return 'player-win';
        } else {
            return 'player';
        }
    } else if (DEBUG_SHOW_TARGET && cell.isTarget) {
        return 'debug-target';
    } else if (DEBUG_SHOW_EMPTY && cell.empty) {
        return 'empty';
    } else if (DEBUG_SHOW_CANDIDATE && cell.candidate) {
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

function main() {
    const pos = { x: 0, y: 0 };
    let radius = 8;
    const targetSpot = chooseRandomStart();
    let score = 0;
    let isFinished = false;
    let timeStarted = false;
    let startTime = 0;
    let endTime;
    let hasMarkedCandidates = false;

    const grid = document.getElementById('grid');
    const data = [];

    for (let y = MIN_Y; y <= MAX_Y; y++) {
        const row = document.createElement('row');
        row.classList.add('grid-row');
        const dataRow = [];

        for (let x = MIN_X; x <= MAX_X; x++) {
            const htmlCell = document.createElement('div');
            htmlCell.classList.add('cell');

            const isTarget = x === targetSpot.x && y === targetSpot.y;

            const cell = newCell(x, y, isTarget, htmlCell);

            dataRow.push(cell);

            row.appendChild(htmlCell);
        }

        grid.appendChild(row);
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

                cell.html.dataset.state = getCellState(cell, pos);
                cell.html.dataset.border = DEBUG_SHOW_RADIUS && absDist(cell, pos) === radius ? 'highlight' : undefined;
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

    eventListener('radius-inc', 'click', radiusInc);
    eventListener('radius-dec', 'click', radiusDec);

    eventListener('up', 'click', moveUp);
    eventListener('down', 'click', moveDown);
    eventListener('left', 'click', moveLeft);
    eventListener('right', 'click', moveRight);

    document.addEventListener('keydown', (e) => {
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
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        main();
    }, 100);
});
