const DIRECTION = {
    TOP: 1,
    RIGHT: 1 << 1,
    BOTTOM: 1 << 2,
    LEFT: 1 << 3,
}

const COMMON_COLOR = 'lightgray'
const canvas = document.getElementById('canvas')
const CTX_WIDTH = 640
const CTX_HEIGHT = 480

canvas.setAttribute('width', CTX_WIDTH)
canvas.setAttribute('height', CTX_HEIGHT)
canvas.setAttribute('style', 'border: gray 1px solid;')

const ctx = canvas.getContext('2d')
ctx.fillStyle = COMMON_COLOR

// block
const BLOCK = {
    w: 80,
    h: 22,
    row: 5,
    col: 6,
    space: 22,
    initX: 0,
    total: 0,
}

// 每行开始X坐标 = (整体宽度 - 块宽度 * 块个数 - 空白 * (块个数 - 1)) / 2
BLOCK.initX = (CTX_WIDTH - BLOCK.w * BLOCK.col - BLOCK.space * (BLOCK.col - 1)) / 2,
BLOCK.total = BLOCK.row * BLOCK.col

const blocks = []
for (let i = 0; i < BLOCK.row; i++) {
    blocks.push([])

    let x = BLOCK.initX
    let y = BLOCK.space + i * (BLOCK.h + BLOCK.space)
    const current = blocks[i]

    for (let j = 0; j < BLOCK.col; j++) {
        const obj = {
            x,
            y,
            active: true
        }

        current.push(obj)
        x += BLOCK.w + BLOCK.space
    }
}

// guard
const GUARD = {
    x: 0,
    y: 0,
    w: 100,
    h: 10,
    v: 8,
    left: false,
    right: false,
}

GUARD.x = (CTX_WIDTH - GUARD.w) / 2
GUARD.y = CTX_HEIGHT - GUARD.h

// ball
const BALL = {
    radius: 12,
    easyV: 6,
    normalV: 8,
    hardV: 9,
    vx: 0,
    vy: 0,
    x: 0,
    y: 0,
}

let currentLevel = localStorage.getItem('game-level') || 'easy'
document.getElementById(currentLevel).checked = true

function guardCenter() {
    return GUARD.x + GUARD.w / 2
}

BALL.x = guardCenter()
BALL.y = GUARD.y - BALL.radius

// events
document.querySelectorAll('input[name="level"]').forEach(elem => {
    elem.addEventListener('change', () => {
        currentLevel = elem.id
        localStorage.setItem('game-level', currentLevel)
        elem.blur()
    })
})

document.addEventListener('keydown', evt => {
    if (evt.key === 'ArrowRight') {
        GUARD.right = true
    }

    if (evt.key === 'ArrowLeft') {
        GUARD.left = true
    }

    if (!isStart && evt.key === 'ArrowUp') {
        isStart = true
        BALL.vx = BALL[currentLevel + 'V']
        BALL.vy = -BALL.vx
    }
})

document.addEventListener('keyup', evt => {
    if (evt.key === 'ArrowRight') {
        GUARD.right = false
    }

    if (evt.key === 'ArrowLeft') {
        GUARD.left = false
    }
})

// game 
let game = null
let isStart = false

draw()
function draw() {
    ctx.clearRect(0, 0, CTX_WIDTH, CTX_HEIGHT);

    drawBlocks()
    drawGuard()
    drawBall()

    game = requestAnimationFrame(draw)
}

function drawBlocks() {
    for (let i = 0; i < blocks.length; i++) {
        for (let j = 0; j < blocks[i].length; j++) {
            const current = blocks[i][j]
            if (current.active) {
                ctx.fill(getBlock(current.x, current.y))
            }
        }
    }
}

function drawGuard() {
    if (GUARD.left && GUARD.x > 0) {
        GUARD.x -= GUARD.v
    } else if (GUARD.right && GUARD.x + GUARD.w < CTX_WIDTH) {
        GUARD.x += GUARD.v
    }

    if (GUARD.x < 0) { GUARD.x = 0 }
    if (GUARD.x + GUARD.w > CTX_WIDTH) { GUARD.x = CTX_WIDTH - GUARD.w }

    ctx.fill(getGuard(GUARD.x, GUARD.y))
}

function drawBall() {
    if (isStart) {
        handleCollision()
    } else {
        BALL.x = guardCenter()
    }

    const originStyle = ctx.fillStyle
    ctx.fillStyle = 'lightblue'
    ctx.fill(getBall(BALL.x, BALL.y))
    ctx.fillStyle = originStyle

    if (isStart) {
        BALL.x += BALL.vx
        BALL.y += BALL.vy
    }
}

function handleCollision() {
    contextCollision()
    guardCollision()
    blockCollision()
}

function contextCollision() {
    // context top
    if (BALL.y - BALL.radius < 0) {
        BALL.vy = -BALL.vy
    }

    // context bottom - game over
    if (BALL.y + BALL.radius > CTX_HEIGHT) {
        BALL.y = CTX_HEIGHT - BALL.radius
        failed()
        return 
    }

    // context right or left
    if (BALL.x + BALL.radius > CTX_WIDTH || BALL.x - BALL.radius < 0) {
        BALL.vx = -BALL.vx
    }
}

function guardCollision() {
    const result = getCollisionDetection(GUARD.x, GUARD.y, GUARD.w, GUARD.h)
    if (result & DIRECTION.TOP) {
        BALL.vy = -BALL.vy
    }
}

function blockCollision() {
    for (let i = 0; i < blocks.length; i++) {
        for (let j = 0; j < blocks[i].length; j++) {
            const current = blocks[i][j]
            if (!current.active) continue

            const result = getCollisionDetection(current.x, current.y, BLOCK.w, BLOCK.h)
            if (!result) continue

            if (result & DIRECTION.LEFT || result & DIRECTION.RIGHT) {
                BALL.vx = -BALL.vx
            }

            if (result & DIRECTION.TOP || result & DIRECTION.BOTTOM) {
                BALL.vy = -BALL.vy
            }

            current.active = false
            if (!--BLOCK.total) {
                succeed()

                return 
            }
        }
    }
}

function failed() {
    gameover(() => {
        alert('game over')
        window.location.reload()
    })
}

function succeed() {
    gameover(() => {
        if (currentLevel === 'easy') {
            alert('you win! maybe you can try normal next.')
        } else if (currentLevel === 'normal') {
            alert('wow, you passed the normal, congratulation!')
        } else if (currentLevel === 'hard') {
            alert('unbelievable! you passed the hard! amazing!')
        }
    })
}

function gameover(fn) {
    requestAnimationFrame(() => {
        fn()
        cancelAnimationFrame(game)
    })
}

function getBlock(x, y) {
    const path = new Path2D()
    path.rect(x, y, BLOCK.w, BLOCK.h)
    return path
}

function getBall(x, y) {
    const path = new Path2D()
    path.arc(x, y, BALL.radius, 0, 2 * Math.PI)
    return path
}

function getGuard(x, y) {
    const path = new Path2D()
    path.rect(x, y, GUARD.w, GUARD.h)
    return path
}

// get the circle and the block's collision side
function getCollisionDetection(x2, y2, w, h) {
    let result = 0
    let x1 = BALL.x
    let y1 = BALL.y
    let radius = BALL.radius
    let maxDistance = Math.sqrt(radius * radius / 2)

    // 为了方便考虑角落的判定比较大
    // left
    if (
        BALL.vx > 0
        && x1 + radius > x2
        && x1 < x2
        && y1 > y2 - maxDistance
        && y1 < y2 + h + maxDistance
    ) {
        result |= DIRECTION.LEFT
    }

    // right
    else if (
        BALL.vx < 0
        && x1 > x2 + w
        && x1 < x2 + w + radius
        && y1 > y2 - maxDistance
        && y1 < y2 + h + maxDistance
    ) {
        result |= DIRECTION.RIGHT
    }

    // top 
    if (
        BALL.vy > 0
        && x1 > x2 - maxDistance
        && x1 < x2 + w + maxDistance
        && y1 + radius > y2
        && y1 < y2
    ) {
        result |= DIRECTION.TOP
    } 

    // bottom
    else if (
        BALL.vy < 0
        && x1 > x2 - maxDistance
        && x1 < x2 + w + maxDistance
        && y1 > y2 + h
        && y1 < y2 + h + radius
    ) {
        result |= DIRECTION.BOTTOM
    }

    return result
}


