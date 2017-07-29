import {log, error} from "../sgl/sgl"
import {GameState} from "../states/game"
import {IncRand} from "./incrand"
import {AStar} from "./astar"
import {Pathfinder} from "./pathfinder"
import {isNullOrUndefined} from "util"


export enum AIState {
    IDLE,
    STROLL,
    TALKING,
    CHASING,
    SITTING,
}

export enum AIType {
    DUMMY,
    STANDING,
    GUARD,
    PROF,
    EATING,
    LEARNING,
    WORKING,
    SLEEPING,
}

export class AI {
    private gameState: GameState
    private player: any
    private tileSize: number
    private giveUp: IncRand
    private speedUp: IncRand
    private timeout: number

    private pathfinder: Pathfinder
    private plannedPoints: Phaser.Point[]
    private currentPoint: number
    private targetX: number
    private targetY: number

    sprite: Phaser.Sprite
    speed: number
    maxSpeed: number
    reactionDelay: number

    state: AIState
    type: AIType
    alert: number

    constructor(type: AIType, gameState: GameState) {
        this.gameState = gameState
        this.pathfinder = new Pathfinder(this, this.gameState)
        this.plannedPoints = []
        this.currentPoint = 0

        this.type = type
        this.speed = 0
        this.state = AIState.IDLE
        let spriteKey = ""
        this.giveUp = new IncRand(0.02, 5, 20)
        this.speedUp = new IncRand(0.2, 10, 20)

        this.tileSize = this.gameState.map.tileWidth

        switch (type) {
            case AIType.DUMMY:
                this.maxSpeed = 0
                this.reactionDelay = 0
                this.alert = 0
                spriteKey = "dummy"
                break
            case AIType.STANDING:
                this.maxSpeed = 1
                this.reactionDelay = 0.5
                this.state = AIState.STROLL
                this.alert = 20
                spriteKey = "standing"
                break
            case AIType.GUARD:
                this.maxSpeed = 2
                this.reactionDelay = 0.2
                this.state = AIState.STROLL
                this.alert = 90
                spriteKey = "guard"
                break
            case AIType.PROF:
                this.maxSpeed = 0.7
                this.reactionDelay = 1.2
                this.state = AIState.STROLL
                this.alert = 50
                spriteKey = "prof"
                break
            case AIType.EATING:
                this.maxSpeed = 1
                this.reactionDelay = 1
                this.alert = 30
                spriteKey = "eating"
                break
            case AIType.LEARNING:
                this.maxSpeed = 1
                this.reactionDelay = 0.5
                this.alert = 10
                spriteKey = "learning"
                break
            case AIType.WORKING:
                this.maxSpeed = 1
                this.reactionDelay = 1
                this.alert = 70
                spriteKey = "working"
                break
            case AIType.SLEEPING:
                this.maxSpeed = 0.5
                this.reactionDelay = 2
                this.alert = 10
                spriteKey = "sleeping"
                break
            default:
                throw new Error("Unknown AIType. Fix your shit!")
        }
        this.maxSpeed *= this.tileSize
        this.sprite = this.gameState.game.add.sprite(200, 200, spriteKey)
        this.sprite.anchor.set(0.5)
        this.gameState.game.physics.enable(this.sprite)
        this.sprite.body.collideWorldBounds = true
        this.player = this.gameState.ref("player", "player")
    }

    update() {
        this.gameState.game.physics.arcade.collide(this.sprite)
        this.gameState.game.physics.arcade.collide(this.sprite, this.gameState.layers["collision"])
        this.pathfinder.setCurrent(this.position)

        if (this.state === AIState.CHASING) {
            if (this.nearTarget()) {
                this.gameState.clubPlayer()
                this.setStroll()
                return
            }

            // Chance to give up chace
            if (this.giveUp.getRand()) {
                this.setStroll()
            }
            // Chance to sprint / slow down
            if (this.speedUp.getRand()) {
                this.speed += 0.1 * (Math.random() * 2 - 1)
            }
        } else if (this.state === AIState.STROLL) {
            if (this.sprite.body.blocked.left ||
                this.sprite.body.blocked.right ||
                this.sprite.body.blocked.top ||
                this.sprite.body.blocked.down

            ) {
                console.log("BLOCKED")
                this.doStroll(0)
                return
            }

            if (this.nearTarget() || Math.random() < 0.001) {
                this.setStroll()
                return
            }
        } else if (this.state === AIState.TALKING) {
            this.speed = 0
        }

        if (this.nearCurrentPoint()) {
            this.currentPoint += 1
        }
        this.move()
    }

    nearCurrentPoint(): boolean {
        if (this.currentPoint >= this.plannedPoints.length) {
            return false
        }

        const dx = this.plannedPoints[this.currentPoint].x - this.position.x
        const dy = this.plannedPoints[this.currentPoint].y - this.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        return dist < this.speed * this.gameState.game.time.elapsedMS / 1000.
    }

    move() {
        if (this.nearTarget()) {
            this.sprite.position.x = this.targetX
            this.sprite.position.y = this.targetY
            this.sprite.body.velocity.x = 0
            this.sprite.body.velocity.y = 0
        } else {
            if (this.plannedPoints && this.plannedPoints.length > 0 && this.currentPoint < this.plannedPoints.length) {
                const dx = this.plannedPoints[this.currentPoint].x - this.position.x
                const dy = this.plannedPoints[this.currentPoint].y - this.position.y
                const dist = Math.sqrt(dx * dx + dy * dy)

                this.sprite.body.velocity.x = dx / dist * this.speed
                this.sprite.body.velocity.y = dy / dist * this.speed

                // this.plannedPoints.forEach(value => {
                //     this.gameState.game.debug.rectangle(
                //         new Phaser.Rectangle(
                //             value.x,
                //             value.y,
                //             20,
                //             20),
                //         "#ff0000")
                // })
            } else {
                const dx = this.targetX - this.position.x
                const dy = this.targetY - this.position.y
                const dist = Math.sqrt(dx * dx + dy * dy)

                this.sprite.body.velocity.x = dx / dist * this.speed
                this.sprite.body.velocity.y = dy / dist * this.speed
            }
        }

    }

    pickPocket() {
        const rand = Math.random() * 100
        if (rand < this.alert) {
            this.setChasing()
        }
    }

    punch() {
        this.speed = 0
        this.doChase(3)
    }

    private doChase(delay: number) {
        this.async(() => {
            this.state = AIState.CHASING
            this.speed = this.maxSpeed
            this.giveUp.reset()
            this.speedUp.reset()
        }, delay * 1000)
    }

    private doStroll(delay: number) {
        this.async(() => {
            this.state = AIState.STROLL
            this.speed = (0.5 + 0.1 * Math.random()) * this.maxSpeed
            this.setTarget(
                this.targetX + Math.round(Math.random() * 4 - 2) * this.tileSize,
                this.targetY + Math.round(Math.random() * 4 - 2) * this.tileSize)
        }, delay * 1000)
    }

    setIdle() {
        this.clearTimeout()
        this.state = AIState.IDLE
        this.speed = 0
    }

    setStroll() {
        this.setIdle()
        this.doStroll(1)
    }

    setTalking() {
        this.clearTimeout()
        this.state = AIState.TALKING
        this.speed = 0
    }

    setChasing() {
        this.doChase(this.reactionDelay)
    }

    setSitting() {
        this.clearTimeout()
        this.state = AIState.SITTING
        this.speed = 0
    }

    nearTarget(): boolean {
        const dx = this.position.x - this.targetX
        const dy = this.position.y - this.targetY
        const dist = Math.sqrt(dx * dx + dy * dy)
        return dist < this.speed * this.gameState.game.time.elapsedMS / 1000.
    }

    getTileId() {
        return 943 // TODO: Calculate with custom Tilesheet
    }

    sitDown(x: number, y: number) {
        let tile = this.gameState.getTileAt(x, y, "Tables")
        if (isNullOrUndefined(tile)) {
            error("Can't sit down at ${x}, ${y} because it hast no tile to replace")
            return
        }
        this.position.x = tile.worldX + tile.centerX
        this.position.y = tile.worldY + tile.centerY
        this.setSitting()
        log(`Replace tile id ${tile.index} with ${this.getTileId()} at ${tile.x}, ${tile.y}`)
        this.gameState.map.replace(tile.index, this.getTileId(), tile.x, tile.y, 1, 1, "Tables")
    }

    clearTimeout() {
        if (this.timeout !== undefined) {
            clearTimeout(this.timeout)
        }
    }

    async(func: Function, delta: number) {
        this.clearTimeout()
        this.timeout = setTimeout(
            () => {
                this.timeout = undefined
                func()
            }, delta
        )
    }

    get position(): Phaser.Point {
        return this.sprite.position
    }

    setTarget(x: number, y: number) {
        const dx = this.position.x - x
        const dy = this.position.y - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        // console.log("++++", dx, dy, norm, this.tileSize)

        this.targetX = x
        this.targetY = y
        if (dist < this.tileSize) {
            this.plannedPoints = [new Phaser.Point(x, y)]
            this.currentPoint = 0
        } else {
            this.pathfinder.setTarget(new Phaser.Point(x, y))
        }
    }

    onPlayerMove(pos: Phaser.Point) {
        if (this.state === AIState.CHASING) {
            this.pathfinder.setTarget(pos)
        }
    }

    newTargets(pos: Phaser.Point[]) {
        this.plannedPoints = pos
        this.currentPoint = 0
    }
}
