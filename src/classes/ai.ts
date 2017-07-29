import {log} from "../sgl/sgl"
import {GameState} from "../states/game"


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
    private dx: number
    private dy: number
    private dist: number
    private tileSize: number

    sprite: Phaser.Sprite
    targetX: number
    targetY: number
    speed: number
    maxSpeed: number
    reactionDelay: number

    state: AIState
    type: AIType
    alert: number

    constructor(type: AIType, gameState: GameState) {
        this.gameState = gameState

        this.type = type
        this.speed = 0
        this.state = AIState.IDLE
        let spriteKey = ""

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
        this.calcDelta()
        this.gameState.game.physics.arcade.collide(this.sprite)

        if (this.state === AIState.CHASING) {
            this.targetX = this.player.position.x
            this.targetY = this.player.position.y
            if (this.nearTarget()) {
                this.setStroll()
            }
        } else if (this.state === AIState.STROLL) {
            if (this.nearTarget() || Math.random() < 0.001) {
                this.setStroll()
            }
        } else if (this.state === AIState.TALKING) {
            this.speed = 0
        }

        if (this.sprite.body.blocked.left ||
            this.sprite.body.blocked.right ||
            this.sprite.body.blocked.top ||
            this.sprite.body.blocked.down

        ) {
            console.log("BLOCKED")
            if (this.state === AIState.STROLL) {
                this.doStroll(0)
            }
        }


        this.follow()

    }

    calcDelta() {
        this.dx = this.targetX - this.sprite.position.x
        this.dy = this.targetY - this.sprite.position.y
        this.dist = Math.sqrt(this.dx * this.dx + this.dy * this.dy)
    }

    follow() {
        this.calcDelta()

        if (this.nearTarget()) {
            this.sprite.position.x = this.targetX
            this.sprite.position.y = this.targetY
            this.sprite.body.velocity.x = 0
            this.sprite.body.velocity.y = 0
        } else {
            this.sprite.body.velocity.x = this.dx / this.dist * this.speed
            this.sprite.body.velocity.y = this.dy / this.dist * this.speed
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
        setTimeout(() => {
            this.state = AIState.CHASING
            this.speed = this.maxSpeed
        }, delay * 1000)
    }

    private doStroll(delay: number) {
        setTimeout(() => {
            this.state = AIState.STROLL
            this.speed = (0.5 + 0.1 * Math.random()) * this.maxSpeed
            this.targetX += Math.round(Math.random() * 2 - 1) * this.tileSize
            this.targetY += Math.round(Math.random() * 2 - 1) * this.tileSize
        }, delay * 1000)
    }

    setIdle() {
        this.state = AIState.IDLE
        this.speed = 0
    }

    setStroll() {
        this.setIdle()
        this.doStroll(1)
    }

    setTalking() {
        this.state = AIState.TALKING
        this.speed = 0
    }

    setChasing() {
        this.doChase(this.reactionDelay)
    }

    setSitting() {
        this.state = AIState.SITTING
    }

    nearTarget(): boolean {
        return this.dist < this.speed * this.gameState.game.time.elapsedMS / 1000.
    }

    getTileId() {
        return 943 // TODO: Calculate with custom Tilesheet
    }

    sitDown(x: number, y: number) {
        let tile = this.gameState.getTileAt(x, y, "Tables")
        this.sprite.position.x = tile.worldX + tile.centerX
        this.sprite.position.y = tile.worldY + tile.centerY
        this.setSitting()
        log(`Replace tile id ${tile.index} with ${this.getTileId()} at ${tile.x}, ${tile.y}`)
        this.gameState.map.replace(tile.index, this.getTileId(), tile.x, tile.y, 1, 1, "Tables")
    }

}
